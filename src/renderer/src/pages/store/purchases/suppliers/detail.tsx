import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { ChevronRight, Package, Mail, Phone, ArrowLeft, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@renderer/components/ui/badge'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'

export default function SupplierDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [payments, setPayments] = useState<any[]>([])
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false)

  useEffect(() => {
    loadSupplier()
  }, [id])

  useEffect(() => {
    if (!supplier?._id) return
    loadPayments()
  }, [supplier?._id])

  const loadSupplier = async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const result = await window.api.suppliers.getById(id)
      if (result.success) {
        setSupplier(result.data)
      } else {
        toast.error('Failed to load supplier: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Failed to load supplier: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPayments = async () => {
    if (!supplier?.store || !supplier?.name) return
    setIsPaymentsLoading(true)
    try {
      const result = await window.api.expenses.getAll({
        storeId: supplier.store,
        page: 1,
        pageSize: 5000,
        search: `Supplier payment: ${supplier.name}`
      })
      if (result.success) {
        const filtered = (result.data || []).filter(
          (expense) =>
            expense.category === 'Supplier Payment' &&
            String(expense.description || '').includes(`Supplier payment: ${supplier.name}`)
        )
        setPayments(filtered)
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load supplier payments')
    } finally {
      setIsPaymentsLoading(false)
    }
  }

  // ✅ Helper function to get unit label
  const getStockUnit = (product: any) => {
    if (product.productKind === 'RAW_MATERIAL') {
      return 'meters'
    } else if (product.productKind === 'COMBO_SET') {
      return 'sets'
    } else {
      return 'pcs'
    }
  }

  // ✅ Helper function to format stock display
  const formatStock = (product: any) => {
    const stock = product.stockLevel || 0
    const unit = getStockUnit(product)

    // For raw materials, show decimal if needed
    if (product.productKind === 'RAW_MATERIAL') {
      return `${stock.toFixed(1)} ${unit}`
    }

    return `${stock} ${unit}`
  }

  const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Loading supplier details...</p>
        </div>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Supplier not found</p>
          <Button onClick={() => navigate('/dashboard/purchases/suppliers')}>
            Back to Suppliers
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/dashboard/purchases/suppliers" className="hover:text-foreground">
          Suppliers
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-semibold">{supplier.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{supplier.name}</h1>
          <p className="text-muted-foreground mt-1">Supplier Information and Products</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/purchases/suppliers')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to List
        </Button>
      </div>

      {/* Supplier Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            Contact Information
          </h2>
          <div className="space-y-3">
            {supplier.contactPerson && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground min-w-[80px]">
                  Contact:
                </span>
                <span className="text-sm">{supplier.contactPerson}</span>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span className="text-sm">{supplier.phone}</span>
              </div>
            )}
            {supplier.email && (
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span className="text-sm">{supplier.email}</span>
              </div>
            )}
            {supplier.city && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground min-w-[80px]">
                  City:
                </span>
                <span className="text-sm">{supplier.city}</span>
              </div>
            )}
            {supplier.address && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground min-w-[80px]">
                  Address:
                </span>
                <span className="text-sm">{supplier.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Balance Information */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Financial Information
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Opening Balance:</span>
              <span className="text-sm font-medium">
                Rs. {(supplier.openingBalance || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Balance:</span>
              <span
                className={`text-lg font-bold ${
                  supplier.currentBalance > 0 ? 'text-red-400' : 'text-[#4ade80]'
                }`}
              >
                Rs. {(supplier.currentBalance || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Statistics</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Products:</span>
              <Badge variant="secondary" className="text-base">
                {supplier.products?.length || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={supplier.isActive ? 'default' : 'destructive'}>
                {supplier.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Products from this Supplier</h2>
          <p className="text-sm text-muted-foreground mt-1">
            All products purchased from {supplier.name}
          </p>
        </div>

        {supplier.products && supplier.products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                    Product
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">SKU</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                    Category
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                    Brand
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                    Buying Price
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                    Stock
                  </th>
                </tr>
              </thead>
              <tbody>
                {supplier.products.map((product: any) => (
                  <tr
                    key={product._id}
                    className="border-b border-border hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/dashboard/inventory/products/${product._id}`)}
                  >
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{product.name}</span>
                        {/* ✅ Show product type badge */}
                        {product.productKind === 'RAW_MATERIAL' && (
                          <span className="text-xs text-amber-600 mt-1">📏 Raw Material</span>
                        )}
                        {product.productKind === 'COMBO_SET' && (
                          <span className="text-xs text-purple-600 mt-1">🎁 Combo Set</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-mono text-muted-foreground uppercase">
                        {product.sku}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{product.category?.name || 'N/A'}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{product.brand?.name || 'No Brand'}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-blue-600">
                          Rs. {(product.buyingPrice || 0).toLocaleString()}
                        </span>
                        {/* ✅ Show price unit */}
                        <span className="text-xs text-muted-foreground">
                          per{' '}
                          {product.productKind === 'RAW_MATERIAL'
                            ? 'meter'
                            : product.productKind === 'COMBO_SET'
                              ? 'set'
                              : 'piece'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      {/* ✅ Dynamic stock display with correct unit */}
                      <Badge
                        variant={
                          (product.stockLevel || 0) < (product.minStockLevel || 5)
                            ? 'destructive'
                            : product.productKind === 'RAW_MATERIAL'
                              ? 'outline'
                              : 'secondary'
                        }
                        className={
                          product.productKind === 'RAW_MATERIAL'
                            ? 'border-amber-500 text-amber-600'
                            : ''
                        }
                      >
                        {formatStock(product)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No products from this supplier yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Products will appear here when you add them with this supplier selected
            </p>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="p-6 border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Supplier Payment History</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Payments recorded against this supplier balance
              </p>
            </div>
            <div className="text-sm font-semibold text-foreground">
              Total Paid: Rs. {totalPaid.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-6">
          <ScrollArea className="max-h-[420px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPaymentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Loading payments...
                    </TableCell>
                  </TableRow>
                ) : payments.length > 0 ? (
                  payments.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell>
                        {payment.expenseDate
                          ? new Date(payment.expenseDate).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell className="text-foreground font-medium">
                        {payment.description || 'Supplier payment'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payment.account?.accountName || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-border text-muted-foreground uppercase text-[10px]"
                        >
                          {payment.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-500">
                        -Rs. {payment.amount?.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No supplier payments recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
