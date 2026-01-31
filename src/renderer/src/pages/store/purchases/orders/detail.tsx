import { useEffect, useState } from 'react'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@renderer/components/ui/alert-dialog'
import {
  Printer,
  ChevronLeft,
  Calendar,
  Truck,
  CreditCard,
  FileText,
  CheckCircle2,
  XCircle,
  Edit
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Separator } from '@renderer/components/ui/separator'
import { toast } from 'sonner'

export default function PurchaseOrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReceiving, setIsReceiving] = useState(false)
  const [isUnreceiving, setIsUnreceiving] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const loadOrder = async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const result = await window.api.purchaseOrders.getById(id)
      if (result.success) {
        setOrder(result.data)
      } else {
        toast.error('Order not found')
      }
    } catch (error) {
      toast.error('Failed to load order details')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrder()
  }, [id])

  const handleReceive = async () => {
    if (!order) return
    setIsReceiving(true)
    try {
      const result = await window.api.purchaseOrders.update(order._id, {
        status: 'RECEIVED',
        receivedAt: new Date()
      })
      if (result.success) {
        toast.success('Purchase order marked as received')
        loadOrder()
      } else {
        toast.error('Error: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setIsReceiving(false)
    }
  }

  const handleUnreceive = async () => {
    if (!order) return
    setIsUnreceiving(true)
    try {
      const result = await window.api.purchaseOrders.update(order._id, {
        status: 'ORDERED',
        receivedAt: null
      })
      if (result.success) {
        toast.success('Purchase order status reverted to Ordered')
        loadOrder()
      } else {
        toast.error('Error: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setIsUnreceiving(false)
      setIsConfirmOpen(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4ade80]"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-foreground">Order not found</h2>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'ORDERED':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'PARTIAL':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-accent"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                PO-{order.poNumber}
              </h2>
              <Badge variant="outline" className={`${getStatusColor(order.status)} px-3 py-1`}>
                {order.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
              <Calendar className="w-3 h-3" />
              Ordered on {format(new Date(order.purchaseDate || order.createdAt), 'PPP')}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handlePrint} className="border-border hover:bg-accent">
            <Printer className="w-4 h-4 mr-2" />
            Print PO
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/purchases/orders/${order._id}/edit`)}
            className="border-border hover:bg-accent"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Order
          </Button>
          {order.status !== 'RECEIVED' && (
            <Button
              onClick={handleReceive}
              disabled={isReceiving}
              className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isReceiving ? 'Marking...' : 'Mark as Received'}
            </Button>
          )}
          {order.status === 'RECEIVED' && (
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(true)}
              className="border-red-500/50 text-red-500 hover:bg-red-500/10"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Unreceive PO
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 bg-card border-border text-foreground">
          <CardHeader className="border-b border-border py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#4ade80]" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium text-right">Qty</th>
                    <th className="px-4 py-3 font-medium text-right">Cost</th>
                    <th className="px-4 py-3 font-medium text-right">Retail</th>
                    <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {order.items.map((item: any, index: number) => (
                    <tr key={index} className="hover:bg-accent/30">
                      <td className="px-4 py-4">
                        <div className="font-medium text-foreground">
                          {item.product?.name || 'Unknown Product'}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase">
                          SKU: {item.product?.sku || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono">
                        {item.quantity} {item.product?.unit || 'pcs'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        Rs. {(item.unitCost || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        Rs. {(item.sellingPrice || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-[#4ade80]">
                        Rs. {(item.totalCost || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card border-border text-foreground">
            <CardHeader className="border-b border-border py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                Supplier Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Supplier Name</Label>
                <div className="text-foreground font-bold text-lg">{order.supplier?.name}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Contact Person</Label>
                <div className="text-foreground">{order.supplier?.contactPerson || 'N/A'}</div>
              </div>
              {order.receivedAt && (
                <div>
                  <Label className="text-green-500 text-xs uppercase font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Received At
                  </Label>
                  <div className="text-green-500 font-medium">
                    {format(new Date(order.receivedAt), 'PPP p')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border text-foreground overflow-hidden">
            <CardHeader className="bg-muted/50 border-b border-border py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#4ade80]" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rs. {(order.subtotal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>Rs. {(order.taxAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground text-red-400 font-medium">Discount</span>
                <span className="text-red-400">
                  - Rs. {(order.discountAmount || 0).toLocaleString()}
                </span>
              </div>
              <Separator className="bg-border" />
              <div className="flex justify-between items-center py-2">
                <span className="font-bold">Total Amount</span>
                <span className="text-2xl font-black text-[#4ade80]">
                  Rs. {(order.totalAmount || 0).toLocaleString()}
                </span>
              </div>
              <Separator className="bg-border" />
              <div className="pt-2">
                <div className="flex justify-between text-sm font-bold text-green-500">
                  <span>Paid Amount</span>
                  <span>Rs. {(order.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-orange-400 mt-1">
                  <span>Due Balance</span>
                  <span>Rs. {(order.totalAmount - (order.paidAmount || 0)).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="bg-background border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revert the status to "Ordered" and remove it from inventory. Stock levels
              added by this order will be deducted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnreceive}
              disabled={isUnreceiving}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isUnreceiving ? 'Reverting...' : 'Yes, Revert'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`block text-sm font-medium ${className}`}>{children}</div>
}
