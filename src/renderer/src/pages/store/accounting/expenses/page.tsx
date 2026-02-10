'use client'

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
import { DataPage } from '@renderer/components/shared/data-page'
import { Badge } from '@renderer/components/ui/badge'
import { toast } from 'sonner'
import { Calendar } from '@renderer/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Button } from '@renderer/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { exportToPDF } from '@renderer/lib/export'
import { z } from 'zod'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { useNavigate } from 'react-router-dom'
import { CalendarIcon, FileText, RefreshCw } from 'lucide-react'

const expenseSchema = z.object({
  description: z.string().min(2, 'Description must be at least 2 characters'),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  category: z.string().min(1, 'Category is required'),
  account: z.string().min(1, 'Payment account is required'),
  transactionType: z.enum(['DEBIT', 'CREDIT']),
  expenseDate: z.string().min(1, 'Date is required')
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

interface ExpenseReportRow {
  id: string
  expenseDate: string
  category: string
  description: string
  account: string
  transactionType: string
  amount: number
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

export default function ExpensesPage() {
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [range, setRange] = useState<DateRange | undefined>()
  const [reportRange, setReportRange] = useState<DateRange | undefined>()
  const [reportRows, setReportRows] = useState<ExpenseReportRow[]>([])
  const [reportTotals, setReportTotals] = useState({
    totalCredit: 0,
    totalDebit: 0,
    netExpense: 0
  })
  const [isReportLoading, setIsReportLoading] = useState(false)

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      description: '',
      amount: 0,
      category: 'Other',
      account: '',
      transactionType: 'CREDIT',
      expenseDate: new Date().toISOString().split('T')[0]
    }
  })

  const loadData = async () => {
    setIsLoading(true)
    try {
      const selectedStoreStr = localStorage.getItem('selectedStore')
      if (!selectedStoreStr) return
      const store = JSON.parse(selectedStoreStr)
      const storeId = store._id || store.id

      const [expResult, accResult] = await Promise.all([
        window.api.expenses.getAll({ storeId, page, pageSize, search: searchTerm }),
        window.api.accounts.getAll({ storeId, pageSize: 100 }) // Load all accounts for selection
      ])

      if (expResult.success) {
        setExpenses(expResult.data)
        setTotalPages(expResult.totalPages)
        setTotalRecords(expResult.total)
      }

      if (accResult.success) {
        setAccounts(accResult.data)
      }
    } catch (error: any) {
      console.error('Failed to load expenses data:', error)
      toast.error('Error loading expenses data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page, pageSize, searchTerm])

  useEffect(() => {
    const initialRange = quickRanges[2].getRange()
    setRange(initialRange)
    void generateReport(initialRange)
  }, [])

  const rangeLabel = useMemo(() => {
    if (!reportRange?.from) return 'Select dates'
    const fromLabel = format(reportRange.from, 'MMM dd, yyyy')
    if (!reportRange.to || reportRange.from.getTime() === reportRange.to.getTime()) {
      return fromLabel
    }
    return `${fromLabel} - ${format(reportRange.to, 'MMM dd, yyyy')}`
  }, [reportRange])

  const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString()}`

  const generateReport = async (selectedRange: DateRange | undefined = range) => {
    const selectedStoreStr = localStorage.getItem('selectedStore')
    if (!selectedStoreStr || !selectedRange?.from) return

    const store = JSON.parse(selectedStoreStr)
    const storeId = store._id || store.id
    const start = startOfDay(selectedRange.from)
    const end = endOfDay(selectedRange.to || selectedRange.from)

    setIsReportLoading(true)
    setReportRange({ from: start, to: end })

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
      setReportTotals(totals)
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

    exportData.push({
      Date: 'TOTAL',
      Category: '',
      Description: '',
      Account: '',
      Type: '',
      Amount: `Spent ${formatCurrency(reportTotals.totalCredit)} | Refunds ${formatCurrency(
        reportTotals.totalDebit
      )}`
    })

    exportToPDF(
      exportData,
      `expense_report_${format(new Date(), 'yyyyMMdd')}`,
      `Expense Report (${rangeLabel})`
    )
  }

  const onSubmit: SubmitHandler<ExpenseFormValues> = async (values) => {
    setIsSaving(true)
    try {
      const selectedStoreStr = localStorage.getItem('selectedStore')
      const userStr = localStorage.getItem('user')
      if (!selectedStoreStr || !userStr) return

      const store = JSON.parse(selectedStoreStr)
      const user = JSON.parse(userStr)

      const result = await window.api.expenses.create({
        ...values,
        store: store._id || store.id,
        createdBy: user._id || user.id,
        paymentMethod: 'Account Transfer' // Default or based on account
      })

      if (result.success) {
        toast.success('Expense recorded successfully')
        setIsAddOpen(false)
        form.reset()
        loadData()
      } else {
        toast.error('Error: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const columns = [
    {
      header: 'Date',
      accessor: 'expenseDate',
      render: (item: any) => format(new Date(item.expenseDate), 'MMM dd, yyyy')
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (item: any) => (
        <Badge
          variant="outline"
          className="border-border text-muted-foreground uppercase text-[10px]"
        >
          {item.category}
        </Badge>
      )
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (item: any) => <span className="text-foreground font-medium">{item.description}</span>
    },
    {
      header: 'Account',
      accessor: 'account',
      render: (item: any) => item.account?.accountName || 'N/A'
    },
    {
      header: 'Type',
      accessor: 'transactionType',
      render: (item: any) => (
        <Badge
          variant="outline"
          className="border-border text-muted-foreground uppercase text-[10px]"
        >
          {item.transactionType || 'CREDIT'}
        </Badge>
      )
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (item: any) => (
        <span
          className={`font-bold ${
            item.transactionType === 'DEBIT' ? 'text-emerald-500' : 'text-red-400'
          }`}
        >
          {item.transactionType === 'DEBIT' ? '' : '-'}Rs. {item.amount?.toLocaleString()}
        </span>
      )
    }
  ]

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          className="border-border"
          onClick={() => navigate('/dashboard/accounting/transactions')}
        >
          View History
        </Button>
      </div>

      <Card className="border-border mb-6">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-black">Expense Report</CardTitle>
            <p className="text-xs text-muted-foreground">
              Review expenses by date and export the report.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-10 border-border"
              onClick={() => void generateReport()}
              disabled={isReportLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {isReportLoading ? 'Generating...' : 'Generate Report'}
            </Button>
            <Button
              className="h-10 bg-[#4ade80] text-black hover:bg-[#22c55e]"
              onClick={handleDownloadPdf}
            >
              <FileText className="w-4 h-4 mr-2" />
              Download PDF
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
                    selected={range}
                    onSelect={setRange}
                    numberOfMonths={2}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickRanges.map((quick) => (
                <Button
                  key={quick.label}
                  type="button"
                  variant="outline"
                  className="h-9 text-xs font-semibold border-border"
                  onClick={() => {
                    const nextRange = quick.getRange()
                    setRange(nextRange)
                    void generateReport(nextRange)
                  }}
                >
                  {quick.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-4 bg-muted/20">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Total Spent
              </div>
              <div className="text-lg font-black text-red-500">
                {formatCurrency(reportTotals.totalCredit)}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4 bg-muted/20">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Refunds</div>
              <div className="text-lg font-black text-emerald-600">
                {formatCurrency(reportTotals.totalDebit)}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4 bg-muted/20">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Net Expense
              </div>
              <div className="text-lg font-black text-foreground">
                {formatCurrency(reportTotals.netExpense)}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <ScrollArea className="max-h-[480px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
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
                        <TableCell>{format(new Date(row.expenseDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-border text-muted-foreground uppercase text-[10px]"
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
                            className="border-border text-muted-foreground uppercase text-[10px]"
                          >
                            {row.transactionType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span
                            className={
                              row.transactionType === 'DEBIT' ? 'text-emerald-600' : 'text-red-500'
                            }
                          >
                            {row.transactionType === 'DEBIT' ? '' : '-'}
                            {formatCurrency(row.amount)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No expenses found for this range.
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
        title="Expenses"
        description="Track your business expenditures and categorize costs."
        data={expenses}
        columns={columns}
        searchPlaceholder="Search description or category..."
        fileName="business_expenses_export"
        addLabel="Record Expense"
        onAdd={() => setIsAddOpen(true)}
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

      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open)
          if (!open) form.reset()
        }}
      >
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Record New Expense</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expenseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-muted border-border" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          className="bg-muted border-border"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-muted border-border"
                        placeholder="e.g. Utility Bill, Rent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-muted border-border">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                          <SelectItem value="Utilities">Utilities</SelectItem>
                          <SelectItem value="Rent">Rent</SelectItem>
                          <SelectItem value="Salary">Salary</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Maintenance">Maintenance</SelectItem>
                          <SelectItem value="Supplier Payment">Supplier Payment</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Account</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-muted border-border">
                            <SelectValue placeholder="Select Account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                          {accounts.map((acc) => (
                            <SelectItem key={acc._id} value={acc._id}>
                              {acc.accountName} (Rs. {acc.currentBalance.toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transactionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-muted border-border">
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                          <SelectItem value="CREDIT">Credit</SelectItem>
                          <SelectItem value="DEBIT">Debit</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                  className="border-border"
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isLoading={isSaving}
                  loadingText="Recording..."
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold"
                >
                  Save Expense
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
