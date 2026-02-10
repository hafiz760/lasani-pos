'use client'

import { useState, useEffect } from 'react'
import { DataPage } from '@renderer/components/shared/data-page'
import { Badge } from '@renderer/components/ui/badge'
import { TrendingUp, TrendingDown, Landmark, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@renderer/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Button } from '@renderer/components/ui/button'
import { toast } from 'sonner'
import { DeleteConfirm } from '@renderer/components/shared/delete-confirm'
import { z } from 'zod'
import { useForm, SubmitHandler, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'

const accountSchema = z.object({
  accountCode: z.string().min(1, 'Account code is required'),
  accountName: z.string().min(2, 'Account name must be at least 2 characters'),
  accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  description: z.string().optional().or(z.literal('')),
  currentBalance: z.number()
})

const setupSchema = z.object({
  cashOpeningBalance: z.coerce.number().min(0, 'Opening balance must be 0 or more'),
  bankOpeningBalance: z.coerce.number().min(0, 'Opening balance must be 0 or more')
})

type AccountFormValues = z.infer<typeof accountSchema>
type SetupFormValues = z.infer<typeof setupSchema>

export default function AccountsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [accounts, setAccounts] = useState<any[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [summary, setSummary] = useState({
    totalAssets: 0,
    totalRevenue: 0,
    totalExpenses: 0
  })

  useEffect(() => {
    loadAccounts()
  }, [page, pageSize, searchTerm])

  const loadAccounts = async () => {
    setIsLoading(true)
    try {
      const selectedStoreStr = localStorage.getItem('selectedStore')
      if (!selectedStoreStr) return
      const store = JSON.parse(selectedStoreStr)

      const result = await window.api.accounts.getAll({
        storeId: store._id || store.id,
        page,
        pageSize,
        search: searchTerm
      })

      if (result.success) {
        setAccounts(result.data)
        setTotalRecords(result.total)
        setTotalPages(result.totalPages)
        if (result.summary) {
          setSummary(result.summary)
        }
      } else {
        toast.error(result.error || 'Failed to load accounts')
      }
    } catch (error: any) {
      console.error('Failed to load accounts:', error)
      toast.error('An error occurred while loading accounts')
    } finally {
      setIsLoading(false)
    }
  }

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountCode: '',
      accountName: '',
      accountType: 'ASSET',
      description: '',
      currentBalance: 0
    }
  })

  const setupForm = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema) as Resolver<SetupFormValues>,
    defaultValues: {
      cashOpeningBalance: 0,
      bankOpeningBalance: 0
    }
  })

  const onSubmit: SubmitHandler<AccountFormValues> = async (values) => {
    setIsSaving(true)
    try {
      const result = await window.api.accounts.update(selectedAccount._id, values)

      if (result.success) {
        toast.success('Account updated successfully')
        setIsEditOpen(false)
        form.reset()
        loadAccounts()
      } else {
        toast.error('Error: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const result = await window.api.accounts.delete(deleteId)
      if (result.success) {
        toast.success('Account deleted successfully')
        setDeleteId(null)
        loadAccounts()
      } else {
        toast.error(result.error || 'Failed to delete account')
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const openEdit = (account: any) => {
    setSelectedAccount(account)
    form.reset({
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      description: account.description || '',
      currentBalance: account.currentBalance
    })
    setIsEditOpen(true)
  }

  const handleSetupAccounts: SubmitHandler<SetupFormValues> = async (values) => {
    setIsSaving(true)
    try {
      const selectedStoreStr = localStorage.getItem('selectedStore')
      if (!selectedStoreStr) return
      const store = JSON.parse(selectedStoreStr)
      const storeId = store._id || store.id

      const existing = await window.api.accounts.getAll({ storeId, pageSize: 5 })
      if (existing.success && existing.data.length > 0) {
        toast.error('Accounts already exist for this store.')
        setIsSaving(false)
        setIsSetupOpen(false)
        return
      }

      const [cashResult, bankResult] = await Promise.all([
        window.api.accounts.create({
          store: storeId,
          accountCode: '1001',
          accountName: 'Cash in Hand',
          accountType: 'ASSET',
          currentBalance: values.cashOpeningBalance
        }),
        window.api.accounts.create({
          store: storeId,
          accountCode: '1002',
          accountName: 'Bank',
          accountType: 'ASSET',
          currentBalance: values.bankOpeningBalance
        })
      ])

      if (cashResult.success && bankResult.success) {
        toast.success('Default accounts created successfully')
        setIsSetupOpen(false)
        setupForm.reset()
        loadAccounts()
      } else {
        toast.error('Failed to create default accounts')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create default accounts')
    } finally {
      setIsSaving(false)
    }
  }

  const columns = [
    {
      header: 'Code',
      accessor: 'accountCode',
      render: (item: any) => <span className="font-mono text-xs">{item.accountCode}</span>
    },
    {
      header: 'Account Name',
      accessor: 'accountName',
      render: (item: any) => <span className="font-medium text-foreground">{item.accountName}</span>
    },
    {
      header: 'Type',
      accessor: 'accountType',
      render: (item: any) => (
        <Badge
          variant="outline"
          className="border-border text-[10px] uppercase text-muted-foreground"
        >
          {item.accountType}
        </Badge>
      )
    },
    {
      header: 'Balance',
      accessor: 'currentBalance',
      render: (item: any) => {
        const isNegative = item.currentBalance < 0
        return (
          <span className={`font-bold ${isNegative ? 'text-red-400' : 'text-[#4ade80]'}`}>
            Rs. {Math.abs(item.currentBalance).toLocaleString()}
            {isNegative && ' (CR)'}
          </span>
        )
      }
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (item: any) => (
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-[#4ade80]' : 'bg-muted'}`} />
          <span className="text-xs text-muted-foreground">
            {item.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: '_id',
      render: (item: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-accent h-8 w-8 text-foreground">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="bg-popover border-border text-popover-foreground"
            align="end"
          >
            <DropdownMenuItem
              onClick={() => openEdit(item)}
              className="focus:bg-[#4ade80] focus:text-black cursor-pointer"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteId(item._id)}
              className="focus:bg-red-500 focus:text-white cursor-pointer text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="border-border"
          onClick={() => navigate('/dashboard/accounting/transactions')}
        >
          View History
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Assets (Cash)</p>
              <p className="text-2xl font-bold text-foreground">
                Rs. {summary.totalAssets.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-[#4ade80]/10 rounded-lg text-[#4ade80]">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">
                Rs. {summary.totalRevenue.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-lg text-red-400">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-foreground">
                Rs. {summary.totalExpenses.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {accounts.length === 0 && !isLoading && (
        <Card className="border-border">
          <CardContent className="p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Setup Chart of Accounts</h3>
              <p className="text-sm text-muted-foreground">
                Create Cash in Hand and Bank accounts with opening balances.
              </p>
            </div>
            <Button
              className="bg-[#4ade80] text-black hover:bg-[#22c55e] font-semibold"
              onClick={() => setIsSetupOpen(true)}
            >
              Setup Accounts
            </Button>
          </CardContent>
        </Card>
      )}

      <DataPage
        title="Chart of Accounts"
        description="Monitor your financial accounts and their current balances in real-time."
        data={accounts}
        columns={columns}
        searchPlaceholder="Search account name or code..."
        fileName="chart_of_accounts_export"
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
      />

      <DeleteConfirm
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        description="This will permanently delete this account. Accounts with transactions cannot be deleted."
      />

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            form.reset()
            setIsEditOpen(false)
          }
        }}
      >
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="accountCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted border-border"
                          placeholder="e.g., 1001"
                          disabled={isEditOpen}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-muted border-border">
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                          <SelectItem value="ASSET">Asset</SelectItem>
                          <SelectItem value="LIABILITY">Liability</SelectItem>
                          <SelectItem value="EQUITY">Equity</SelectItem>
                          <SelectItem value="REVENUE">Revenue</SelectItem>
                          <SelectItem value="EXPENSE">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-muted border-border"
                        placeholder="e.g., Cash in Hand"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-muted border-border"
                        placeholder="Brief description..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isEditOpen ? 'Current Balance' : 'Opening Balance'}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="bg-muted border-border"
                        placeholder="0"
                      />
                    </FormControl>
                    {isEditOpen && (
                      <p className="text-[10px] text-yellow-500 font-medium mt-1">
                        Warning: Manually editing the balance may cause discrepancies with
                        transaction history.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset()
                    setIsEditOpen(false)
                  }}
                  className="border-border"
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isLoading={isSaving}
                  loadingText="Updating..."
                  className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold"
                >
                  Update Account
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSetupOpen} onOpenChange={setIsSetupOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Setup Default Accounts</DialogTitle>
          </DialogHeader>
          <Form {...setupForm}>
            <form onSubmit={setupForm.handleSubmit(handleSetupAccounts)} className="space-y-4 py-4">
              <FormField
                control={setupForm.control}
                name="cashOpeningBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cash in Hand Opening Balance</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="bg-muted border-border"
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={setupForm.control}
                name="bankOpeningBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Opening Balance</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="bg-muted border-border"
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSetupOpen(false)}
                  className="border-border"
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isLoading={isSaving}
                  loadingText="Setting up..."
                  className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold"
                >
                  Create Accounts
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
