import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Calendar, CreditCard, Printer, RotateCcw, User } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
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
    // A refund is possible as long as there are items that haven't been fully returned
    const totalItems = sale.items.reduce((sum, i) => sum + i.quantity, 0)
    const refundedItems = sale.refundHistory?.reduce((sum, h) =>
      sum + h.items.reduce((s, i) => s + i.quantity, 0), 0) || 0
    return totalItems - refundedItems
  }, [sale])



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
        <div style="font-size: 12px; color: #6b7280;">Invoice: ${sale.invoiceNumber || sale._id
      }</div>
        <div style="font-size: 12px; color: #6b7280;">Date: ${format(
        new Date(sale.saleDate || sale.createdAt),
        'MMM dd, yyyy HH:mm'
      )}</div>

        <div style="margin-top: 12px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
          <div><strong>Payment:</strong> ${sale.paymentMethod}${sale.paymentChannel ? ` (${sale.paymentChannel})` : ''
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


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8705A]"></div>
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
            onClick={() => navigate(`/dashboard/reports/sales/${sale._id}/refund`)}
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
                <Calendar className="h-5 w-5 text-[#E8705A]" />
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Date</div>
                  <div className="font-semibold">
                    {format(new Date(sale.saleDate || sale.createdAt), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-[#E8705A]" />
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Sold By</div>
                  <div className="font-semibold">{sale.soldBy?.fullName || 'Admin'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-[#E8705A]" />
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

    </div>
  )
}
