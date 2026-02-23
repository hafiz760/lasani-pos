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
import { Badge } from '@renderer/components/ui/badge'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, PackagePlus, Lock, Edit } from 'lucide-react'
import { Alert, AlertDescription } from '@renderer/components/ui/alert'
import { RestockModal } from '@renderer/components/inventory/restock-modal'
import { SupplierInventorySection } from '@renderer/components/inventory/product-form/supplier-inventory-section'
import { BasicInformation } from '@renderer/components/inventory/product-form/basic-information'
import { ClothDetails } from '@renderer/components/inventory/product-form/cloth-details'

const formSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  supplier: z.string().optional(), // ✅ NEW
  description: z.string().optional(),
  buyingPrice: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number().min(0.01, 'Buying price per meter is required')
  ),
  sellingPrice: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number().min(0.01, 'Selling price per meter is required')
  ),
  totalMeters: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number().min(0, 'Total meters must be 0 or more').optional()
  ),
  metersPerUnit: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number().min(0, 'Meters per unit must be 0 or more').optional()
  ),
  minStockLevel: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number().min(0, 'Minimum stock must be 0 or more').optional()
  ),
  color: z.string().optional(),
  fabricType: z.string().optional(),
  pattern: z.string().optional(),
  designNumber: z.string().optional()
})

export default function EditRawMaterialProduct() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [currentStore, setCurrentStore] = useState<any>(null)
  const [product, setProduct] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [attributes, setAttributes] = useState<any>({
    fabricTypes: [],
    productTypes: [],
    pieceCounts: [],
    patterns: [],
    collections: [],
    colors: [],
    sizes: []
  })
  const [showRestock, setShowRestock] = useState(false)

  // ✅ Sales check state
  const [hasSales, setHasSales] = useState(false)
  const [salesCount, setSalesCount] = useState(0)
  const [isCheckingSales, setIsCheckingSales] = useState(true)

  const form = useForm<any>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      sku: '',
      barcode: '',
      category: '',
      brand: '',
      supplier: '', // ✅ NEW
      description: '',
      buyingPrice: 0,
      sellingPrice: 0,
      totalMeters: 0,
      metersPerUnit: 0,
      minStockLevel: 5,
      color: '',
      fabricType: '',
      pattern: '',
      designNumber: ''
    }
  })

  const metersPerUnit = form.watch('metersPerUnit')
  const totalMeters = form.watch('totalMeters')
  const calculatedUnits =
    metersPerUnit && totalMeters && Number(metersPerUnit) > 0
      ? Math.floor(Number(totalMeters) / Number(metersPerUnit))
      : 0

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
      const [categoriesRes, brandsRes, attrsRes] = await Promise.all([
        window.api.categories.getAll({ storeId: currentStore._id }),
        window.api.brands.getAll({ storeId: currentStore._id }),
        window.api.attributes.getAll({ storeId: currentStore._id })
      ])

      if (categoriesRes.success) setCategories(categoriesRes.data)
      if (brandsRes.success) setBrands(brandsRes.data)
      if (attrsRes.success) {
        const attrs = attrsRes.data
        setAttributes({
          fabricTypes: attrs.filter((a: any) => a.type === 'FABRIC'),
          productTypes: attrs.filter((a: any) => a.type === 'OTHER'),
          pieceCounts: attrs.filter((a: any) => a.type === 'PIECE_COUNT'),
          patterns: attrs.filter((a: any) => a.type === 'PATTERN'),
          collections: attrs.filter((a: any) => a.type === 'COLLECTION'),
          colors: attrs.filter((a: any) => a.type === 'COLOR'),
          sizes: attrs.filter((a: any) => a.type === 'SIZE')
        })
      }
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
        const normalizeId = (value: any) => {
          if (!value) return ''
          if (typeof value === 'string') return value
          if (typeof value === 'object' && value.$oid) return String(value.$oid)
          if (typeof value === 'object' && value._id) return String(value._id)
          if (typeof value.toString === 'function') return String(value.toString())
          return ''
        }

        let supplierIdFromStock = ''
        try {
          const stockEntryRes = await window.api.products.getInitialStockEntry(id)
          if (stockEntryRes.success && stockEntryRes.data?.supplier) {
            const supplierData = stockEntryRes.data.supplier
            supplierIdFromStock = normalizeId(supplierData)
          }
        } catch (error) {
          console.error('Failed to load supplier:', error)
        }

        if (!supplierIdFromStock) {
          try {
            const supplierRes = await window.api.suppliers.getByProductId({
              storeId: currentStore._id,
              productId: id
            })
            if (supplierRes.success && supplierRes.data?._id) {
              supplierIdFromStock = normalizeId(supplierRes.data._id)
            }
          } catch (error) {
            console.error('Failed to resolve supplier by product id:', error)
          }
        }

        form.reset({
          name: prod.name || '',
          sku: prod.sku || '',
          barcode: prod.barcode || '',
          category: prod.category?._id || '',
          brand: prod.brand?._id || '',
          supplier: supplierIdFromStock, // ✅ NEW
          description: prod.description || '',
          buyingPrice: prod.buyingPrice || 0,
          sellingPrice: prod.sellingPrice || 0,
          totalMeters: prod.totalMeters || 0,
          metersPerUnit: prod.metersPerUnit || 0,
          minStockLevel: prod.minStockLevel || 5,
          color: prod.color || '',
          fabricType: prod.fabricType || '',
          pattern: prod.pattern || '',
          designNumber: prod.designNumber || ''
        })
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentStore?._id || !id) return

    setIsSaving(true)
    try {
      const metersPerUnitNum = Number(values.metersPerUnit) || 0
      const totalMetersNum = Number(values.totalMeters) || 0

      const result = await window.api.products.update(id, {
        storeId: currentStore._id,
        ...values,
        supplier: values.supplier || null,
        totalMeters: totalMetersNum,
        metersPerUnit: metersPerUnitNum,
        productKind: 'RAW_MATERIAL',
        baseUnit: 'meter',
        sellByUnit: 'meter',
        stockLevel: totalMetersNum,
        calculatedUnits: metersPerUnitNum > 0 ? Math.floor(totalMetersNum / metersPerUnitNum) : 0,
        isComboSet: false,
        totalComboMeters: 0,
        canSellSeparate: false,
        canSellPartialSet: false,
        comboComponents: [],
        twoComponentPrices: [],
        category: values.category || null,
        brand: values.brand || null
      })

      if (result.success) {
        toast.success('Raw material product updated successfully!')
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8705A]"></div>
      </div>
    )
  }

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
            <h2 className="text-3xl font-bold tracking-tight">Edit Raw Material</h2>
            <p className="text-muted-foreground">Update fabric/raw material details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            📏 Fabric/Raw Material
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
            <strong className="text-red-600">Product Locked</strong> - This fabric has{' '}
            <strong>{salesCount}</strong> sale transaction(s). Prices and meters cannot be changed.
            Basic information can still be updated. Use <strong>"Add Meters"</strong> button below
            for new purchases.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Edit className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            <strong className="text-amber-600">Full Editing Available</strong> - No sales recorded
            yet. You can freely correct total meters, prices per meter, and all other details.
            Changes will update the original purchase record and supplier balance.
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <BasicInformation
            form={form}
            categories={categories}
            brands={brands}
            productKind="RAW_MATERIAL"
          />

          <ClothDetails form={form} attributes={attributes} productKind="RAW_MATERIAL" />

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-amber-600">Raw Material Stock</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="totalMeters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Meters *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        min="0"
                        disabled={hasSales}
                        className="bg-muted border-border h-12"
                        placeholder="e.g., 120"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {hasSales
                        ? 'Locked - add meters using restock'
                        : 'Total available meters in stock'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="metersPerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meters per Suit (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        min="0"
                        className="bg-muted border-border h-12"
                        placeholder="e.g., 4"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Used only for reference when estimating suits.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minStockLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Stock Alert (meters)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        className="bg-muted border-border h-12"
                        placeholder="5"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {calculatedUnits > 0 && (
                <div className="md:col-span-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-sm text-amber-600 font-semibold">
                    📏 Current stock can make approximately {calculatedUnits} suits
                  </p>
                </div>
              )}
              {hasSales && (
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => setShowRestock(true)}
                  >
                    <PackagePlus className="w-4 h-4 mr-2" />
                    Add Meters
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Description</h2>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Fabric description..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <SupplierInventorySection
            form={form}
            currentStore={currentStore}
            productKind="RAW_MATERIAL"
            productId={id}
            disablePricing={hasSales}
            disableQuantity={hasSales}
            disableSupplier={hasSales}
          />

          <div className="border rounded-lg p-4 bg-blue-500/10 border-blue-500/20">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              💡 <strong>Note:</strong> Raw materials are tracked by meters.
            </p>
          </div>
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
              className="bg-[#E8705A] hover:bg-[#D4604C] text-black font-semibold"
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
