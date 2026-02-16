import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@renderer/components/ui/button'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Form } from '@renderer/components/ui/form'
import { Alert, AlertDescription } from '@renderer/components/ui/alert'
import { ChevronRight, Edit, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { BasicInformation } from '@renderer/components/inventory/product-form/basic-information'
import { ClothDetails } from '@renderer/components/inventory/product-form/cloth-details'
import { SupplierInventorySection } from '@renderer/components/inventory/product-form/supplier-inventory-section'

const formSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  sku: z.string().min(2, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  brand: z.string().optional().or(z.literal('')),
  barcode: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  unit: z.string().optional().or(z.literal('pcs')),
  color: z.string().optional().or(z.literal('')),
  fabricType: z.string().optional().or(z.literal('')),
  pattern: z.string().optional().or(z.literal('')),
  designNumber: z.string().optional().or(z.literal('')),
  supplier: z.string().min(1, 'Supplier is required'),
  buyingPrice: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number().min(0.01, 'Buying price is required and must be greater than 0')
  ),
  sellingPrice: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number().min(0.01, 'Selling price is required and must be greater than 0')
  ),
  initialQuantity: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number().int().min(1, 'Quantity is required and must be at least 1')
  )
})

export default function EditSimpleProduct() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [currentStore, setCurrentStore] = useState<any>(null)
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
  const [product, setProduct] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasSales, setHasSales] = useState(false)
  const [salesCount, setSalesCount] = useState(0)
  const [isCheckingSales, setIsCheckingSales] = useState(true)

  const form = useForm<any>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      sku: '',
      category: '',
      brand: '',
      barcode: '',
      description: '',
      unit: 'pcs',
      color: '',
      fabricType: '',
      pattern: '',
      designNumber: '',
      supplier: '',
      initialQuantity: '',
      buyingPrice: '',
      sellingPrice: ''
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
      loadInitialData()
      loadProduct()
      checkSales()
    }
  }, [currentStore?._id, id])

  const loadInitialData = async () => {
    if (!currentStore?._id) return
    try {
      const [catsRes, brandsRes, attrsRes] = await Promise.all([
        window.api.categories.getAll({ storeId: currentStore._id }),
        window.api.brands.getAll({ storeId: currentStore._id }),
        window.api.attributes.getAll({ storeId: currentStore._id })
      ])
      if (catsRes.success) setCategories(catsRes.data)
      if (brandsRes.success) setBrands(brandsRes.data)
      if (attrsRes.success) {
        const attrs = attrsRes.data
        setAttributes({
          fabricTypes: attrs.filter((a) => a.type === 'FABRIC'),
          productTypes: attrs.filter((a) => a.type === 'OTHER'),
          pieceCounts: attrs.filter((a) => a.type === 'PIECE_COUNT'),
          patterns: attrs.filter((a) => a.type === 'PATTERN'),
          collections: attrs.filter((a) => a.type === 'COLLECTION'),
          colors: attrs.filter((a) => a.type === 'COLOR'),
          sizes: attrs.filter((a) => a.type === 'SIZE')
        })
      }
    } catch (error) {
      console.error('Failed to load initial data:', error)
    }
  }

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

        const normalizeId = (value: any) => {
          if (!value) return ''
          if (typeof value === 'string') return value === '[object Object]' ? '' : value
          if (typeof value === 'object' && value.$oid) return String(value.$oid)
          if (typeof value === 'object' && value.id) return String(value.id)
          if (typeof value === 'object' && value._id?.$oid) return String(value._id.$oid)
          if (typeof value === 'object' && value._id) return String(value._id)
          if (typeof value.toString === 'function') return String(value.toString())
          const stringValue = String(value)
          return stringValue === '[object Object]' ? '' : stringValue
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

        const existingSupplierValue = form.getValues('supplier')
        form.reset({
          name: prod.name || '',
          sku: prod.sku || '',
          category: prod.category?._id || '',
          brand: prod.brand?._id || '',
          barcode: prod.barcode || '',
          description: prod.description || '',
          unit: prod.sellByUnit || prod.baseUnit || 'pcs',
          color: prod.color || '',
          fabricType: prod.fabricType || '',
          pattern: prod.pattern || '',
          designNumber: prod.designNumber || '',
          supplier: supplierIdFromStock || existingSupplierValue || '',
          initialQuantity: String(prod.stockLevel || ''),
          buyingPrice: String(prod.buyingPrice || ''),
          sellingPrice: String(prod.sellingPrice || '')
        })
        if (supplierIdFromStock) {
          form.setValue('supplier', supplierIdFromStock)
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

  const onSubmit = async (values: any) => {
    if (!currentStore?._id || !id) return

    setIsSaving(true)
    try {
      const result = await window.api.products.update(id, {
        storeId: currentStore._id,
        ...values,
        supplier: values.supplier || null,
        productKind: 'SIMPLE',
        baseUnit: values.unit || 'pcs',
        sellByUnit: values.unit || 'pcs',
        stockLevel: values.initialQuantity || 0,
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
        brand: values.brand || null,
        images: product?.images || []
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/dashboard/inventory/products" className="hover:text-foreground">
          Products
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-semibold">Edit Product</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Simple Product</h1>
          <p className="text-muted-foreground mt-1">Update product sold by piece/unit.</p>
        </div>
      </div>

      {hasSales ? (
        <Alert className="border-red-500/50 bg-red-500/10">
          <Lock className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm">
            <strong className="text-red-600">Product Locked</strong> - This product has{' '}
            <strong>{salesCount}</strong> sale transaction(s). Prices, quantity, and supplier are
            locked.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Edit className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            <strong className="text-amber-600">Full Editing Available</strong> - No sales recorded
            yet. You can edit quantity, pricing, and supplier details.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" autoComplete="off">
          <BasicInformation
            form={form}
            categories={categories}
            brands={brands}
            productKind="SIMPLE"
          />
          <ClothDetails form={form} attributes={attributes} productKind="SIMPLE" />
          <SupplierInventorySection
            form={form}
            currentStore={currentStore}
            productKind="SIMPLE"
            productId={id}
            disablePricing={hasSales}
            disableQuantity={hasSales}
            disableSupplier={hasSales}
          />

          <div className="border rounded-lg p-4 bg-blue-500/10 border-blue-500/20">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              💡 <strong>Note:</strong> Simple products are tracked by piece/unit.
            </p>
          </div>

          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/dashboard/inventory/products/${id}`)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <LoadingButton type="submit" isLoading={isSaving}>
              Save Changes
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  )
}
