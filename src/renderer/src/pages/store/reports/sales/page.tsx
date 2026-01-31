'use client'

import { useState, useEffect } from 'react'
import { DataPage } from '@renderer/components/shared/data-page'
import { Badge } from '@renderer/components/ui/badge'
import { format } from 'date-fns'
import { Eye, Trash2, Printer, MoreVertical } from 'lucide-react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { printContent } from '@renderer/lib/print-utils'
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

const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer']

export default function SalesReportsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSale, setSelectedSale] = useState<any>(null)
  console.log(selectedSale)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
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
        if (isDetailsOpen) {
          if (selectedSale._id === result.data._id) setSelectedSale(result.data)
        }
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
      header: 'Total',
      accessor: 'totalAmount',
      render: (item: any) => (
        <span className="text-[#4ade80] font-bold">Rs. {item.totalAmount?.toLocaleString()}</span>
      )
    },
    {
      header: 'Status',
      accessor: 'paymentStatus',
      render: (item: any) => (
        <Badge
          className={
            item.paymentStatus === 'PAID'
              ? 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20'
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
      header: 'Seller',
      accessor: 'soldBy.fullName',
      render: (item: any) => (
        <span className="text-muted-foreground capitalize">{item.soldBy?.fullName || 'Admin'}</span>
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
            {item.paymentStatus !== 'PAID' && (
              <DropdownMenuItem
                onClick={() => openPaymentDialog(item)}
                className="focus:bg-[#4ade80] focus:text-black cursor-pointer font-medium"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Record Payment
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                setSelectedSale(item)
                setIsDetailsOpen(true)
              }}
              className="focus:bg-[#4ade80] focus:text-black cursor-pointer"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedSale(item)
                setIsDeleteOpen(true)
              }}
              className="focus:bg-red-500 focus:text-white cursor-pointer text-red-500 hover:text-white transition-colors"
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
      <div className="flex justify-end mb-4 px-1">
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
      />

      {/* Sale Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <span>
                Sale Details: #{selectedSale?.invoiceNumber || selectedSale?._id?.substring(0, 8)}
              </span>
              <Badge className="bg-[#4ade80] text-black uppercase">
                {selectedSale?.paymentStatus}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Date</p>
                  <p className="font-semibold">
                    {format(new Date(selectedSale.createdAt), 'MMMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Seller</p>
                  <p className="font-semibold">{selectedSale.soldBy?.fullName || 'Admin'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Customer</p>
                  <p className="font-semibold">{selectedSale.customerName || 'Walk-in Customer'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">
                    Payment Method
                  </p>
                  <p className="font-semibold">{selectedSale.paymentMethod}</p>
                </div>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-center">Qty</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedSale.items?.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-2">{item.productName || item.product?.name}</td>
                        <td className="px-4 py-2 text-center">{item.quantity}</td>
                        <td className="px-4 py-2 text-right font-mono">
                          Rs. {(item.sellingPrice || item.price).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right font-bold font-mono">
                          Rs. {item.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 text-right text-sm border-t border-border pt-4">
                <div className="flex justify-between px-4">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono">
                    Rs.{' '}
                    {selectedSale.subtotal?.toLocaleString() ||
                      selectedSale.totalAmount?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between px-4">
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="font-mono">
                    Rs. {selectedSale.taxAmount?.toLocaleString() || 0}
                  </span>
                </div>
                {selectedSale.discountAmount > 0 && (
                  <div className="flex justify-between px-4 text-red-500">
                    <span>Discount:</span>
                    <span className="font-mono">
                      -Rs. {selectedSale.discountAmount.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between px-4 text-lg font-bold border-t border-border pt-2 mt-2">
                  <span className="text-foreground">Total:</span>
                  <span className="text-[#4ade80] font-mono">
                    Rs. {selectedSale.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDetailsOpen(false)}
              className="border-border text-foreground hover:bg-accent"
            >
              Close
            </Button>
            <Button
              className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold"
              onClick={() => {
                if (!selectedSale) return
                const content = `
                                <div style="font-family: 'Courier New', Courier, monospace; padding: 20px; text-align: center; color: #000; background: #fff;">
                                    <div style="border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 20px;">
                                        <h2 style="font-size: 24px; font-weight: bold; margin: 0;">ShopPOS RECEIPT</h2>
                                        <p style="margin: 5px 0;">123 Market Street, City</p>
                                        <p style="margin: 5px 0;">Tel: +123 456 789</p>
                                    </div>

                                    <div style="text-align: left; margin-bottom: 20px; font-size: 14px;">
                                        <p style="margin: 2px 0;"><strong>Invoice:</strong> ${
                                          selectedSale.invoiceNumber ||
                                          selectedSale._id
                                            .substring(selectedSale._id.length - 8)
                                            .toUpperCase()
                                        }</p>
                                        <p style="margin: 2px 0;"><strong>Date:</strong> ${format(
                                          new Date(selectedSale.createdAt),
                                          'MMM dd, yyyy HH:mm'
                                        )}</p>
                                        <p style="margin: 2px 0;"><strong>Seller:</strong> ${selectedSale.soldBy?.fullName || 'Admin'}</p>
                                        ${
                                          selectedSale.customerName
                                            ? `<p style="margin: 2px 0;"><strong>Customer:</strong> ${selectedSale.customerName}</p>`
                                            : ''
                                        }
                                    </div>

                                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                                        <thead>
                                            <tr style="border-bottom: 1px solid #000;">
                                                <th style="text-align: left; padding: 5px 0;">Item</th>
                                                <th style="text-align: center;">Qty</th>
                                                <th style="text-align: right;">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        ${selectedSale.items
                                          .map(
                                            (item: any) => `
                                            <tr>
                                                <td style="text-align: left; padding: 5px 0;">${
                                                  item.productName || item.product?.name
                                                }</td>
                                                <td style="text-align: center;">${item.quantity}</td>
                                                <td style="text-align: right;">Rs.${item.totalAmount.toLocaleString()}</td>
                                            </tr>
                                        `
                                          )
                                          .join('')}
                                        </tbody>
                                    </table>

                                    <div style="border-top: 2px dashed #000; padding-top: 10px; font-size: 16px;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                            <span>Subtotal:</span>
                                            <span>Rs. ${selectedSale.subtotal?.toLocaleString() || selectedSale.totalAmount?.toLocaleString()}</span>
                                        </div>
                                        ${
                                          selectedSale.discountAmount > 0
                                            ? `
                                        <div style="display: flex; justify-content: space-between; color: #000;">
                                            <span>Discount:</span>
                                            <span>-Rs. ${selectedSale.discountAmount.toLocaleString()}</span>
                                        </div>
                                        `
                                            : ''
                                        }
                                        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 20px; margin-top: 10px; border-top: 1px solid #000; padding-top: 10px;">
                                            <span>TOTAL:</span>
                                            <span>Rs. ${selectedSale.totalAmount.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div style="margin-top: 40px; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px;">
                                        <p>Thank you for your purchase!</p>
                                        <p>Software by Antigravity</p>
                                    </div>
                                </div>
                            `
                printContent({ title: 'Receipt', content })
              }}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Wallet className="w-5 h-5 text-[#4ade80]" />
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
                        ${
                          paymentMethod === method
                            ? 'bg-[#4ade80]/10 border-[#4ade80] text-[#4ade80] font-bold'
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
              className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold"
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
