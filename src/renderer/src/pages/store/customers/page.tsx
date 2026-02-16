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
import { Button } from '@renderer/components/ui/button'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Calendar } from '@renderer/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, SubmitHandler } from 'react-hook-form'
import { customerSchema, CustomerFormData } from '@renderer/lib/validations/customer.validation'
import { exportToPDF } from '@renderer/lib/export'
import {
  CalendarIcon,
  FileText,
  MoreVertical,
  Pencil,
  RefreshCw,
  Trash2,
  Wallet
} from 'lucide-react'

const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer']

interface CustomerReportRow {
  id: string
  name: string
  phone: string
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  salesCount: number
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

export default function CustomersPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentStore, setCurrentStore] = useState<any>(null)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [range, setRange] = useState<DateRange | undefined>()
  const [reportRange, setReportRange] = useState<DateRange | undefined>()
  const [reportRows, setReportRows] = useState<CustomerReportRow[]>([])
  const [reportTotals, setReportTotals] = useState({
    totalAmount: 0,
    totalPaid: 0,
    totalPending: 0
  })
  const [isReportLoading, setIsReportLoading] = useState(false)

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paymentNotes, setPaymentNotes] = useState('')

  useEffect(() => {
    const storeData = localStorage.getItem('selectedStore')
    if (storeData) {
      setCurrentStore(JSON.parse(storeData))
    }
  }, [])

  const loadCustomers = async () => {
    if (!currentStore?._id) return
    setIsLoading(true)
    try {
      const result = await window.api.customers.getAll({
        storeId: currentStore._id,
        page,
        pageSize,
        search: searchTerm
      })
      if (result.success) {
        setCustomers(result.data)
        setTotalRecords(result.total)
        setTotalPages(result.totalPages)
      } else {
        toast.error(result.error || 'Failed to load customers')
      }
    } catch (error: any) {
      toast.error('Failed to load customers')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [currentStore?._id, page, pageSize, searchTerm])

  useEffect(() => {
    if (!currentStore?._id) return
    const initialRange = quickRanges[2].getRange()
    setRange(initialRange)
    void generateReport(initialRange)
  }, [currentStore?._id])

  const rangeLabel = useMemo(() => {
    if (!reportRange?.from) return 'Select dates'
    const fromLabel = format(reportRange.from, 'MMM dd, yyyy')
    if (!reportRange.to || reportRange.from.getTime() === reportRange.to.getTime()) {
      return fromLabel
    }
    return `${fromLabel} - ${format(reportRange.to, 'MMM dd, yyyy')}`
  }, [reportRange])

  const formatCurrency = (value: number) => `Rs. ${value.toLocaleString()}`

  const generateReport = async (selectedRange: DateRange | undefined = range) => {
    if (!currentStore?._id || !selectedRange?.from) return

    const start = startOfDay(selectedRange.from)
    const end = endOfDay(selectedRange.to || selectedRange.from)

    setIsReportLoading(true)
    setReportRange({ from: start, to: end })

    try {
      const result = await window.api.sales.getReport({
        storeId: currentStore._id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
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
      setReportTotals(totals)
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

    exportData.push({
      Customer: 'TOTAL',
      Phone: '',
      'Total Amount': formatCurrency(reportTotals.totalAmount),
      'Paid Amount': formatCurrency(reportTotals.totalPaid),
      'Pending Amount': formatCurrency(reportTotals.totalPending),
      'Sales Count': reportRows.reduce((acc, row) => acc + row.salesCount, 0)
    })

    exportToPDF(
      exportData,
      `customer_report_${format(new Date(), 'yyyyMMdd')}`,
      `Customer Report (${rangeLabel})`
    )
  }

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      openingBalance: 0
    }
  })

  const onSubmit: SubmitHandler<CustomerFormData> = async (values) => {
    if (!currentStore?._id) {
      toast.error('No store selected')
      return
    }
    setIsSubmitting(true)
    try {
      const createPayload = {
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        store: currentStore._id,
        balance: values.openingBalance
      }

      const updatePayload = {
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        store: currentStore._id
      }

      const result = editingCustomer
        ? await window.api.customers.update(editingCustomer._id, updatePayload)
        : await window.api.customers.create(createPayload)

      if (result.success) {
        toast.success(`Customer ${editingCustomer ? 'updated' : 'created'} successfully`)
        setIsFormOpen(false)
        setEditingCustomer(null)
        form.reset({ name: '', phone: '', email: '', openingBalance: 0 })
        loadCustomers()
      } else {
        toast.error(result.error || 'Failed to save customer')
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openAdd = () => {
    setEditingCustomer(null)
    form.reset({ name: '', phone: '', email: '', openingBalance: 0 })
    setIsFormOpen(true)
  }

  const openEdit = (customer: any) => {
    setEditingCustomer(customer)
    form.reset({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      openingBalance: customer.balance || 0
    })
    setIsFormOpen(true)
  }

  const openPaymentDialog = (customer: any) => {
    setSelectedCustomer(customer)
    setPaymentAmount(customer.balance?.toString() || '')
    setPaymentMethod('Cash')
    setPaymentNotes('')
    setIsPaymentOpen(true)
  }

  const handleRecordPayment = async () => {
    if (!selectedCustomer || !paymentAmount) return
    setIsPaymentSubmitting(true)
    try {
      const userStr = localStorage.getItem('user')
      const user = userStr ? JSON.parse(userStr) : null

      const result = await window.api.customers.recordPayment(selectedCustomer._id, {
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        notes: paymentNotes,
        recordedBy: user?._id || user?.id
      })

      if (result.success) {
        toast.success('Payment recorded successfully')
        setIsPaymentOpen(false)
        setPaymentAmount('')
        setPaymentNotes('')
        loadCustomers()
      } else {
        toast.error(result.error || 'Failed to record payment')
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setIsPaymentSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const result = await window.api.customers.delete(deleteId)
      if (result.success) {
        toast.success('Customer deleted successfully')
        loadCustomers()
      } else {
        toast.error(result.error || 'Failed to delete customer')
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setDeleteId(null)
      setIsDeleting(false)
    }
  }

  const columns = [
    {
      header: 'Customer',
      accessor: 'name',
      render: (item: any) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{item.name}</span>
          <span className="text-[10px] text-muted-foreground uppercase">{item.phone}</span>
        </div>
      )
    },
    {
      header: 'Balance',
      accessor: 'balance',
      render: (item: any) => (
        <span className="font-semibold text-red-500">
          Rs. {(item.balance || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: '_id',
      render: (item: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-accent h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border">
            <DropdownMenuItem
              onClick={() => openPaymentDialog(item)}
              className="cursor-pointer focus:bg-[#4ade80] focus:text-black"
              disabled={!item.balance || item.balance <= 0}
            >
              <Wallet className="w-4 h-4 mr-2" />
              Record Payment
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openEdit(item)}
              className="cursor-pointer focus:bg-accent"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteId(item._id)}
              className="cursor-pointer text-red-500 focus:bg-red-500 focus:text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ]

  return (
    <>
      <Card className="border-border mb-6">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-black">Customer Report</CardTitle>
            <p className="text-xs text-muted-foreground">
              Track customer totals and pending balances by date range.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold uppercase text-muted-foreground">
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
                  <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
            </div>
            <Button
              variant="outline"
              className="h-10 border-border"
              onClick={() => void generateReport()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              className="h-10 bg-[#4ade80] text-black hover:bg-[#22c55e]"
              onClick={handleDownloadReport}
            >
              <FileText className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-center">Sales</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isReportLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Loading report...
                    </TableCell>
                  </TableRow>
                ) : reportRows.length > 0 ? (
                  reportRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{row.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            {row.phone || 'No phone'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{row.salesCount}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(row.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        {formatCurrency(row.paidAmount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-500">
                        {formatCurrency(row.pendingAmount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No credit sales found for this range.
                    </TableCell>
                  </TableRow>
                )}
                {reportRows.length > 0 && (
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-bold">Totals</TableCell>
                    <TableCell className="text-center font-bold">
                      {reportRows.reduce((acc, row) => acc + row.salesCount, 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(reportTotals.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {formatCurrency(reportTotals.totalPaid)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-500">
                      {formatCurrency(reportTotals.totalPending)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-4 bg-muted/20">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Total Amount
              </div>
              <div className="text-lg font-black text-foreground">
                {formatCurrency(reportTotals.totalAmount)}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4 bg-muted/20">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Total Paid
              </div>
              <div className="text-lg font-black text-emerald-600">
                {formatCurrency(reportTotals.totalPaid)}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4 bg-muted/20">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Pending Balance
              </div>
              <div className="text-lg font-black text-red-500">
                {formatCurrency(reportTotals.totalPending)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataPage
        title="Customers"
        description="Manage customer balances and credit payments."
        data={customers}
        columns={columns}
        onAdd={openAdd}
        addLabel="Add Customer"
        searchPlaceholder="Search by name or phone..."
        fileName="customers_export"
        isLoading={isLoading}
        currentPage={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearchChange={setSearchTerm}
        searchTerm={searchTerm}
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Customer name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Phone number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Email address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!editingCustomer && (
                <FormField
                  control={form.control}
                  name="openingBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Balance</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value === 0 ? '' : field.value}
                          onChange={(e) =>
                            field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
                          }
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <LoadingButton type="submit" isLoading={isSubmitting} loadingText="Saving...">
                  {editingCustomer ? 'Update' : 'Create'} Customer
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Customer Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-sm font-semibold text-foreground">
                {selectedCustomer?.name || 'Customer'}
              </div>
              <div className="text-xs text-muted-foreground">
                Balance: Rs. {(selectedCustomer?.balance || 0).toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Amount</label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Method</label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <Button
                    key={method}
                    type="button"
                    variant="outline"
                    className={`h-10 text-xs font-semibold ${
                      paymentMethod === method
                        ? 'text-[#4ade80] border-[#4ade80] hover:bg-[#4ade80] hover:text-[#4ade80]'
                        : 'bg-transparent'
                    }`}
                    onClick={() => setPaymentMethod(method)}
                  >
                    {method}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Notes (Optional)
              </label>
              <Input
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Payment notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              isLoading={isPaymentSubmitting}
              loadingText="Recording..."
              onClick={handleRecordPayment}
            >
              Record Payment
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this customer? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <LoadingButton
              variant="destructive"
              isLoading={isDeleting}
              loadingText="Deleting..."
              onClick={handleDelete}
            >
              Delete
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
