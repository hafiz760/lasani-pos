'use client'

import { useEffect, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { exportToPDF } from '@renderer/lib/export'
import { Users } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@renderer/components/ui/table'
import { ReportPage, SummaryCardProps } from '@renderer/components/shared/ReportPage'

interface CustomerReportRow {
    id: string
    name: string
    phone: string
    totalAmount: number
    paidAmount: number
    pendingAmount: number
    salesCount: number
}

export default function CustomerReportPage() {
    const [currentStore, setCurrentStore] = useState<any>(null)
    const [reportRows, setReportRows] = useState<CustomerReportRow[]>([])
    const [summaryCards, setSummaryCards] = useState<SummaryCardProps[]>([])
    const [isReportLoading, setIsReportLoading] = useState(false)

    useEffect(() => {
        const storeData = localStorage.getItem('selectedStore')
        if (storeData) {
            setCurrentStore(JSON.parse(storeData))
        }
    }, [])

    const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString()}`

    const generateReport = async (range: DateRange) => {
        const storeData = localStorage.getItem('selectedStore')
        const store = storeData ? JSON.parse(storeData) : currentStore
        if (!store?._id || !range.from) return

        setIsReportLoading(true)
        try {
            const result = await window.api.sales.getReport({
                storeId: store._id,
                startDate: range.from.toISOString(),
                endDate: (range.to || range.from).toISOString(),
                groupBy: 'day'
            })

            if (!result.success) {
                toast.error(result.error || 'Failed to generate report')
                return
            }

            const sales = (result.data?.sales || []) as any[]
            const totalsByCustomer = new Map<string, CustomerReportRow>()

            sales.forEach((sale) => {
                const customer = sale.customer as any
                const customerId = customer?._id || sale.customer
                if (!customerId) return

                const key = String(customerId)
                const totalAmount = Number(sale.totalAmount || 0)
                const paidAmount = Number(sale.paidAmount || 0)
                const pendingAmount = Math.max(0, totalAmount - paidAmount)

                const entry = totalsByCustomer.get(key)
                if (entry) {
                    entry.totalAmount += totalAmount
                    entry.paidAmount += paidAmount
                    entry.pendingAmount += pendingAmount
                    entry.salesCount += 1
                    return
                }

                totalsByCustomer.set(key, {
                    id: key,
                    name: customer?.name || 'Customer',
                    phone: customer?.phone || '',
                    totalAmount,
                    paidAmount,
                    pendingAmount,
                    salesCount: 1
                })
            })

            const rows = Array.from(totalsByCustomer.values()).sort(
                (a, b) => b.pendingAmount - a.pendingAmount
            )

            const totals = rows.reduce(
                (acc, row) => {
                    acc.totalAmount += row.totalAmount
                    acc.totalPaid += row.paidAmount
                    acc.totalPending += row.pendingAmount
                    return acc
                },
                { totalAmount: 0, totalPaid: 0, totalPending: 0 }
            )

            setReportRows(rows)
            setSummaryCards([
                {
                    label: 'Total Billing',
                    value: formatCurrency(totals.totalAmount),
                    description: 'Cumulative credit sales'
                },
                {
                    label: 'Total Collected',
                    value: formatCurrency(totals.totalPaid),
                    colorClassName: 'text-emerald-600',
                    description: 'Payments received'
                },
                {
                    label: 'Pending Balance',
                    value: formatCurrency(totals.totalPending),
                    colorClassName: 'text-red-500',
                    description: 'Outstanding payments'
                },
                {
                    label: 'Customers',
                    value: rows.length,
                    description: 'Active buyers in range'
                }
            ])
        } catch (error: any) {
            toast.error(error?.message || 'Failed to generate report')
        } finally {
            setIsReportLoading(false)
        }
    }

    const handleDownloadReport = () => {
        if (!reportRows.length) {
            toast.error('No report data to download')
            return
        }

        const exportData = reportRows.map((row) => ({
            Customer: row.name,
            Phone: row.phone || '-',
            'Total Amount': formatCurrency(row.totalAmount),
            'Paid Amount': formatCurrency(row.paidAmount),
            'Pending Amount': formatCurrency(row.pendingAmount),
            'Sales Count': row.salesCount
        }))

        exportToPDF(
            exportData,
            `customer_report_${format(new Date(), 'yyyyMMdd')}`,
            `Customer Report`
        )
    }

    return (
        <ReportPage
            title="Customer Report"
            description="Track customer totals and pending balances by date range."
            icon={Users}
            onGenerate={generateReport}
            onDownloadPdf={handleDownloadReport}
            isLoading={isReportLoading}
            summaryCards={summaryCards}
        >
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="font-bold">Customer</TableHead>
                        <TableHead className="text-center font-bold">Sales Count</TableHead>
                        <TableHead className="text-right font-bold">Total Amount</TableHead>
                        <TableHead className="text-right font-bold">Paid Amount</TableHead>
                        <TableHead className="text-right font-bold">Pending Balance</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isReportLoading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                Loading customers...
                            </TableCell>
                        </TableRow>
                    ) : reportRows.length > 0 ? (
                        reportRows.map((row) => (
                            <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-foreground">{row.name}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                            {row.phone || 'No phone'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center font-mono font-bold">{row.salesCount}</TableCell>
                                <TableCell className="text-right font-mono font-bold">
                                    {formatCurrency(row.totalAmount)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-emerald-600">
                                    {formatCurrency(row.paidAmount)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-red-500">
                                    {formatCurrency(row.pendingAmount)}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                No sales found for the selected range.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ReportPage>
    )
}
