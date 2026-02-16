import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Calendar, CreditCard, Printer, RotateCcw, User } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { printContent } from '@renderer/lib/print-utils'

interface SaleItem {
  productName?: string
  product?: { name?: string }
  quantity: number
  sellingPrice?: number
  price?: number
  totalAmount: number
  productKind?: 'SIMPLE' | 'RAW_MATERIAL' | 'COMBO_SET'
  baseUnit?: string
  sellByUnit?: string
}

interface PaymentRecord {
  date: string
  amount: number
  method: string
  notes?: string
  recordedBy?: { fullName?: string }
}

interface SaleDetail {
  _id: string
  invoiceNumber?: string
  createdAt: string
  saleDate?: string
  soldBy?: { fullName?: string }
  customer?: { name?: string; phone?: string }
  items: SaleItem[]
  subtotal?: number
  taxAmount?: number
  discountAmount?: number
  totalAmount: number
  paidAmount?: number
  refundedAmount?: number
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL'
  paymentMethod: string
  paymentChannel?: string
  paymentHistory?: PaymentRecord[]
  refundHistory?: Array<{
    date: string
    amount: number
    method: string
    reason?: string
    items: Array<{ product: string; quantity: number; amount: number }>
  }>
}

export default function SalesDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sale, setSale] = useState<SaleDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefundOpen, setIsRefundOpen] = useState(false)
  const [refundMethod, setRefundMethod] = useState('Cash')
  const [refundReason, setRefundReason] = useState('')
  const [refundItems, setRefundItems] = useState<Record<string, number>>({})
  const [isRefunding, setIsRefunding] = useState(false)

  const pendingAmount = useMemo(() => {
    if (!sale) return 0
    return Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0))
  }, [sale])

  const refundedAmount = useMemo(() => {
    if (!sale) return 0
    return Number(sale.refundedAmount || 0)
  }, [sale])

  const netPaidAmount = useMemo(() => {
    if (!sale) return 0
    return Math.max(0, (sale.paidAmount || 0) - refundedAmount)
  }, [sale, refundedAmount])

  const refundableAmount = useMemo(() => {
    if (!sale) return 0
    return Math.max(0, (sale.paidAmount || 0) - refundedAmount)
  }, [sale, refundedAmount])

  const refundedQtyByProduct = useMemo(() => {
    const map = new Map<string, number>()
    sale?.refundHistory?.forEach((record) => {
      record.items?.forEach((item) => {
        const key = String(item.product)
        map.set(key, (map.get(key) || 0) + item.quantity)
      })
    })
    return map
  }, [sale])

  const refundTotal = useMemo(() => {
    if (!sale) return 0
    return sale.items.reduce((sum, item: any) => {
      const qty = refundItems[String(item.product)] || 0
      const price = item.sellingPrice || item.price || 0
      return sum + qty * price
    }, 0)
  }, [refundItems, sale])

  const loadSale = async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const result = await window.api.sales.getById(id)
      if (result.success) {
        setSale(result.data)
      } else {
        toast.error(result.error || 'Sale not found')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load sale')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSale()
  }, [id])

  const statusTone = (status?: SaleDetail['paymentStatus']) => {
    if (status === 'PAID') return 'bg-emerald-500/10 text-emerald-600'
    if (status === 'PARTIAL') return 'bg-amber-500/10 text-amber-600'
    return 'bg-red-500/10 text-red-600'
  }

  const formatCurrency = (value?: number) => `Rs. ${Number(value || 0).toLocaleString()}`

  // Helper to get the correct unit label for a product
  const getUnitLabel = (item: SaleItem) => {
    if (item.productKind === 'RAW_MATERIAL') {
      return item.baseUnit || 'meter'
    }
    return item.baseUnit || 'pcs'
  }

  const handlePrint = () => {
    if (!sale) return
    const content = `
      <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #111;">
        <h2 style="margin: 0 0 8px;">Sale Detail</h2>
        <div style="font-size: 12px; color: #6b7280;">Invoice: ${
          sale.invoiceNumber || sale._id
        }</div>
        <div style="font-size: 12px; color: #6b7280;">Date: ${format(
          new Date(sale.saleDate || sale.createdAt),
          'MMM dd, yyyy HH:mm'
        )}</div>

        <div style="margin-top: 12px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
          <div><strong>Payment:</strong> ${sale.paymentMethod}${
            sale.paymentChannel ? ` (${sale.paymentChannel})` : ''
          }</div>
          <div><strong>Status:</strong> ${sale.paymentStatus}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px;">
          <thead>
            <tr style="background: #f3f4f6; text-align: left;">
              <th style="padding: 8px;">Item</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Price</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items
              .map(
                (item) => `
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px;">${item.productName || item.product?.name || '-'}</td>
                    <td style="padding: 8px; text-align: center;">${item.quantity}</td>
                    <td style="padding: 8px; text-align: right;">${formatCurrency(
                      item.sellingPrice || item.price || 0
                    )}</td>
                    <td style="padding: 8px; text-align: right;">${formatCurrency(
                      item.totalAmount
                    )}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
    void printContent({ title: 'Sale Detail', content })
  }

  const openRefund = () => {
    if (!sale) return
    const defaults: Record<string, number> = {}
    sale.items.forEach((item: any) => {
      defaults[String(item.product)] = 0
    })
    setRefundItems(defaults)
    setRefundReason('')
    setRefundMethod('Cash')
    setIsRefundOpen(true)
  }

  const handleRefund = async () => {
    if (!sale) return
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null
    if (!user) {
      toast.error('User session not found.')
      return
    }

    const items = Object.entries(refundItems)
      .filter(([_, qty]) => qty > 0)
      .map(([product, quantity]) => ({ product, quantity }))

    if (items.length === 0) {
      toast.error('Select at least one item to refund.')
      return
    }

    if (refundTotal > refundableAmount) {
      toast.error('Refund exceeds paid amount.')
      return
    }

    setIsRefunding(true)
    try {
      const result = await window.api.sales.refund(sale._id, {
        refundItems: items,
        method: refundMethod,
        reason: refundReason || undefined,
        processedBy: user._id || user.id
      })

      if (result.success) {
        toast.success('Refund processed successfully')
        setSale(result.data)
        setIsRefundOpen(false)
      } else {
        toast.error(result.error || 'Failed to process refund')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process refund')
    } finally {
      setIsRefunding(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4ade80]"></div>
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-foreground">Sale not found</h2>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-11 w-11 rounded-xl border-border"
            onClick={() => navigate('/dashboard/reports/sales')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Sale Detail</h1>
            <p className="text-sm text-muted-foreground">
              Invoice #{sale.invoiceNumber || sale._id.substring(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${statusTone(sale.paymentStatus)} border-0`}>
            {sale.paymentStatus}
          </Badge>
          <Button
            variant="outline"
            className="border-border"
            onClick={openRefund}
            disabled={refundableAmount <= 0}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Refund
          </Button>
          <Button variant="outline" className="border-border" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border lg:col-span-2">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              Sale Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-[#4ade80]" />
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Date</div>
                  <div className="font-semibold">
                    {format(new Date(sale.saleDate || sale.createdAt), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-[#4ade80]" />
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Sold By</div>
                  <div className="font-semibold">{sale.soldBy?.fullName || 'Admin'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-[#4ade80]" />
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Payment</div>
                  <div className="font-semibold">{sale.paymentMethod}</div>
                  {sale.paymentChannel && (
                    <div className="text-xs text-muted-foreground uppercase">
                      {sale.paymentChannel}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Customer</div>
                <div className="font-semibold">{sale.customer?.name || 'Walk-in'}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="text-xs uppercase text-muted-foreground">Total</div>
                  <div className="text-lg font-black">{formatCurrency(sale.totalAmount)}</div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="text-xs uppercase text-muted-foreground">Paid</div>
                  <div className="text-lg font-black">{formatCurrency(netPaidAmount)}</div>
                  {refundedAmount > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Refunded: {formatCurrency(refundedAmount)}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="text-xs uppercase text-muted-foreground">Pending</div>
                  <div className="text-lg font-black">{formatCurrency(pendingAmount)}</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              Totals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatCurrency(sale.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-semibold">{formatCurrency(sale.taxAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-semibold text-red-500">
                -{formatCurrency(sale.discountAmount)}
              </span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between text-base font-black">
              <span>Total</span>
              <span>{formatCurrency(sale.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Items ({sale.items?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items?.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.productName || item.product?.name || '-'}</TableCell>
                  <TableCell className="text-center">
                    {item.quantity} {getUnitLabel(item)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(item.sellingPrice || item.price || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(item.totalAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.paymentHistory?.length ? (
                sale.paymentHistory.map((record, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{format(new Date(record.date), 'MMM dd, yyyy HH:mm')}</TableCell>
                    <TableCell>{record.method}</TableCell>
                    <TableCell>{record.recordedBy?.fullName || '—'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(record.amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                    No payment records available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Refund History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sale.refundHistory?.length ? (
            <div className="divide-y divide-border">
              {sale.refundHistory.map((record, idx) => (
                <div key={idx} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <RotateCcw className="h-4 w-4 text-red-500" />
                        <span className="font-semibold">
                          {format(new Date(record.date), 'MMM dd, yyyy HH:mm')}
                        </span>
                        <Badge className="bg-red-500/10 text-red-600 border-0 text-xs">
                          {record.method}
                        </Badge>
                      </div>
                      {record.reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium">Reason:</span> {record.reason}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-red-500">
                        -{formatCurrency(record.amount)}
                      </div>
                    </div>
                  </div>

                  {/* Refunded Items */}
                  {record.items && record.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="text-xs uppercase font-semibold text-muted-foreground mb-2">
                        Refunded Items
                      </div>
                      <div className="space-y-1">
                        {record.items.map((item: any, itemIdx: number) => {
                          const saleItem = sale.items.find(
                            (si: any) => String(si.product) === String(item.product)
                          )
                          return (
                            <div
                              key={itemIdx}
                              className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-2"
                            >
                              <span className="text-muted-foreground">
                                {saleItem?.productName ||
                                  saleItem?.product?.name ||
                                  'Unknown Product'}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">
                                  {saleItem?.productKind === 'RAW_MATERIAL' ? 'Meters' : 'Qty'}:{' '}
                                  {item.quantity}
                                </span>
                                <span className="font-semibold">{formatCurrency(item.amount)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-10">
              <RotateCcw className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No refunds recorded.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isRefundOpen} onOpenChange={setIsRefundOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Process Refund</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Select items to refund and specify quantities
            </p>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Refund Progress Indicator */}
            <Card className="border-border bg-muted/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-muted-foreground">Refund Amount</span>
                  <span className="text-lg font-black">
                    {formatCurrency(refundTotal)} / {formatCurrency(refundableAmount)}
                  </span>
                </div>
                <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      refundTotal > refundableAmount
                        ? 'bg-red-500'
                        : refundTotal > 0
                          ? 'bg-[#4ade80]'
                          : 'bg-muted'
                    }`}
                    style={{
                      width: `${Math.min(100, (refundTotal / Math.max(1, refundableAmount)) * 100)}%`
                    }}
                  />
                </div>
                {refundTotal > refundableAmount && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ Refund amount exceeds refundable amount
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Items Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Select Items to Refund
              </h3>
              <div className="space-y-2">
                {sale.items.map((item: any, idx: number) => {
                  const key = String(item.product)
                  const refundedQty = refundedQtyByProduct.get(key) || 0
                  const available = Math.max(0, item.quantity - refundedQty)
                  const currentRefundQty = refundItems[key] || 0
                  const itemRefundAmount = (item.sellingPrice || item.price || 0) * currentRefundQty

                  return (
                    <Card
                      key={idx}
                      className={`border transition-all ${
                        currentRefundQty > 0 ? 'border-[#4ade80] bg-[#4ade80]/5' : 'border-border'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate">
                              {item.productName || item.product?.name}
                            </h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>
                                Sold: {item.quantity} {getUnitLabel(item)}
                              </span>
                              <span>•</span>
                              <span>
                                Available: {available} {getUnitLabel(item)}
                              </span>
                              <span>•</span>
                              <span>
                                Price: {formatCurrency(item.sellingPrice || item.price || 0)}
                              </span>
                            </div>
                            {refundedQty > 0 && (
                              <div className="text-xs text-amber-600 mt-1">
                                Already refunded: {refundedQty} {getUnitLabel(item)}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {currentRefundQty > 0 && (
                              <div className="text-right">
                                <div className="text-sm font-semibold text-[#4ade80]">
                                  {formatCurrency(itemRefundAmount)}
                                </div>
                                <div className="text-xs text-muted-foreground">Refund amount</div>
                              </div>
                            )}
                            <div className="flex flex-col items-end gap-1">
                              <Label className="text-xs text-muted-foreground">
                                {item.productKind === 'RAW_MATERIAL' ? 'Meters' : 'Qty'}
                              </Label>
                              <Input
                                type="number"
                                min={0}
                                max={available}
                                value={refundItems[key] || ''}
                                onChange={(e) => {
                                  const next = Number(e.target.value || 0)
                                  setRefundItems((prev) => ({
                                    ...prev,
                                    [key]: Math.min(available, Math.max(0, next))
                                  }))
                                }}
                                className="w-20 text-center font-semibold"
                                placeholder="0"
                                disabled={available === 0}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Refund Summary */}
            {refundTotal > 0 && (
              <Card className="border-[#4ade80] bg-[#4ade80]/5">
                <CardContent className="p-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3">
                    Refund Summary
                  </h3>
                  <div className="space-y-2">
                    {sale.items
                      .filter((item: any) => {
                        const key = String(item.product)
                        return (refundItems[key] || 0) > 0
                      })
                      .map((item: any, idx: number) => {
                        const key = String(item.product)
                        const qty = refundItems[key]
                        const amount = (item.sellingPrice || item.price || 0) * qty
                        return (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {item.productName || item.product?.name} × {qty} {getUnitLabel(item)}
                            </span>
                            <span className="font-semibold">{formatCurrency(amount)}</span>
                          </div>
                        )
                      })}
                    <div className="border-t border-border pt-2 flex justify-between text-base font-black">
                      <span>Total Refund</span>
                      <span className="text-[#4ade80]">{formatCurrency(refundTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Refund Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">Refund Method *</Label>
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger className="bg-muted border-border mt-1">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">Reason (optional)</Label>
                <Input
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="bg-muted border-border mt-1"
                  placeholder="e.g., Defective product, Wrong size"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsRefundOpen(false)}
              className="border-border"
              disabled={isRefunding}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold"
              onClick={handleRefund}
              disabled={refundTotal <= 0 || refundTotal > refundableAmount || isRefunding}
            >
              {isRefunding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                  Processing...
                </>
              ) : (
                `Process Refund ${formatCurrency(refundTotal)}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
