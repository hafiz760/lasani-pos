import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataPage } from '@renderer/components/shared/data-page'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Button } from '@renderer/components/ui/button'
import { Edit, Trash2, Mail, MapPin, Wallet } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { toast } from 'sonner'
import { DeleteConfirm } from '@renderer/components/shared/delete-confirm'
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
import { Input } from '@renderer/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'

const supplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contactPerson: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  openingBalance: z.preprocess((val) => Number(val) || 0, z.number()).default(0)
})

type SupplierFormValues = z.infer<typeof supplierSchema>

export default function SuppliersPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentAccount, setPaymentAccount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])

  const [suppliers, setSuppliers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [currentStore, setCurrentStore] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const storeData = localStorage.getItem('selectedStore')
    if (storeData) {
      setCurrentStore(JSON.parse(storeData))
    }
  }, [])

  const loadSuppliers = async () => {
    if (!currentStore?._id) return
    setIsLoading(true)
    try {
      const result = await window.api.suppliers.getAll({
        storeId: currentStore._id,
        page,
        pageSize,
        search: searchTerm
      })
      if (result.success) {
        setSuppliers(result.data)
        setTotalRecords(result.total || result.data.length)
        setTotalPages(result.totalPages || 1)
      }
    } catch (error) {
      toast.error('Failed to load suppliers')
    } finally {
      setIsLoading(false)
    }
  }

  const loadAccounts = async () => {
    if (!currentStore?._id) return
    try {
      const result = await window.api.accounts.getAll({ storeId: currentStore._id, pageSize: 200 })
      if (result.success) {
        setAccounts(result.data)
      }
    } catch (error) {
      toast.error('Failed to load accounts')
    }
  }

  useEffect(() => {
    loadSuppliers()
    loadAccounts()
  }, [currentStore?._id, page, pageSize, searchTerm])

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      address: '',
      city: '',
      openingBalance: 0
    }
  })

  const onSubmit: SubmitHandler<SupplierFormValues> = async (values) => {
    if (!currentStore?._id) {
      toast.error('No store selected')
      return
    }
    setIsSubmitting(true)
    try {
      let result
      const data = { ...values, store: currentStore._id }
      if (editingSupplier) {
        result = await window.api.suppliers.update(editingSupplier._id, data)
      } else {
        result = await window.api.suppliers.create(data)
      }

      if (result.success) {
        toast.success(`Supplier ${editingSupplier ? 'updated' : 'created'} successfully`)
        setIsFormOpen(false)
        setEditingSupplier(null)
        form.reset()
        loadSuppliers()
      } else {
        toast.error('Error: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const result = await window.api.suppliers.delete(deleteId)
      if (result.success) {
        toast.success('Supplier deleted successfully')
        loadSuppliers()
      } else {
        toast.error('Error deleting supplier: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setDeleteId(null)
      setIsDeleting(false)
    }
  }

  const openEdit = (supplier: any) => {
    setEditingSupplier(supplier)
    form.reset({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      address: supplier.address || '',
      city: supplier.city || '',
      openingBalance: supplier.openingBalance || 0
    })
    setIsFormOpen(true)
  }

  const openPaymentDialog = (supplier: any) => {
    setSelectedSupplier(supplier)
    setPaymentAmount(supplier.currentBalance?.toString() || '')
    setPaymentAccount('')
    setPaymentNotes('')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setIsPaymentOpen(true)
  }

  const handleRecordPayment = async () => {
    if (!selectedSupplier || !paymentAmount) return
    if (!paymentAccount) {
      toast.error('Select a payment account')
      return
    }
    setIsPaymentSubmitting(true)
    try {
      const userStr = localStorage.getItem('user')
      const user = userStr ? JSON.parse(userStr) : null
      const result = await window.api.suppliers.recordPayment(selectedSupplier._id, {
        amount: parseFloat(paymentAmount),
        accountId: paymentAccount,
        paymentDate,
        notes: paymentNotes,
        recordedBy: user?._id || user?.id,
        method: 'Account Transfer'
      })

      if (result.success) {
        toast.success('Supplier payment recorded')
        setIsPaymentOpen(false)
        setPaymentAmount('')
        setPaymentNotes('')
        loadSuppliers()
      } else {
        toast.error(result.error || 'Failed to record payment')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment')
    } finally {
      setIsPaymentSubmitting(false)
    }
  }

  const openAdd = () => {
    setEditingSupplier(null)
    form.reset({
      name: '',
      contactPerson: '',
      email: '',
      address: '',
      city: '',
      openingBalance: 0
    })
    setIsFormOpen(true)
  }

  const columns = [
    {
      header: 'Supplier Name',
      accessor: 'name',
      render: (item: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{item.name}</span>
          <span className="text-[10px] text-muted-foreground uppercase">
            {item.contactPerson || 'No Contact Person'}
          </span>
        </div>
      )
    },
    {
      header: 'Email Address',
      accessor: 'email',
      render: (item: any) => (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {item.email ? (
            <>
              <Mail className="w-3 h-3" />
              {item.email}
            </>
          ) : (
            'N/A'
          )}
        </div>
      )
    },
    {
      header: 'Location',
      accessor: 'city',
      render: (item: any) => (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {item.city || 'N/A'}
        </div>
      )
    },
    {
      header: 'Opening Balance',
      accessor: 'openingBalance',
      render: (item: any) => (
        <div className="font-medium text-muted-foreground">
          Rs. {(item.openingBalance || 0).toLocaleString()}
        </div>
      )
    },
    {
      header: 'Balance',
      accessor: 'currentBalance',
      render: (item: any) => (
        <div className={`font-bold ${item.currentBalance > 0 ? 'text-red-400' : 'text-[#E8705A]'}`}>
          Rs. {(item.currentBalance || 0).toLocaleString()}
        </div>
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
            disabled={!item.currentBalance || item.currentBalance <= 0}
          >
            <Wallet className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-accent hover:text-[#E8705A]"
            onClick={() => openEdit(item)}
          >
            <Edit className="w-4 h-4" />
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

  if (!currentStore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-bold">No Store Selected</h2>
        <p className="text-muted-foreground">Please select a store to manage suppliers.</p>
      </div>
    )
  }

  return (
    <>
      <DataPage
        title="Suppliers"
        description="Manage your product vendors and procurement sources."
        data={suppliers}
        columns={columns}
        searchPlaceholder="Search suppliers by name or phone..."
        fileName="suppliers_export"
        addLabel="Add Supplier"
        onAdd={openAdd}
        isLoading={isLoading}
        currentPage={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize)
          setPage(1)
        }}
        searchTerm={searchTerm}
        onSearchChange={(term) => {
          setSearchTerm(term)
          setPage(1)
        }}
        onRowClick={(item) => navigate(`/dashboard/purchases/suppliers/${item._id}`)}
      />

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) form.reset()
        }}
      >
        <DialogContent className="bg-background border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted border-border"
                          placeholder="e.g. ABC Distributors"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-muted border-border" />
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
                      <FormLabel>Email Address (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-muted border-border" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-muted border-border" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="openingBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Balance (Rs.)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-muted border-border" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-muted border-border" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  className="border-border"
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isLoading={isSubmitting}
                  loadingText={editingSupplier ? 'Updating...' : 'Creating...'}
                  className="bg-[#E8705A] hover:bg-[#D4604C] text-black font-semibold"
                >
                  {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DeleteConfirm
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        description="This will permanently delete this supplier. They will no longer appear in new purchase orders."
      />

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Supplier Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-sm font-semibold text-foreground">
                {selectedSupplier?.name || 'Supplier'}
              </div>
              <div className="text-xs text-muted-foreground">
                Balance: Rs. {(selectedSupplier?.currentBalance || 0).toLocaleString()}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Payment Date</label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
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
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Payment Account</label>
              <Select value={paymentAccount} onValueChange={setPaymentAccount}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  {accounts.map((acc) => (
                    <SelectItem key={acc._id} value={acc._id}>
                      {acc.accountName} (Rs. {acc.currentBalance.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </>
  )
}
