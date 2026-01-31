import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import {
  ArrowLeft,
  Package,
  Tag,
  History,
  TrendingUp,
  AlertCircle,
  Edit3,
  ArrowUpCircle,
  ArrowDownCircle,
  PackagePlus
} from 'lucide-react'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { toast } from 'sonner'
import { RestockModal } from '@renderer/components/inventory/restock-modal'

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showRestock, setShowRestock] = useState(false)
  const [currentStore, setCurrentStore] = useState<any>(null)
  const [inventoryHistory, setInventoryHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  useEffect(() => {
    const storeData = localStorage.getItem('selectedStore')
    if (storeData) {
      setCurrentStore(JSON.parse(storeData))
    }
  }, [])

  // ✅ Helper functions for stock units
  const getStockUnit = () => {
    if (!product) return 'pcs'
    if (product.productKind === 'RAW_MATERIAL') return 'meters'
    if (product.productKind === 'COMBO_SET') return 'sets'
    return 'pcs'
  }

  const formatStock = (stock: number) => {
    const unit = getStockUnit()
    if (product?.productKind === 'RAW_MATERIAL') {
      return `${stock.toFixed(1)} ${unit}`
    }
    return `${stock} ${unit}`
  }

  const getProductTypeLabel = () => {
    if (!product) return 'Simple Product'
    if (product.productKind === 'RAW_MATERIAL') return 'Raw Material (Fabric)'
    if (product.productKind === 'COMBO_SET') return 'Combo Set'
    return 'Simple Product'
  }

  const getProductTypeBadge = () => {
    if (!product) return null
    if (product.productKind === 'RAW_MATERIAL') {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
          📏 Fabric/Raw Material
        </Badge>
      )
    }
    if (product.productKind === 'COMBO_SET') {
      return (
        <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
          🎁 Combo Set
        </Badge>
      )
    }
    return (
      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">📦 Simple Product</Badge>
    )
  }

  // ✅ Format date/time for history
  const formatDateTime = (date: string) => {
    const d = new Date(date)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // ✅ Load product details
  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return
      setIsLoading(true)
      try {
        const result = await window.api.products.getById(id)
        if (result.success) {
          setProduct(result.data)
        } else {
          toast.error('Product not found')
        }
      } catch (error) {
        toast.error('Failed to load product details')
      } finally {
        setIsLoading(false)
      }
    }
    loadProduct()
  }, [id])

  // ✅ Load inventory history
  useEffect(() => {
    const loadInventoryHistory = async () => {
      if (!id || !currentStore?._id) return
      setIsLoadingHistory(true)
      try {
        const result = await window.api.inventory.getHistory({
          productId: id,
          storeId: currentStore._id,
          limit: 20
        })
        if (result.success) {
          setInventoryHistory(result.data || [])
        }
      } catch (error) {
        console.error('Failed to load inventory history:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    loadInventoryHistory()
  }, [id, currentStore?._id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4ade80]"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-foreground mb-2">Product not found</h2>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  const profitMargin = product.sellingPrice - product.buyingPrice
  const profitPercentage =
    product.buyingPrice > 0 ? ((profitMargin / product.buyingPrice) * 100).toFixed(1) : 0

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-accent"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">{product.name}</h2>
              {getProductTypeBadge()}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Badge
                variant="outline"
                className="border-border text-[10px] uppercase text-muted-foreground"
              >
                {product.category?.name}
              </Badge>
              {product.subcategory && (
                <Badge
                  variant="outline"
                  className="border-[#4ade80]/30 bg-[#4ade80]/5 text-[10px] uppercase text-[#4ade80]"
                >
                  {product.subcategory?.name}
                </Badge>
              )}
              <span>•</span>
              <span>SKU: {product.sku}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-border hover:bg-accent text-foreground"
            onClick={() => {
              // Navigate to appropriate edit page based on product type
              if (product.productKind === 'RAW_MATERIAL') {
                navigate(`/dashboard/inventory/products/${product._id}/edit-raw`)
              } else if (product.productKind === 'COMBO_SET') {
                navigate(`/dashboard/inventory/products/${product._id}/edit-combo`)
              } else {
                navigate(`/dashboard/inventory/products/${product._id}/edit`)
              }
            }}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Product
          </Button>

          <Button
            className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold"
            onClick={() => setShowRestock(true)}
          >
            <PackagePlus className="w-4 h-4 mr-2" />
            Quick Restock
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Selling Price */}
        <Card className="bg-card border-border text-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-[#4ade80]" />
              Selling Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#4ade80]">
              Rs. {(product.sellingPrice || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              per{' '}
              {product.productKind === 'RAW_MATERIAL'
                ? 'meter'
                : product.productKind === 'COMBO_SET'
                  ? 'set'
                  : 'piece'}
            </p>
          </CardContent>
        </Card>

        {/* Cost Price */}
        <Card className="bg-card border-border text-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
              <Tag className="w-3 h-3 text-blue-400" />
              Cost Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              Rs. {(product.buyingPrice || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              per{' '}
              {product.productKind === 'RAW_MATERIAL'
                ? 'meter'
                : product.productKind === 'COMBO_SET'
                  ? 'set'
                  : 'piece'}
            </p>
            {profitMargin > 0 && (
              <p className="text-xs text-green-500 font-semibold mt-1">
                +Rs. {profitMargin.toLocaleString()} ({profitPercentage}% margin)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stock */}
        <Card
          className={`bg-card border-border text-foreground ${
            (product.stockLevel || 0) < (product.minStockLevel || 5)
              ? 'border-red-500/50 ring-1 ring-red-500/20'
              : ''
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
              <Package className="w-3 h-3 text-orange-400" />
              Available Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">
                {product.productKind === 'RAW_MATERIAL'
                  ? (product.stockLevel || 0).toFixed(1)
                  : product.stockLevel || 0}
              </div>
              <span className="text-muted-foreground text-sm">{getStockUnit()}</span>
            </div>
            {(product.stockLevel || 0) < (product.minStockLevel || 5) && (
              <div className="flex items-center gap-1 mt-1 text-red-400 text-[10px] font-bold uppercase">
                <AlertCircle className="w-3 h-3" />
                Low stock warning
              </div>
            )}
            {/* Show reference info for raw materials */}
            {product.productKind === 'RAW_MATERIAL' && product.metersPerUnit > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                ≈ {Math.floor((product.stockLevel || 0) / product.metersPerUnit)} suits @{' '}
                {product.metersPerUnit}m/suit
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-8 space-y-6">
          {/* Product Images */}
          {product.images && product.images.length > 0 && (
            <Card className="bg-card border-border text-foreground overflow-hidden">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-2">
                  <div className="bg-muted/50 p-6 flex items-center justify-center border-r border-border min-h-[400px]">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="max-h-[350px] w-auto object-contain rounded-lg shadow-2xl drop-shadow-2xl transition-transform hover:scale-105 duration-500"
                    />
                  </div>
                  <div className="p-6 space-y-4 bg-card/50">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Product Gallery
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      {product.images.map((img: string, i: number) => (
                        <div
                          key={i}
                          className={`aspect-square rounded-md border-2 overflow-hidden cursor-pointer transition-all hover:border-[#4ade80] ${
                            i === 0 ? 'border-[#4ade80]' : 'border-border'
                          }`}
                        >
                          <img
                            src={img}
                            alt={`View ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Product Specifications */}
          <Card className="bg-card border-border text-foreground">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2">
                Product Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                <div className="grid grid-cols-3 p-4">
                  <span className="text-muted-foreground text-sm font-medium">Product Type</span>
                  <span className="col-span-2 text-sm text-foreground font-semibold">
                    {getProductTypeLabel()}
                  </span>
                </div>
                <div className="grid grid-cols-3 p-4">
                  <span className="text-muted-foreground text-sm font-medium">Brand</span>
                  <span className="col-span-2 text-sm text-foreground">
                    {product.brand?.name || 'No Brand'}
                  </span>
                </div>
                <div className="grid grid-cols-3 p-4">
                  <span className="text-muted-foreground text-sm font-medium">Model / SKU</span>
                  <span className="col-span-2 text-sm text-foreground font-mono uppercase">
                    {product.sku}
                  </span>
                </div>

                {/* Raw Material Specific Fields */}
                {product.productKind === 'RAW_MATERIAL' && (
                  <>
                    <div className="grid grid-cols-3 p-4 bg-amber-500/5">
                      <span className="text-muted-foreground text-sm font-medium">
                        Total Meters
                      </span>
                      <span className="col-span-2 text-sm text-amber-600 font-semibold">
                        {(product.totalMeters || 0).toFixed(1)} meters
                      </span>
                    </div>
                    {product.metersPerUnit > 0 && (
                      <div className="grid grid-cols-3 p-4">
                        <span className="text-muted-foreground text-sm font-medium">
                          Meters Per Suit
                        </span>
                        <span className="col-span-2 text-sm text-foreground">
                          {product.metersPerUnit} meters (reference)
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Combo Set Specific Fields */}
                {product.productKind === 'COMBO_SET' && product.comboComponents && (
                  <>
                    <div className="grid grid-cols-3 p-4 bg-purple-500/5">
                      <span className="text-muted-foreground text-sm font-medium">Components</span>
                      <div className="col-span-2 space-y-1">
                        {product.comboComponents.map((comp: any, idx: number) => (
                          <div key={idx} className="text-sm text-foreground">
                            • {comp.name} - {comp.meters}m
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 p-4">
                      <span className="text-muted-foreground text-sm font-medium">
                        Total Meters
                      </span>
                      <span className="col-span-2 text-sm text-purple-600 font-semibold">
                        {(product.totalComboMeters || 0).toFixed(1)} meters
                      </span>
                    </div>
                  </>
                )}

                {product.fabricType && (
                  <div className="grid grid-cols-3 p-4">
                    <span className="text-muted-foreground text-sm font-medium">Fabric Type</span>
                    <span className="col-span-2 text-sm text-foreground">{product.fabricType}</span>
                  </div>
                )}
                {product.productType && (
                  <div className="grid grid-cols-3 p-4">
                    <span className="text-muted-foreground text-sm font-medium">Product Type</span>
                    <span className="col-span-2 text-sm text-foreground">
                      {product.productType}
                    </span>
                  </div>
                )}
                {product.pieceCount && (
                  <div className="grid grid-cols-3 p-4">
                    <span className="text-muted-foreground text-sm font-medium">Piece Count</span>
                    <span className="col-span-2 text-sm text-foreground">{product.pieceCount}</span>
                  </div>
                )}
                {product.pattern && (
                  <div className="grid grid-cols-3 p-4">
                    <span className="text-muted-foreground text-sm font-medium">Pattern</span>
                    <span className="col-span-2 text-sm text-foreground">{product.pattern}</span>
                  </div>
                )}
                {product.collectionName && (
                  <div className="grid grid-cols-3 p-4">
                    <span className="text-muted-foreground text-sm font-medium">Collection</span>
                    <span className="col-span-2 text-sm text-foreground">
                      {product.collectionName}
                    </span>
                  </div>
                )}
                {product.designNumber && (
                  <div className="grid grid-cols-3 p-4">
                    <span className="text-muted-foreground text-sm font-medium">Design #</span>
                    <span className="col-span-2 text-sm text-foreground">
                      {product.designNumber}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-3 p-4">
                  <span className="text-muted-foreground text-sm font-medium">Description</span>
                  <span className="col-span-2 text-sm text-muted-foreground leading-relaxed">
                    {product.description || 'No description provided for this product.'}
                  </span>
                </div>
                {product.barcode && (
                  <div className="grid grid-cols-3 p-4">
                    <span className="text-muted-foreground text-sm font-medium">Barcode</span>
                    <span className="col-span-2 text-sm text-foreground font-mono">
                      {product.barcode}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-3 p-4">
                  <span className="text-muted-foreground text-sm font-medium">
                    Minimum Stock Alert
                  </span>
                  <span className="col-span-2 text-sm text-foreground">
                    {product.minStockLevel || 5} {getStockUnit()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Inventory History */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-card border-border text-foreground overflow-hidden">
            <CardHeader className="bg-muted/50 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-orange-400" />
                Inventory History
              </CardTitle>
              <CardDescription className="text-xs">Recent stock movements</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {isLoadingHistory ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4ade80] mx-auto"></div>
                    <p className="text-xs text-muted-foreground mt-2">Loading history...</p>
                  </div>
                ) : inventoryHistory.length > 0 ? (
                  <div className="p-4 space-y-4">
                    {inventoryHistory.map((entry: any, idx: number) => (
                      <div
                        key={entry._id || idx}
                        className="border-l-2 border-muted pl-3 pb-3 hover:border-[#4ade80] transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          {/* Icon based on entry type */}
                          {entry.entryType === 'INITIAL_STOCK' || entry.entryType === 'RESTOCK' ? (
                            <ArrowUpCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : entry.entryType === 'ADJUSTMENT' ? (
                            <Package className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          ) : entry.entryType === 'RETURN' ? (
                            <ArrowUpCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <ArrowDownCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          )}

                          <div className="flex-1 space-y-1">
                            {/* Header with type and quantity */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold capitalize">
                                {entry.entryType.replace('_', ' ')}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[9px] border-green-500/20 bg-green-500/10 text-green-600"
                              >
                                +
                                {entry.unit === 'meter'
                                  ? entry.quantity.toFixed(1)
                                  : entry.quantity}{' '}
                                {entry.unit}
                              </Badge>
                            </div>

                            {/* Supplier info */}
                            {entry.supplier && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Package className="w-3 h-3" />
                                <span className="font-medium">
                                  {typeof entry.supplier === 'object'
                                    ? entry.supplier.name
                                    : 'Supplier'}
                                </span>
                              </div>
                            )}

                            {/* Cost info */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-blue-600 font-semibold">
                                Rs. {entry.buyingPrice.toLocaleString()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                per {entry.unit}
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-amber-600 font-semibold">
                                Total: Rs. {entry.totalCost.toLocaleString()}
                              </span>
                            </div>

                            {/* Date */}
                            <p className="text-[10px] text-muted-foreground">
                              {formatDateTime(entry.createdAt)}
                            </p>

                            {/* Notes */}
                            {entry.notes && (
                              <p className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded mt-1">
                                {entry.notes}
                              </p>
                            )}

                            {/* Invoice number if exists */}
                            {entry.invoiceNumber && (
                              <p className="text-xs text-blue-500 font-mono bg-blue-500/5 px-2 py-0.5 rounded inline-block mt-1">
                                Invoice: {entry.invoiceNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-2">
                    <History className="w-12 h-12 mx-auto text-muted-foreground/50" />
                    <p className="text-muted-foreground text-sm">No history yet</p>
                    <p className="text-xs text-muted-foreground">
                      Stock movements will appear here
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Restock Modal */}
      <RestockModal
        open={showRestock}
        onOpenChange={setShowRestock}
        product={product}
        currentStore={currentStore}
        onSuccess={() => {
          // Reload product to update stock display
          if (id) {
            window.api.products.getById(id).then((result) => {
              if (result.success) setProduct(result.data)
            })
          }
          // Reload history
          if (id && currentStore?._id) {
            window.api.inventory
              .getHistory({
                productId: id,
                storeId: currentStore._id,
                limit: 20
              })
              .then((result) => {
                if (result.success) setInventoryHistory(result.data || [])
              })
          }
        }}
      />
    </div>
  )
}
