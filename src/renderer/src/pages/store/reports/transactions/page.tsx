'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { toast } from 'sonner'
import { Badge } from '@renderer/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@renderer/components/ui/table'
import { ReportPage, SummaryCardProps } from '@renderer/components/shared/ReportPage'
import { Receipt } from 'lucide-react'
import { exportToPDF } from '@renderer/lib/export'

interface TransactionRow {
    id: string
    transactionDate: Date
    description: string
    account: string
    entryType: string
    amount: number
    referenceType: string
}

export default function TransactionsReportPage() {
    const [reportRows, setReportRows] = useState<TransactionRow[]>([])
    const [summaryCards, setSummaryCards] = useState<SummaryCardProps[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString()}`

    const generateReport = async (range: DateRange) => {
        if (!range.from) return

        setIsLoading(true)
        try {
            const selectedStoreStr = localStorage.getItem('selectedStore')
            if (!selectedStoreStr) return
            const store = JSON.parse(selectedStoreStr)

            const result = await window.api.transactions.getAll({
                storeId: store._id || store.id,
                page: 1,
                pageSize: 5000,
                search: '',
                startDate: range.from.toISOString(),
                endDate: (range.to || range.from).toISOString()
            })

            if (result.success) {
                const rawData = result.data || []
                const rows: TransactionRow[] = rawData.map((item: any) => ({
                    id: item._id,
                    transactionDate: new Date(item.transactionDate),
                    description: item.description,
                    account: item.entries?.[0]?.account?.accountName || '—',
                    entryType: item.entries?.[0]?.entryType || '—',
                    amount: Number(item.totalAmount || 0),
                    referenceType: item.referenceType || 'N/A'
                }))

                setReportRows(rows)

                // Calculate Totals
                const totals = rows.reduce(
                    (acc, row) => {
                        const type = row.referenceType.toUpperCase()
                        if (type === 'SALE') acc.totalSales += row.amount
                        else if (type === 'EXPENSE') acc.totalExpenses += row.amount
                        else if (type === 'REFUND') acc.totalRefunds += row.amount
                        else if (type === 'PURCHASE') acc.totalPurchases += row.amount

                        // Generic net calculation based on entry types if needed, 
                        // but here we follow the requested Profit = Sales - Expenses - Refunds - Purchases
                        return acc
                    },
                    { totalSales: 0, totalExpenses: 0, totalRefunds: 0, totalPurchases: 0 }
                )

                const netProfit = totals.totalSales - (totals.totalExpenses + totals.totalRefunds + totals.totalPurchases)

                setSummaryCards([
                    {
                        label: 'Total Sales',
                        value: formatCurrency(totals.totalSales),
                        colorClassName: 'text-emerald-600',
                        description: 'Revenue from sales'
                    },
                    {
                        label: 'Expenses & Purchases',
                        value: formatCurrency(totals.totalExpenses + totals.totalPurchases),
                        colorClassName: 'text-red-500',
                        description: 'Operational & inventory costs'
                    },
                    {
                        label: 'Refunds',
                        value: formatCurrency(totals.totalRefunds),
                        colorClassName: 'text-amber-600',
                        description: 'Money returned to customers'
                    },
                    {
                        label: 'Net Profit',
                        value: formatCurrency(netProfit),
                        colorClassName: netProfit >= 0 ? 'text-[#16a34a]' : 'text-red-600',
                        description: 'Sales - Costs - Refunds'
                    }
                ])
            } else {
                toast.error(result.error || 'Failed to generate transactions report')
            }
        } catch (error: any) {
            toast.error('Error: ' + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDownloadPdf = () => {
        if (!reportRows.length) {
            toast.error('No report data to download')
            return
        }

        const exportData = reportRows.map((row) => ({
            Date: format(row.transactionDate, 'MMM dd, yyyy HH:mm'),
            Description: row.description,
            Account: row.account,
            Type: row.entryType,
            Amount: formatCurrency(row.amount),
            Reference: row.referenceType
        }))

        const profitCard = summaryCards.find(c => c.label === 'Net Profit')
        const expenseCard = summaryCards.find(c => c.label === 'Expenses & Purchases')

        exportData.push({
            Date: 'TOTAL',
            Description: 'SUMMARY',
            Account: '',
            Type: '',
            Amount: `${profitCard?.value || '—'} Profit`,
            Reference: `Costs: ${expenseCard?.value || '—'}`
        })

        exportToPDF(
            exportData,
            `transactions_report_${format(new Date(), 'yyyyMMdd')}`,
            `Transactions Report`
        )
    }

    return (
        <ReportPage
            title="Transactions Report"
            description="Complete overview of all financial movements across all accounts."
            icon={Receipt}
            onGenerate={generateReport}
            onDownloadPdf={handleDownloadPdf}
            isLoading={isLoading}
            summaryCards={summaryCards}
        >
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="font-bold">Date</TableHead>
                        <TableHead className="font-bold">Description</TableHead>
                        <TableHead className="font-bold">Account</TableHead>
                        <TableHead className="font-bold">Type</TableHead>
                        <TableHead className="text-right font-bold">Amount</TableHead>
                        <TableHead className="font-bold">Reference</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                Calculating report data...
                            </TableCell>
                        </TableRow>
                    ) : reportRows.length > 0 ? (
                        reportRows.map((row) => (
                            <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="whitespace-nowrap">
                                    {format(row.transactionDate, 'MMM dd, yyyy HH:mm')}
                                </TableCell>
                                <TableCell className="font-medium">{row.description}</TableCell>
                                <TableCell className="text-muted-foreground">{row.account}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold border-border">
                                        {row.entryType}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className={`font-bold ${row.entryType === 'DEBIT' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {row.entryType === 'DEBIT' ? '' : '-'}{formatCurrency(row.amount)}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="text-[10px] uppercase font-black bg-muted/50 text-muted-foreground">
                                        {row.referenceType}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                No transactions found for the selected range.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ReportPage>
    )
}
