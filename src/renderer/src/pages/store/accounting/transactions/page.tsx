import { useEffect, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth
} from 'date-fns'

import { DataPage } from '@renderer/components/shared/data-page'
import { Badge } from '@renderer/components/ui/badge'


export default function TransactionsPage() {
  const [range, setRange] = useState<DateRange | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [transactions, setTransactions] = useState<any[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

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

  useEffect(() => {
    const initialRange = {
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    }
    setRange(initialRange)
  }, [])

  useEffect(() => {
    if (range?.from) {
      loadTransactions(range)
    }
  }, [page, pageSize, searchTerm, range])

  const rangeLabel = range?.from
    ? `${format(range.from, 'MMM dd')} - ${format(range.to || range.from, 'MMM dd, yyyy')}`
    : 'This Month'

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
          className={`font-bold ${item.entries?.[0]?.entryType === 'DEBIT' ? 'text-emerald-500' : 'text-red-400'
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
  )
}
