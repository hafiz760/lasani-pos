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
import { CalendarIcon, FileText, RefreshCw } from 'lucide-react'
import { DataPage } from '@renderer/components/shared/data-page'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Calendar } from '@renderer/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Label } from '@renderer/components/ui/label'
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
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export default function TransactionsPage() {
  const navigate = useNavigate()
  const [range, setRange] = useState<DateRange | undefined>()
  const [reportRange, setReportRange] = useState<DateRange | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [transactions, setTransactions] = useState<any[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportRows, setReportRows] = useState<any[]>([])
  const [reportTotals, setReportTotals] = useState({
    totalCredit: 0,
    totalDebit: 0,
    netChange: 0
  })
  const [isReportLoading, setIsReportLoading] = useState(false)

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

  const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString()}`

  const loadTransactions = async (activeRange?: DateRange) => {
    if (!activeRange?.from) return
    setIsLoading(true)
    try {
      const selectedStoreStr = localStorage.getItem('selectedStore')
      if (!selectedStoreStr) return
      const store = JSON.parse(selectedStoreStr)

      const normalized = normalizeRange(activeRange)
      if (!normalized) return

      const result = await window.api.transactions.getAll({
        storeId: store._id || store.id,
        page,
        pageSize,
        search: searchTerm,
        startDate: normalized.from.toISOString(),
        endDate: normalized.to.toISOString()
      })

      if (result.success) {
        setTransactions(result.data)
        setTotalPages(result.totalPages)
        setTotalRecords(result.total)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const generateReport = async (nextRange?: DateRange) => {
    const normalized = normalizeRange(nextRange ?? range)
    if (!normalized) return
    setIsGenerating(true)
    setReportRange(normalized)
    setPage(1)
    await loadTransactions(normalized)
    await loadReportData(normalized)
    setIsGenerating(false)
  }

  const loadReportData = async (activeRange: { from: Date; to: Date }) => {
    setIsReportLoading(true)
    try {
      const selectedStoreStr = localStorage.getItem('selectedStore')
      if (!selectedStoreStr) return
      const store = JSON.parse(selectedStoreStr)
      const result = await window.api.transactions.getAll({
        storeId: store._id || store.id,
        page: 1,
        pageSize: 5000,
        search: '',
        startDate: activeRange.from.toISOString(),
        endDate: activeRange.to.toISOString()
      })

      if (!result.success) return

      const rows = (result.data || [])
        .map((item) => ({
          id: item._id,
          transactionDate: item.transactionDate,
          description: item.description,
          account: item.entries?.[0]?.account?.accountName || '—',
          entryType: item.entries?.[0]?.entryType || '—',
          totalAmount: Number(item.totalAmount || 0),
          referenceType: item.referenceType
        }))
        .sort(
          (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
        )

      const totals = rows.reduce(
        (acc, row) => {
          if (row.entryType === 'DEBIT') {
            acc.totalDebit += row.totalAmount
          } else {
            acc.totalCredit += row.totalAmount
          }
          acc.netChange = acc.totalDebit - acc.totalCredit
          return acc
        },
        { totalCredit: 0, totalDebit: 0, netChange: 0 }
      )

      setReportRows(rows)
      setReportTotals(totals)
    } finally {
      setIsReportLoading(false)
    }
  }

  const handlePreviewReport = () => {
    if (!reportRows.length) {
      toast.error('No report data to download')
      return
    }

    const payload = {
      rangeLabel,
      rows: reportRows,
      totals: reportTotals
    }

    sessionStorage.setItem('transactionsReportPreview', JSON.stringify(payload))
    navigate('/dashboard/accounting/transactions/preview')
  }

  useEffect(() => {
    const initialRange = quickRanges[2].getRange()
    setRange(initialRange)
    void generateReport(initialRange)
  }, [])

  useEffect(() => {
    if (reportRange?.from) {
      loadTransactions(reportRange)
    }
  }, [page, pageSize, searchTerm, reportRange])

  const columns = [
    {
      header: 'Date',
      accessor: 'transactionDate',
      render: (item: any) => format(new Date(item.transactionDate), 'MMM dd, yyyy HH:mm')
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (item: any) => <span className="text-foreground font-medium">{item.description}</span>
    },
    {
      header: 'Account',
      accessor: 'entries',
      render: (item: any) => item.entries?.[0]?.account?.accountName || '—'
    },
    {
      header: 'Type',
      accessor: 'entries',
      render: (item: any) => (
        <Badge
          variant="outline"
          className="border-border text-[10px] uppercase text-muted-foreground"
        >
          {item.entries?.[0]?.entryType || '—'}
        </Badge>
      )
    },
    {
      header: 'Amount',
      accessor: 'totalAmount',
      render: (item: any) => (
        <span
          className={`font-bold ${
            item.entries?.[0]?.entryType === 'DEBIT' ? 'text-emerald-500' : 'text-red-400'
          }`}
        >
          {item.entries?.[0]?.entryType === 'DEBIT' ? '' : '-'}Rs.{' '}
          {item.totalAmount?.toLocaleString()}
        </span>
      )
    },
    {
      header: 'Reference',
      accessor: 'referenceType',
      render: (item: any) => (
        <span className="text-xs uppercase text-muted-foreground">{item.referenceType}</span>
      )
    }
  ]

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-black">Transactions Report</CardTitle>
            <p className="text-xs text-muted-foreground">
              Track all account debits and credits for the selected range.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-10 border-border"
              onClick={() => void generateReport()}
              disabled={isGenerating}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </Button>
            <Button
              className="h-10 bg-[#4ade80] text-black hover:bg-[#22c55e]"
              onClick={handlePreviewReport}
            >
              <FileText className="w-4 h-4 mr-2" />
              View Report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Date Range
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 border-border">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {rangeLabel}
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
            </div>
            <div className="flex flex-wrap gap-2">
              {quickRanges.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  className="h-9 border-border font-semibold"
                  onClick={() => {
                    const next = preset.getRange()
                    setRange(next)
                    void generateReport(next)
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-4 bg-muted/20">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Total Debit
              </div>
              <div className="text-lg font-black text-emerald-600">
                {formatCurrency(reportTotals.totalDebit)}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4 bg-muted/20">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Total Credit
              </div>
              <div className="text-lg font-black text-red-500">
                {formatCurrency(reportTotals.totalCredit)}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4 bg-muted/20">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Net Cash</div>
              <div className="text-lg font-black text-foreground">
                {formatCurrency(reportTotals.netChange)}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <ScrollArea className="max-h-[480px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isReportLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Loading report...
                      </TableCell>
                    </TableRow>
                  ) : reportRows.length > 0 ? (
                    reportRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {format(new Date(row.transactionDate), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {row.description}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.account}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-border text-[10px] uppercase text-muted-foreground"
                          >
                            {row.entryType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span
                            className={
                              row.entryType === 'DEBIT' ? 'text-emerald-600' : 'text-red-500'
                            }
                          >
                            {row.entryType === 'DEBIT' ? '' : '-'}
                            {formatCurrency(row.totalAmount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs uppercase text-muted-foreground">
                          {row.referenceType}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No transactions found for this range.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <DataPage
        title={`Account Transactions (${rangeLabel})`}
        description="Track every debit and credit that touches your accounts."
        data={transactions}
        columns={columns}
        searchPlaceholder="Search description or type..."
        fileName="account_transactions"
        isLoading={isLoading}
        currentPage={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
        searchTerm={searchTerm}
        onSearchChange={(term) => {
          setSearchTerm(term)
          setPage(1)
        }}
      />
    </div>
  )
}
