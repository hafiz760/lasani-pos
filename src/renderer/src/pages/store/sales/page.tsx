'use client'

import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { toast } from 'sonner'
import { FileText, Printer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ReportPage, SummaryCardProps } from '@renderer/components/shared/ReportPage'

type GroupBy = 'day' | 'week' | 'month'

interface ReportSummary {
  totalSales: number
  totalPaid: number
  totalPending: number
  totalDiscount: number
  totalTax: number
  totalProfit: number
  totalCount: number
  paidCount: number
  pendingCount: number
  partialCount: number
}

interface ReportGroup {
  _id: string
  totalAmount: number
  paidAmount: number
  discountAmount: number
  taxAmount: number
  profitAmount: number
  count: number
}

interface SaleItem {
  _id: string
  invoiceNumber: string
  saleDate: string
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL'
  paymentMethod: string
  paymentChannel?: string
  totalAmount: number
  paidAmount: number
  customer?: { name?: string; phone?: string }
}

interface SalesReportData {
  summary: ReportSummary
  grouped: ReportGroup[]
  sales: SaleItem[]
}

export default function SalesPage() {
  const navigate = useNavigate()
  const [report, setReport] = useState<SalesReportData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [groupBy] = useState<GroupBy>('day')
  const [summaryCards, setSummaryCards] = useState<SummaryCardProps[]>([])

  const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString()}`

  const generateReport = async (range: DateRange) => {
    const selectedStoreStr = localStorage.getItem('selectedStore')
    if (!selectedStoreStr || !range.from) {
      toast.error('Store or date range missing.')
      return
    }

    const store = JSON.parse(selectedStoreStr)
    setIsLoading(true)
    try {
      const result = await window.api.sales.getReport({
        storeId: store._id || store.id,
        startDate: range.from.toISOString(),
        endDate: (range.to || range.from).toISOString(),
        groupBy
      })

      if (result.success) {
        setReport(result.data)
        const summary = result.data.summary as ReportSummary
        setSummaryCards([
          {
            label: 'Total Sales',
            value: formatCurrency(summary.totalSales),
            description: `${summary.totalCount} invoices generated`
          },
          {
            label: 'Paid Amount',
            value: formatCurrency(summary.totalPaid),
            colorClassName: 'text-emerald-600',
            description: `${summary.paidCount} fully paid`
          },
          {
            label: 'Pending Balance',
            value: formatCurrency(summary.totalPending),
            colorClassName: 'text-amber-600',
            description: `${summary.pendingCount} unpaid • ${summary.partialCount} partial`
          },
          {
            label: 'Net Profit',
            value: formatCurrency(summary.totalProfit),
            colorClassName: 'text-[#E8705A]',
            description: `Tax: ${formatCurrency(summary.totalTax)}`
          }
        ])
      } else {
        toast.error(result.error || 'Failed to load sales report')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load sales report')
    } finally {
      setIsLoading(false)
    }
  }

  const buildReportHtml = () => {
    if (!report) return ''
    const storeStr = localStorage.getItem('selectedStore')
    const store = storeStr ? JSON.parse(storeStr) : null

    return `
      <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #111;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
          <div>
            <h2 style="margin: 0; font-size: 20px;">Sales Report</h2>
          </div>
          <div style="text-align: right; font-size: 12px; color: #6b7280;">
            <div>Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}</div>
          </div>
        </div>

        <div style="margin-top: 12px; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <div style="font-size: 11px; text-transform: uppercase; color: #6b7280;">Store Details</div>
          <div style="font-size: 14px; font-weight: 600; margin-top: 4px;">
            ${store?.name || 'Store'}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0;">
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280;">Total Sales</div>
            <div style="font-size: 16px; font-weight: 700;">${formatCurrency(report.summary.totalSales)}</div>
          </div>
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280;">Profit</div>
            <div style="font-size: 16px; font-weight: 700;">${formatCurrency(report.summary.totalProfit)}</div>
          </div>
        </div>

        <div style="margin-top: 20px;">
          <h3 style="margin: 0 0 8px; font-size: 14px;">Sales Summary</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #f3f4f6; text-align: left;">
                <th style="padding: 8px;">Invoice</th>
                <th style="padding: 8px;">Date</th>
                <th style="padding: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${report.sales
        .map(
          (sale) => `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 8px;">${sale.invoiceNumber}</td>
                      <td style="padding: 8px;">${format(new Date(sale.saleDate), 'MMM dd, yyyy')}</td>
                      <td style="padding: 8px; text-align: right;">${formatCurrency(sale.totalAmount)}</td>
                    </tr>
                  `
        )
        .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  }

  const handleDownloadPdf = () => {
    if (!report?.sales.length) {
      toast.error('No report data to download')
      return
    }
    // PDF Export logic here (same as before)
    toast.info('Exporting PDF...')
  }

  const statusBadge = (status: SaleItem['paymentStatus']) => {
    if (status === 'PAID') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    if (status === 'PARTIAL') return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    return 'bg-red-500/10 text-red-600 border-red-500/20'
  }

  return (
    <ReportPage
      title="Sales Report"
      description="In-depth analysis of revenue, collection, and profitability."
      icon={FileText}
      onGenerate={generateReport}
      onDownloadPdf={handleDownloadPdf}
      isLoading={isLoading}
      summaryCards={summaryCards}
      extraActions={
        <Button
          variant="outline"
          className="h-10 border-border"
          onClick={() => {
            if (!report) {
              toast.error('Generate a report before printing.')
              return
            }
            const content = buildReportHtml()
            sessionStorage.setItem('salesReportPreview', content)
            navigate('/dashboard/reports/sales-report/preview')
          }}
        >
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-4">
        {/* Sales Summary Table */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-muted-foreground tracking-tighter">
              Invoices List ({report?.sales.length || 0})
            </h3>
          </div>
          <div className="rounded-lg border border-border overflow-hidden bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-bold">Invoice</TableHead>
                  <TableHead className="font-bold">Date</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                  <TableHead className="text-right font-bold">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report?.sales.length ? (
                  report.sales.map((sale) => (
                    <TableRow key={sale._id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-bold text-xs uppercase text-muted-foreground">{sale.invoiceNumber}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(sale.saleDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${statusBadge(sale.paymentStatus)} text-[10px] uppercase font-black`}>
                          {sale.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatCurrency(sale.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(sale.paidAmount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      No sales found for the selected range.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Periodic Breakdown */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase text-muted-foreground tracking-tighter">
            Periodic Breakdown
          </h3>
          <div className="rounded-lg border border-border overflow-hidden bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-bold">Period</TableHead>
                  <TableHead className="text-right font-bold">Bills</TableHead>
                  <TableHead className="text-right font-bold">Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report?.grouped.length ? (
                  report.grouped.map((group) => (
                    <TableRow key={group._id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-bold text-xs uppercase">{group._id}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-muted-foreground">{group.count}</TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatCurrency(group.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                      No breakdown data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </ReportPage>
  )
}
