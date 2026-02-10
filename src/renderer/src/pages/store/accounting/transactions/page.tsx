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
import { CalendarIcon, RefreshCw } from 'lucide-react'
import { DataPage } from '@renderer/components/shared/data-page'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Calendar } from '@renderer/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'

export default function TransactionsPage() {
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
    setIsGenerating(false)
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
      <div className="flex flex-wrap items-center gap-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-11 justify-start border-border text-left">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {range?.from
                ? range.to
                  ? `${format(range.from, 'MMM dd, yyyy')} - ${format(range.to, 'MMM dd, yyyy')}`
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
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Report'}
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
