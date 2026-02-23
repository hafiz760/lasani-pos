'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { DataPage } from '@renderer/components/shared/data-page'
import { Badge } from '@renderer/components/ui/badge'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Button } from '@renderer/components/ui/button'

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

const expenseSchema = z.object({
  description: z.string().min(2, 'Description must be at least 2 characters'),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  category: z.string().min(1, 'Category is required'),
  account: z.string().min(1, 'Payment account is required'),
  transactionType: z.enum(['DEBIT', 'CREDIT']),
  expenseDate: z.string().min(1, 'Date is required')
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

export default function ExpensesPage() {
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
          className={`font-bold ${item.transactionType === 'DEBIT' ? 'text-emerald-500' : 'text-red-400'
            }`}
        >
          {item.transactionType === 'DEBIT' ? '' : '-'}Rs. {item.amount?.toLocaleString()}
        </span>
      )
    }
  ]

  return (
    <>
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
