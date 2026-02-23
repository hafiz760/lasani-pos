import { useEffect, useState } from 'react'
import { DataPage } from '@renderer/components/shared/data-page'
import { Button } from '@renderer/components/ui/button'
import { LoadingButton } from '@renderer/components/ui/loading-button'


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

import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, SubmitHandler } from 'react-hook-form'
import { customerSchema, CustomerFormData } from '@renderer/lib/validations/customer.validation'
import {
  Pencil,
  Trash2,
  Wallet
} from 'lucide-react'

const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer']

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





  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      name: '',
      phone: '',
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
        store: currentStore._id,
        balance: values.openingBalance
      }

      const updatePayload = {
        name: values.name,
        phone: values.phone,
        store: currentStore._id
      }

      const result = editingCustomer
        ? await window.api.customers.update(editingCustomer._id, updatePayload)
        : await window.api.customers.create(createPayload)

      if (result.success) {
        toast.success(`Customer ${editingCustomer ? 'updated' : 'created'} successfully`)
        setIsFormOpen(false)
        setEditingCustomer(null)
        form.reset({ name: '', phone: '', openingBalance: 0 })
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
    form.reset({ name: '', phone: '', openingBalance: 0 })
    setIsFormOpen(true)
  }

  const openEdit = (customer: any) => {
    setEditingCustomer(customer)
    form.reset({
      name: customer.name,
      phone: customer.phone,
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
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-accent hover:text-[#E8705A]"
            onClick={() => openPaymentDialog(item)}
            disabled={!item.balance || item.balance <= 0}
          >
            <Wallet className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-accent hover:text-[#E8705A]"
            onClick={() => openEdit(item)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500"
            onClick={() => setDeleteId(item._id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <>
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
                    className={`h-10 text-xs font-semibold ${paymentMethod === method
                      ? 'text-[#E8705A] border-[#E8705A] hover:bg-[#E8705A] hover:text-[#E8705A]'
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
