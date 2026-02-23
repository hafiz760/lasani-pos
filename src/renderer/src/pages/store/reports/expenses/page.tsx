'use client'

import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { Badge } from '@renderer/components/ui/badge'
import { toast } from 'sonner'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@renderer/components/ui/table'
import { exportToPDF } from '@renderer/lib/export'
import { Wallet } from 'lucide-react'
import { ReportPage, SummaryCardProps } from '@renderer/components/shared/ReportPage'

interface ExpenseReportRow {
    id: string
    expenseDate: string
    category: string
    description: string
    account: string
    transactionType: string
    amount: number
}

export default function ExpenseReportPage() {
    const [reportRows, setReportRows] = useState<ExpenseReportRow[]>([])
    const [summaryCards, setSummaryCards] = useState<SummaryCardProps[]>([])
    const [isReportLoading, setIsReportLoading] = useState(false)

    const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString()}`

    const generateReport = async (range: DateRange) => {
        const selectedStoreStr = localStorage.getItem('selectedStore')
        if (!selectedStoreStr || !range.from) return

        const store = JSON.parse(selectedStoreStr)
        const storeId = store._id || store.id

        setIsReportLoading(true)
        try {
            const result = await window.api.expenses.getAll({
                storeId,
                page: 1,
                pageSize: 5000,
                search: ''
            })

            if (!result.success) {
                toast.error(result.error || 'Failed to load expense report')
                return
            }

            const start = range.from
            const end = range.to || range.from

            const rows = (result.data || [])
                .filter((expense) => {
                    const expenseDate = expense.expenseDate ? new Date(expense.expenseDate) : new Date()
                    return expenseDate >= start && expenseDate <= end
                })
                .map((expense) => ({
                    id: expense._id,
                    expenseDate: expense.expenseDate,
                    category: expense.category,
                    description: expense.description,
                    account: expense.account?.accountName || 'N/A',
                    transactionType: expense.transactionType || 'CREDIT',
                    amount: Number(expense.amount || 0)
                }))
                .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())

            const totals = rows.reduce(
                (acc, row) => {
                    if (row.transactionType === 'DEBIT') {
                        acc.totalDebit += row.amount
                    } else {
                        acc.totalCredit += row.amount
                    }
                    acc.netExpense = acc.totalCredit - acc.totalDebit
                    return acc
                },
                { totalCredit: 0, totalDebit: 0, netExpense: 0 }
            )

            setReportRows(rows)
            setSummaryCards([
                {
                    label: 'Total Spent',
                    value: formatCurrency(totals.totalCredit),
                    colorClassName: 'text-red-500',
                    description: 'Direct business expenses'
                },
                {
                    label: 'Refunds',
                    value: formatCurrency(totals.totalDebit),
                    colorClassName: 'text-emerald-600',
                    description: 'Money returned to store'
                },
                {
                    label: 'Net Expense',
                    value: formatCurrency(totals.netExpense),
                    description: 'Total Spent - Refunds'
                },
                {
                    label: 'Transactions',
                    value: rows.length,
                    description: 'Count of expense entries'
                }
            ])
        } catch (error: any) {
            toast.error(error?.message || 'Failed to load expense report')
        } finally {
            setIsReportLoading(false)
        }
    }

    const handleDownloadPdf = () => {
        if (!reportRows.length) {
            toast.error('No report data to download')
            return
        }

        const exportData = reportRows.map((row) => ({
            Date: format(new Date(row.expenseDate), 'MMM dd, yyyy'),
            Category: row.category,
            Description: row.description,
            Account: row.account,
            Type: row.transactionType,
            Amount: formatCurrency(row.amount)
        }))

        const netCard = summaryCards.find(c => c.label === 'Net Expense')

        exportToPDF(
            exportData,
            `expense_report_${format(new Date(), 'yyyyMMdd')}`,
            `Expense Report (Net: ${netCard?.value || '—'})`
        )
    }

    return (
        <ReportPage
            title="Expense Report"
            description="Review and analyze business spending by category and date."
            icon={Wallet}
            onGenerate={generateReport}
            onDownloadPdf={handleDownloadPdf}
            isLoading={isReportLoading}
            summaryCards={summaryCards}
        >
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="font-bold">Date</TableHead>
                        <TableHead className="font-bold">Category</TableHead>
                        <TableHead className="font-bold">Description</TableHead>
                        <TableHead className="font-bold">Account</TableHead>
                        <TableHead className="font-bold">Type</TableHead>
                        <TableHead className="text-right font-bold">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isReportLoading ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                Loading expenses...
                            </TableCell>
                        </TableRow>
                    ) : reportRows.length > 0 ? (
                        reportRows.map((row) => (
                            <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="whitespace-nowrap italic text-muted-foreground text-xs">
                                    {format(new Date(row.expenseDate), 'MMM dd, yyyy')}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className="border-border text-muted-foreground uppercase text-[10px] font-bold"
                                    >
                                        {row.category}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium text-foreground">
                                    {row.description}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{row.account}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className="border-border text-muted-foreground uppercase text-[10px] font-black"
                                    >
                                        {row.transactionType}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold">
                                    <span
                                        className={
                                            row.transactionType === 'DEBIT' ? 'text-emerald-600' : 'text-red-500'
                                        }
                                    >
                                        {row.transactionType === 'DEBIT' ? '' : '-'}{formatCurrency(row.amount)}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                No expenses found for the selected range.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ReportPage>
    )
}
