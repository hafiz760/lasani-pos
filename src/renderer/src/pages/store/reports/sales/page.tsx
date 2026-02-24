'use client'

import { useState, useEffect } from 'react'
import { DataPage } from '@renderer/components/shared/data-page'
import { Badge } from '@renderer/components/ui/badge'
import { format } from 'date-fns'
import { Trash2, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { toast } from 'sonner'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer']

export default function SalesReportsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false)

  const [sales, setSales] = useState<any[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadSales()
  }, [page, pageSize, searchTerm, statusFilter])

  const loadSales = async () => {
    setIsLoading(true)
    try {
      const selectedStoreStr = localStorage.getItem('selectedStore')
      if (!selectedStoreStr) return
      const store = JSON.parse(selectedStoreStr)

      const result = await window.api.sales.getAll({
        storeId: store._id || store.id,
        page,
        pageSize,
        search: searchTerm,
        status: statusFilter
      })

      if (result.success) {
        setSales(result.data)
        setTotalRecords(result.total)
        setTotalPages(result.totalPages)
      } else {
        toast.error(result.error || 'Failed to load sales')
      }
    } catch (error: any) {
      console.error('Failed to load sales:', error)
      toast.error('An error occurred while loading sales')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSale) return
    setIsDeleting(true)
    try {
      const result = await window.api.sales.delete(selectedSale._id)
      if (result.success) {
        toast.success('Sale deleted successfully')
        setIsDeleteOpen(false)
        loadSales()
      } else {
        toast.error(result.error || 'Failed to delete sale')
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedSale || !paymentAmount) return

    setIsPaymentSubmitting(true)
    try {
      // Get current user for recordedBy
      const userStr = localStorage.getItem('user')
      const user = userStr ? JSON.parse(userStr) : null

      const result = await window.api.sales.recordPayment(selectedSale._id, {
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
        loadSales()
      } else {
        toast.error(result.error || 'Failed to record payment')
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setIsPaymentSubmitting(false)
    }
  }

  const openPaymentDialog = (sale: any) => {
    setSelectedSale(sale)
    const remaining = sale.totalAmount - (sale.paidAmount || 0)
    setPaymentAmount(remaining.toString())
    setPaymentMethod('Cash')
    setPaymentNotes('')
    setIsPaymentOpen(true)
  }

  const columns = [
    {
      header: 'Sale #',
      accessor: '_id',
      render: (item: any) => (
        <span className="font-mono text-[10px] text-muted-foreground uppercase">
          {item.invoiceNumber || (item._id && item._id.substring(item._id.length - 8))}
        </span>
      )
    },
    {
      header: 'Date',
      accessor: 'createdAt',
      render: (item: any) => format(new Date(item.createdAt), 'MMM dd, yyyy HH:mm')
    },
    {
      header: 'Items',
      accessor: 'items',
      render: (item: any) => (
        <div className="flex flex-col gap-0.5 max-w-[300px]">
          <span className="text-xs text-foreground font-medium truncate">
            {item.items
              ?.map((i: any) => `${i.productName || 'Product'} (${i.quantity})`)
              .join(', ')}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold">
            {item.items?.length || 0} Total Items
          </span>
        </div>
      )
    },
    {
      header: 'Customer',
      accessor: 'customer.name',
      render: (item: any) => (
        <span className="text-muted-foreground">
          {item.customer?.name || (item.paymentStatus === 'PENDING' ? 'Credit' : 'Walk-in')}
        </span>
      )
    },
    {
      header: 'Method',
      accessor: 'paymentMethod',
      render: (item: any) => (
        <span className="text-muted-foreground">
          {item.paymentMethod}
          {item.paymentChannel ? ` (${item.paymentChannel})` : ''}
        </span>
      )
    },
    {
      header: 'Total',
      accessor: 'totalAmount',
      render: (item: any) => (
        <span className="text-[#E8705A] font-bold">Rs. {item.totalAmount?.toLocaleString()}</span>
      )
    },
    {
      header: 'Status',
      accessor: 'paymentStatus',
      render: (item: any) => (
        <Badge
          className={
            item.paymentStatus === 'PAID'
              ? 'bg-[#E8705A]/10 text-[#E8705A] border-[#E8705A]/20'
              : item.paymentStatus === 'PARTIAL'
                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                : 'bg-red-500/10 text-red-500 border-red-500/20'
          }
        >
          {item.paymentStatus}
        </Badge>
      )
    },

    {
      header: 'Actions',
      accessor: '_id',
      render: (item: any) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {item.paymentStatus !== 'PAID' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-accent hover:text-[#E8705A]"
              onClick={() => openPaymentDialog(item)}
            >
              <Wallet className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500"
            onClick={() => {
              setSelectedSale(item)
              setIsDeleteOpen(true)
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <>
      <div className="flex flex-col gap-3 mb-4 px-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            className="bg-[#E8705A] text-white hover:bg-[#D4604C] font-semibold"
            onClick={() => navigate('/dashboard/reports/sales-report')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-background border-border">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Partial">Partial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataPage
        title="Sales Reports"
        description="View and export all transactions recorded by the system."
        data={sales}
        columns={columns}
        searchPlaceholder="Search by invoice # or customer..."
        fileName="sales_history_export"
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
        onSearchChange={(val) => {
          setSearchTerm(val)
          setPage(1)
        }}
        onRowClick={(item) => navigate(`/dashboard/reports/sales/${item._id}`)}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Sale Record?
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground leading-relaxed">
              Are you sure you want to delete sale{' '}
              <strong className="text-foreground">
                #{selectedSale?.invoiceNumber || selectedSale?._id?.substring(0, 8)}
              </strong>
              ?
              <br />
              <br />
              This will{' '}
              <span className="text-red-400 font-semibold uppercase italic">
                reverse the stock levels
              </span>{' '}
              and accounting balances. This action is permanent and cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="border-border text-foreground hover:bg-accent"
            >
              Cancel
            </Button>
            <LoadingButton
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              onClick={handleDelete}
              isLoading={isDeleting}
              loadingText="Deleting..."
            >
              Delete Permanently
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Recording Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#E8705A]" />
              Record Payment
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoice:</span>
                <span className="font-mono font-bold">{selectedSale?.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-mono">Rs. {selectedSale?.totalAmount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Already Paid:</span>
                <span className="font-mono text-green-500">
                  Rs. {selectedSale?.paidAmount?.toLocaleString() || 0}
                </span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>Remaining Balance:</span>
                <span className="font-mono text-red-500">
                  Rs.{' '}
                  {(selectedSale
                    ? selectedSale.totalAmount - (selectedSale.paidAmount || 0)
                    : 0
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amount to Pay</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                    Rs.
                  </span>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="pl-10 font-mono text-lg"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <div
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`
                        cursor-pointer border rounded-lg p-2 text-center text-sm transition-all
                        ${paymentMethod === method
                          ? 'bg-[#E8705A]/10 border-[#E8705A] text-[#E8705A] font-bold'
                          : 'bg-background border-border hover:border-gray-400'
                        }
                      `}
                    >
                      {method}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Enter notes..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              className="bg-[#E8705A] hover:bg-[#D4604C] text-black font-bold"
              onClick={handleRecordPayment}
              isLoading={isPaymentSubmitting}
            >
              Confirm Payment
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
