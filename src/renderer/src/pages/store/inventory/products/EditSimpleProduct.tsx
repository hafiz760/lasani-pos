import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@renderer/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@renderer/components/ui/form'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Save,
  Loader2,
  Package,
  TrendingUp,
  PackagePlus,
  AlertCircle,
  DollarSign,
  Lock,
  Edit
} from 'lucide-react'
import { Separator } from '@renderer/components/ui/separator'
import { Alert, AlertDescription } from '@renderer/components/ui/alert'
import { RestockModal } from '@renderer/components/inventory/restock-modal'
import { SearchableSelect } from '@renderer/components/shared/searchable-select'

const formSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  supplier: z.string().optional(), // ✅ NEW
  description: z.string().optional(),
  buyingPrice: z.string().min(1, 'Buying price is required'),
  sellingPrice: z.string().min(1, 'Selling price is required'),
  stockLevel: z.string().optional(),
  minStockLevel: z.string().optional(),
  color: z.string().optional(),
  fabricType: z.string().optional(),
  pattern: z.string().optional(),
  designNumber: z.string().optional()
})

export default function EditSimpleProduct() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [currentStore, setCurrentStore] = useState<any>(null)
  const [product, setProduct] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [subcategories, setSubcategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([]) // ✅ NEW
  const [currentSupplier, setCurrentSupplier] = useState<any>(null) // ✅ NEW
  const [showRestock, setShowRestock] = useState(false)

  // ✅ Sales check state
  const [hasSales, setHasSales] = useState(false)
  const [salesCount, setSalesCount] = useState(0)
  const [isCheckingSales, setIsCheckingSales] = useState(true)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      sku: '',
      barcode: '',
      category: '',
      subcategory: '',
      brand: '',
      supplier: '', // ✅ NEW
      description: '',
      buyingPrice: '',
      sellingPrice: '',
      stockLevel: '',
      minStockLevel: '5',
      color: '',
      fabricType: '',
      pattern: '',
      designNumber: ''
    }
  })

  useEffect(() => {
    const storeData = localStorage.getItem('selectedStore')
    if (storeData) {
      setCurrentStore(JSON.parse(storeData))
    }
  }, [])

  useEffect(() => {
    if (currentStore?._id && id) {
      loadDropdownData()
      loadProduct()
      checkSales()
    }
  }, [currentStore?._id, id])

  const loadDropdownData = async () => {
    try {
      const [categoriesRes, brandsRes, suppliersRes] = await Promise.all([
        window.api.categories.getAll({ storeId: currentStore._id }),
        window.api.brands.getAll({ storeId: currentStore._id }),
        window.api.suppliers.getAll({ storeId: currentStore._id }) // ✅ NEW
      ])

      if (categoriesRes.success) setCategories(categoriesRes.data)
      if (brandsRes.success) setBrands(brandsRes.data)
      if (suppliersRes.success) setSuppliers(suppliersRes.data) // ✅ NEW
    } catch (error) {
      console.error('Failed to load dropdown data:', error)
    }
  }

  // ✅ Check if product has sales
  const checkSales = async () => {
    if (!id) return
    setIsCheckingSales(true)
    try {
      const result = await window.api.products.checkSales(id)
      if (result.success) {
        setHasSales(result.hasSales)
        setSalesCount(result.salesCount)
      }
    } catch (error) {
      console.error('Failed to check sales:', error)
    } finally {
      setIsCheckingSales(false)
    }
  }

  const loadProduct = async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const result = await window.api.products.getById(id)
      if (result.success) {
        const prod = result.data
        setProduct(prod)

        // ✅ Get supplier from stock entry
        let supplierIdFromStock = ''
        try {
          const stockEntryRes = await window.api.products.getInitialStockEntry(id)
          if (stockEntryRes.success && stockEntryRes.data?.supplier) {
            const supplierData = stockEntryRes.data.supplier
            supplierIdFromStock = typeof supplierData === 'string' ? supplierData : supplierData._id
            setCurrentSupplier(supplierData)
          }
        } catch (error) {
          console.error('Failed to load supplier:', error)
        }

        form.reset({
          name: prod.name || '',
          sku: prod.sku || '',
          barcode: prod.barcode || '',
          category: prod.category?._id || '',
          subcategory: prod.subcategory?._id || '',
          brand: prod.brand?._id || '',
          supplier: supplierIdFromStock, // ✅ NEW
          description: prod.description || '',
          buyingPrice: String(prod.buyingPrice || ''),
          sellingPrice: String(prod.sellingPrice || ''),
          stockLevel: String(prod.stockLevel || ''),
          minStockLevel: String(prod.minStockLevel || 5),
          color: prod.color || '',
          fabricType: prod.fabricType || '',
          pattern: prod.pattern || '',
          designNumber: prod.designNumber || ''
        })

        if (prod.category?._id) {
          loadSubcategories(prod.category._id)
        }
      } else {
        toast.error('Product not found')
        navigate('/dashboard/inventory/products')
      }
    } catch (error) {
      toast.error('Failed to load product')
    } finally {
      setIsLoading(false)
    }
  }

  const loadSubcategories = async (categoryId: string) => {
    const category = categories.find((c) => c._id === categoryId)
    if (category?.subcategories) {
      setSubcategories(category.subcategories)
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentStore?._id || !id) return

    setIsSaving(true)
    try {
      const result = await window.api.products.update(id, {
        storeId: currentStore._id,
        ...values,
        supplier: values.supplier || null, // ✅ NEW
        productKind: 'SIMPLE',
        baseUnit: 'pcs',
        sellByUnit: 'pcs',
        totalMeters: 0,
        metersPerUnit: 0,
        calculatedUnits: 0,
        isComboSet: false,
        totalComboMeters: 0,
        canSellSeparate: false,
        canSellPartialSet: false,
        comboComponents: [],
        twoComponentPrices: [],
        category: values.category || null,
        subcategory: values.subcategory || null,
        brand: values.brand || null
      })

      if (result.success) {
        toast.success('Product updated successfully!')
        navigate(`/dashboard/inventory/products/${id}`)
      } else {
        toast.error(result.error || 'Failed to update product')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update product')
    } finally {
      setIsSaving(false)
    }
  }

  if (!currentStore) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Please select a store first</p>
      </div>
    )
  }

  if (isLoading || isCheckingSales) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4ade80]"></div>
      </div>
    )
  }

  const profitMargin = Number(form.watch('sellingPrice')) - Number(form.watch('buyingPrice'))
  const profitPercentage =
    Number(form.watch('buyingPrice')) > 0
      ? ((profitMargin / Number(form.watch('buyingPrice'))) * 100).toFixed(1)
      : 0

  return (
    <div className="space-y-6">
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
            <h2 className="text-3xl font-bold tracking-tight">Edit Product</h2>
            <p className="text-muted-foreground">Update product details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            📦 Simple Product
          </Badge>
          {hasSales ? (
            <Badge variant="outline" className="text-red-600 border-red-600">
              <Lock className="w-3 h-3 mr-1" />
              Locked
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-600">
              <Edit className="w-3 h-3 mr-1" />
              Editable
            </Badge>
          )}
        </div>
      </div>

      {/* ✅ Status Alert */}
      {hasSales ? (
        <Alert className="border-red-500/50 bg-red-500/10">
          <Lock className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm">
            <strong className="text-red-600">Product Locked</strong> - This product has{' '}
            <strong>{salesCount}</strong> sale transaction(s). Prices and stock cannot be changed.
            Basic information can still be updated. Use <strong>"Add Stock"</strong> button below
            for new purchases.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Edit className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            <strong className="text-amber-600">Full Editing Available</strong> - No sales recorded
            yet. You can freely correct stock quantities, prices, and all other details. Changes
            will update the original purchase record and supplier balance.
          </AlertDescription>
        </Alert>
      )}

      {/* Stock Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Current Stock */}
        <Card
          className={`bg-card border-border ${
            (product?.stockLevel || 0) < (product?.minStockLevel || 5)
              ? 'border-red-500/50 ring-1 ring-red-500/20'
              : hasSales
                ? ''
                : 'border-amber-500/50 ring-1 ring-amber-500/20'
          }`}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
              <Package className="w-3 h-3 text-orange-400" />
              Current Stock
              {!hasSales && (
                <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px]">
                  Editable
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">{product?.stockLevel || 0}</div>
              <span className="text-muted-foreground text-sm">pcs</span>
            </div>
            {(product?.stockLevel || 0) < (product?.minStockLevel || 5) && (
              <div className="flex items-center gap-1 mt-2 text-red-400 text-[10px] font-bold uppercase">
                <AlertCircle className="w-3 h-3" />
                Low stock warning
              </div>
            )}
            {hasSales ? (
              <>
                <p className="text-xs text-muted-foreground mt-2">Locked - use Add Stock below</p>
                <Button
                  size="sm"
                  className="w-full mt-3 bg-[#4ade80] hover:bg-[#22c55e] text-black"
                  onClick={() => setShowRestock(true)}
                >
                  <PackagePlus className="w-3 h-3 mr-2" />
                  Add Stock
                </Button>
              </>
            ) : (
              <p className="text-xs text-amber-600 mt-2 font-medium">✏️ Editable in form below</p>
            )}
          </CardContent>
        </Card>

        {/* Buying Price */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
              <DollarSign className="w-3 h-3 text-blue-400" />
              Cost Price
              {!hasSales && (
                <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px]">
                  Editable
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              Rs. {Number(form.watch('buyingPrice') || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {hasSales ? 'Locked' : 'Can be updated'}
            </p>
          </CardContent>
        </Card>

        {/* Selling Price & Profit */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-[#4ade80]" />
              Retail Price
              {!hasSales && (
                <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px]">
                  Editable
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#4ade80]">
              Rs. {Number(form.watch('sellingPrice') || 0).toLocaleString()}
            </div>
            {profitMargin > 0 && (
              <p className="text-xs text-green-500 font-semibold mt-1">
                +Rs. {profitMargin.toLocaleString()} ({profitPercentage}% margin)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Summer T-Shirt" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU *</FormLabel>
                    <FormControl>
                      <Input placeholder="PRD-12345" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">Unique product identifier</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional barcode" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <SearchableSelect
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        loadSubcategories(value)
                        form.setValue('subcategory', '')
                      }}
                      options={categories.map((cat) => ({
                        label: cat.name,
                        value: cat._id
                      }))}
                      placeholder="Select category"
                      emptyText="No categories found"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory</FormLabel>
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={subcategories.map((sub) => ({
                        label: sub.name,
                        value: sub._id
                      }))}
                      placeholder="Select subcategory"
                      emptyText="No subcategories"
                      disabled={!subcategories.length}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={brands.map((brand) => ({
                        label: brand.name,
                        value: brand._id
                      }))}
                      placeholder="Select brand"
                      emptyText="No brands found"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ✅ NEW: Supplier Field - Only show if no sales */}
              {!hasSales ? (
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Supplier
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px]">
                          Editable
                        </Badge>
                      </FormLabel>
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={suppliers.map((sup) => ({
                          label: sup.name,
                          value: sup._id
                        }))}
                        placeholder="Select supplier"
                        emptyText="No suppliers found"
                      />
                      <FormDescription className="text-xs">
                        Correct supplier if wrong. Balance will be automatically adjusted.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                currentSupplier && (
                  <div className="p-3 bg-muted rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Supplier (Locked)</p>
                    <p className="text-sm font-medium">
                      {typeof currentSupplier === 'string'
                        ? currentSupplier
                        : currentSupplier.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-red-500 mt-1">🔒 Cannot be changed after sales</p>
                  </div>
                )
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Product description..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Pricing & Stock */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Pricing & Stock
                {hasSales && (
                  <Badge variant="outline" className="ml-2 text-red-600 border-red-600">
                    <Lock className="w-3 h-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="buyingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buying Price (per piece) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        disabled={hasSales}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {hasSales ? '🔒 Locked - sales exist' : '✏️ Cost price from supplier'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price (per piece) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        disabled={hasSales}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {hasSales ? '🔒 Locked - sales exist' : '✏️ Retail price for customers'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ✅ Stock Level - Editable only if no sales */}
              {!hasSales && (
                <FormField
                  control={form.control}
                  name="stockLevel"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="flex items-center gap-2">
                        Stock Quantity (pieces) *
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px]">
                          Editable
                        </Badge>
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Correct any mistakes in initial stock. Supplier balance will be
                        automatically adjusted.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {profitMargin > 0 && (
                <div className="md:col-span-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-600">Profit per Unit:</span>
                    <span className="text-lg font-bold text-green-600">
                      Rs. {profitMargin.toLocaleString()} ({profitPercentage}%)
                    </span>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="minStockLevel"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Minimum Stock Alert Level</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="5" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Get notified when stock falls below this level
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Blue, Red" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fabricType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fabric Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Cotton, Polyester" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pattern</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 1-piece, 2-piece" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="designNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Design Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., D-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 border-t border-border rounded-lg">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Restock Modal */}
      <RestockModal
        open={showRestock}
        onOpenChange={setShowRestock}
        product={product}
        currentStore={currentStore}
        onSuccess={() => {
          loadProduct()
          checkSales()
          setShowRestock(false)
        }}
      />
    </div>
  )
}
