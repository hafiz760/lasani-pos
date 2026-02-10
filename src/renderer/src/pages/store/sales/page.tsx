import { useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek
} from 'date-fns'
import { ArrowLeft, CalendarIcon, FileText, Printer, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Calendar } from '@renderer/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { printContent } from '@renderer/lib/print-utils'
import { useNavigate } from 'react-router-dom'

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
  customerName?: string
  customer?: string
}

interface SalesReportData {
  summary: ReportSummary
  grouped: ReportGroup[]
  sales: SaleItem[]
}

const quickRanges = [
  {
    label: 'Today',
    getRange: () => {
      const today = new Date()
      return { from: startOfDay(today), to: endOfDay(today) }
    }
  },
  {
    label: 'This Week',
    getRange: () => {
      const today = new Date()
      return {
        from: startOfWeek(today, { weekStartsOn: 1 }),
        to: endOfWeek(today, { weekStartsOn: 1 })
      }
    }
  },
  {
    label: 'This Month',
    getRange: () => {
      const today = new Date()
      return { from: startOfMonth(today), to: endOfMonth(today) }
    }
  }
]

export default function SalesPage() {
  const navigate = useNavigate()
  const [range, setRange] = useState<DateRange | undefined>()
  const [reportRange, setReportRange] = useState<DateRange | undefined>()
  const [groupBy] = useState<GroupBy>('day')
  const [report, setReport] = useState<SalesReportData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const initialRange = quickRanges[2].getRange()
    setRange(initialRange)
    void generateReport(initialRange, 'day')
  }, [])

  const rangeLabel = useMemo(() => {
    if (!reportRange?.from) return 'Select dates'
    const fromLabel = format(reportRange.from, 'MMM dd, yyyy')
    if (!reportRange.to || reportRange.from.getTime() === reportRange.to.getTime()) {
      return fromLabel
    }
    return `${fromLabel} - ${format(reportRange.to, 'MMM dd, yyyy')}`
  }, [reportRange])

  const normalizeRange = (value?: DateRange) => {
    if (!value?.from) return null
    return { from: startOfDay(value.from), to: endOfDay(value.to ?? value.from) }
  }

  const generateReport = async (nextRange?: DateRange, nextGroupBy?: GroupBy) => {
    const selectedStoreStr = localStorage.getItem('selectedStore')
    if (!selectedStoreStr) {
      toast.error('Please select a store to generate a report.')
      return
    }

    const store = JSON.parse(selectedStoreStr)
    const normalized = normalizeRange(nextRange ?? range)
    if (!normalized) {
      toast.error('Please select a date range.')
      return
    }

    setIsLoading(true)
    try {
      const result = await window.api.sales.getReport({
        storeId: store._id || store.id,
        startDate: normalized.from.toISOString(),
        endDate: normalized.to.toISOString(),
        groupBy: nextGroupBy ?? groupBy
      })

      if (result.success) {
        setReport(result.data)
        setReportRange(normalized)
      } else {
        toast.error(result.error || 'Failed to load sales report')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load sales report')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString()}`

  const statusBadge = (status: SaleItem['paymentStatus']) => {
    if (status === 'PAID') return 'bg-emerald-500/10 text-emerald-600'
    if (status === 'PARTIAL') return 'bg-amber-500/10 text-amber-600'
    return 'bg-red-500/10 text-red-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-11 w-11 rounded-xl border-border"
            onClick={() => navigate('/dashboard/reports/sales')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-11 w-11 rounded-xl bg-[#4ade80]/10 text-[#4ade80] flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Sales Report</h1>
            <p className="text-sm text-muted-foreground">
              Generate daily, weekly, monthly, or custom reports for your store.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 justify-start border-border text-left font-semibold"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {range?.from
                    ? range.to
                      ? `${format(range.from, 'MMM dd, yyyy')} - ${format(
                          range.to,
                          'MMM dd, yyyy'
                        )}`
                      : format(range.from, 'MMM dd, yyyy')
                    : 'Select dates'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={range}
                  onSelect={setRange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2">
              <Button
                className="h-11 bg-[#4ade80] text-black hover:bg-[#22c55e] font-black flex-1"
                onClick={() => void generateReport()}
                disabled={isLoading}
              >
                {isLoading ? 'Generating...' : 'Generate Report'}
              </Button>
              <Button
                variant="outline"
                className="h-11 border-border"
                onClick={() => {
                  if (!report) {
                    toast.error('Generate a report before printing.')
                    return
                  }
                  const storeStr = localStorage.getItem('selectedStore')
                  const store = storeStr ? JSON.parse(storeStr) : null
                  const content = `
                    <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #111;">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
                        <div>
                          <h2 style="margin: 0; font-size: 20px;">Sales Report</h2>
                          <p style="margin: 4px 0 0; color: #6b7280; font-size: 12px;">Range: ${rangeLabel}</p>
                        </div>
                        <div style="text-align: right; font-size: 12px; color: #6b7280;">
                          <div>Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}</div>
                          <div>Group: ${groupBy.toUpperCase()}</div>
                        </div>
                      </div>

                      <div style="margin-top: 12px; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #6b7280;">Store Details</div>
                        <div style="font-size: 14px; font-weight: 600; margin-top: 4px;">
                          ${store?.name || 'Store'}
                        </div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                          ${store?.address || 'Address not available'}
                        </div>
                        <div style="font-size: 12px; color: #6b7280;">
                          ${store?.phone ? `Tel: ${store.phone}` : 'Phone not available'}
                        </div>
                      </div>

                      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0;">
                        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
                          <div style="font-size: 11px; text-transform: uppercase; color: #6b7280;">Total Sales</div>
                          <div style="font-size: 16px; font-weight: 700;">${formatCurrency(
                            report.summary.totalSales
                          )}</div>
                        </div>
                        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
                          <div style="font-size: 11px; text-transform: uppercase; color: #6b7280;">Paid Sales</div>
                          <div style="font-size: 16px; font-weight: 700;">${formatCurrency(
                            report.summary.totalPaid
                          )}</div>
                        </div>
                        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
                          <div style="font-size: 11px; text-transform: uppercase; color: #6b7280;">Pending Balance</div>
                          <div style="font-size: 16px; font-weight: 700;">${formatCurrency(
                            report.summary.totalPending
                          )}</div>
                        </div>
                        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
                          <div style="font-size: 11px; text-transform: uppercase; color: #6b7280;">Profit</div>
                          <div style="font-size: 16px; font-weight: 700;">${formatCurrency(
                            report.summary.totalProfit
                          )}</div>
                        </div>
                      </div>

                      <div style="margin-top: 20px;">
                        <h3 style="margin: 0 0 8px; font-size: 14px;">Sales Summary</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                          <thead>
                            <tr style="background: #f3f4f6; text-align: left;">
                              <th style="padding: 8px;">Invoice</th>
                              <th style="padding: 8px;">Date</th>
                              <th style="padding: 8px;">Payment</th>
                              <th style="padding: 8px;">Status</th>
                              <th style="padding: 8px; text-align: right;">Total</th>
                              <th style="padding: 8px; text-align: right;">Paid</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${report.sales
                              .map(
                                (sale) => `
                                  <tr style="border-bottom: 1px solid #e5e7eb;">
                                    <td style="padding: 8px;">${sale.invoiceNumber}</td>
                                    <td style="padding: 8px;">${format(
                                      new Date(sale.saleDate),
                                      'MMM dd, yyyy'
                                    )}</td>
                                    <td style="padding: 8px;">${sale.paymentMethod}${
                                      sale.paymentChannel ? ` (${sale.paymentChannel})` : ''
                                    }</td>
                                    <td style="padding: 8px;">${sale.paymentStatus}</td>
                                    <td style="padding: 8px; text-align: right;">${formatCurrency(
                                      sale.totalAmount
                                    )}</td>
                                    <td style="padding: 8px; text-align: right;">${formatCurrency(
                                      sale.paidAmount
                                    )}</td>
                                  </tr>
                                `
                              )
                              .join('')}
                          </tbody>
                        </table>
                      </div>

                      <div style="margin-top: 20px;">
                        <h3 style="margin: 0 0 8px; font-size: 14px;">${
                          groupBy === 'day'
                            ? 'Daily Breakdown'
                            : groupBy === 'week'
                              ? 'Weekly Breakdown'
                              : 'Monthly Breakdown'
                        }</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                          <thead>
                            <tr style="background: #f3f4f6; text-align: left;">
                              <th style="padding: 8px;">Period</th>
                              <th style="padding: 8px; text-align: right;">Orders</th>
                              <th style="padding: 8px; text-align: right;">Sales</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${report.grouped
                              .map(
                                (group) => `
                                  <tr style="border-bottom: 1px solid #e5e7eb;">
                                    <td style="padding: 8px;">${group._id}</td>
                                    <td style="padding: 8px; text-align: right;">${group.count}</td>
                                    <td style="padding: 8px; text-align: right;">${formatCurrency(
                                      group.totalAmount
                                    )}</td>
                                  </tr>
                                `
                              )
                              .join('')}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  `

                  void printContent({ title: 'Sales Report', content })
                }}
              >
                <Printer className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-11 border-border"
                onClick={() => void generateReport()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-5 space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Total Sales</p>
            <p className="text-2xl font-black text-foreground">
              {formatCurrency(report?.summary.totalSales || 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              {report?.summary.totalCount || 0} invoices • Range: {rangeLabel}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Paid Sales</p>
            <p className="text-2xl font-black text-emerald-600">
              {formatCurrency(report?.summary.totalPaid || 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              {report?.summary.paidCount || 0} fully paid invoices
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Pending Balance</p>
            <p className="text-2xl font-black text-amber-600">
              {formatCurrency(report?.summary.totalPending || 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              {report?.summary.pendingCount || 0} pending • {report?.summary.partialCount || 0}{' '}
              partial
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Profit</p>
            <p className="text-2xl font-black text-[#4ade80]">
              {formatCurrency(report?.summary.totalProfit || 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Tax: {formatCurrency(report?.summary.totalTax || 0)} • Discount:{' '}
              {formatCurrency(report?.summary.totalDiscount || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="border-border xl:col-span-2">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              Sales Summary ({report?.sales.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[420px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report?.sales.length ? (
                    report.sales.map((sale) => (
                      <TableRow key={sale._id}>
                        <TableCell className="font-semibold">{sale.invoiceNumber}</TableCell>
                        <TableCell>{format(new Date(sale.saleDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="space-y-1">
                          <div className="text-sm font-semibold">{sale.paymentMethod}</div>
                          {sale.paymentChannel && (
                            <div className="text-xs text-muted-foreground uppercase">
                              {sale.paymentChannel}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusBadge(sale.paymentStatus)} border-0`}>
                            {sale.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(sale.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(sale.paidAmount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        No sales found for the selected range.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              {groupBy === 'day'
                ? 'Daily Breakdown'
                : groupBy === 'week'
                  ? 'Weekly Breakdown'
                  : 'Monthly Breakdown'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[420px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report?.grouped.length ? (
                    report.grouped.map((group) => (
                      <TableRow key={group._id}>
                        <TableCell className="font-semibold">{group._id}</TableCell>
                        <TableCell className="text-right font-mono">{group.count}</TableCell>
                        <TableCell className="text-right font-mono">
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
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
