import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { ChevronRight, Package, Ruler } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@renderer/components/ui/form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { Input } from '@renderer/components/ui/input'
import { BasicInformation } from '@renderer/components/inventory/product-form/basic-information'
import { ClothDetails } from '@renderer/components/inventory/product-form/cloth-details'
import { SupplierInventorySection } from '@renderer/components/inventory/product-form/supplier-inventory-section'

const createProductSchema = z
  .object({
    productKind: z.enum(['SIMPLE', 'RAW_MATERIAL']).default('SIMPLE'),
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
    size: z.string().optional().or(z.literal('')),
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
      z.number().int().min(1, 'Quantity is required and must be at least 1').optional()
    ),
    totalMeters: z.preprocess(
      (val) => (val === '' || val === undefined ? undefined : Number(val)),
      z.number().min(0, 'Meters must be 0 or more').optional()
    ),
    metersPerUnit: z.preprocess(
      (val) => (val === '' || val === undefined ? undefined : Number(val)),
      z.number().min(0, 'Meters per unit must be 0 or more').optional()
    )
  })
  .superRefine((values, ctx) => {
    if (values.productKind === 'SIMPLE' && !values.initialQuantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Quantity is required and must be at least 1',
        path: ['initialQuantity']
      })
    }
    if (values.productKind === 'RAW_MATERIAL' && values.totalMeters === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Total meters is required for raw material',
        path: ['totalMeters']
      })
    }
  })

export default function CreateProductPage() {
  const navigate = useNavigate()
  const [currentStore, setCurrentStore] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dynamic attributes
  const [attributes, setAttributes] = useState<any>({
    fabricTypes: [],
    productTypes: [],
    pieceCounts: [],
    patterns: [],
    collections: [],
    colors: [],
    sizes: []
  })

  useEffect(() => {
    const storeData = localStorage.getItem('selectedStore')
    if (storeData) {
      setCurrentStore(JSON.parse(storeData))
    }
  }, [])

  const defaultValues = {
    productKind: 'SIMPLE',
    name: '',
    sku: `PRD-${Date.now()}`,
    category: '',
    brand: '',
    barcode: '',
    description: '',
    unit: 'pcs',
    color: '',
    fabricType: '',
    pattern: '',
    size: '',
    designNumber: '',
    supplier: '',
    initialQuantity: '',
    totalMeters: '',
    metersPerUnit: '',
    buyingPrice: '',
    sellingPrice: ''
  }

  const form = useForm<any>({
    resolver: zodResolver(createProductSchema) as any,
    defaultValues: defaultValues as any
  })

  const productKind = form.watch('productKind') || 'SIMPLE'

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

  useEffect(() => {
    loadInitialData()
  }, [currentStore?._id])

  const onSubmit = async (values: any) => {
    if (!currentStore?._id) {
      toast.error('No store selected')
      return
    }
    setIsSubmitting(true)
    try {
      let productData: any = {
        ...values,
        store: currentStore._id,
        brand: values.brand || null,
        productKind,
        buyingPrice: values.buyingPrice || 0,
        sellingPrice: values.sellingPrice || 0,
        minStockLevel: 5,
        supplier: values.supplier !== 'none' && values.supplier ? values.supplier : null
      }

      if (productKind === 'SIMPLE') {
        productData.baseUnit = values.unit || 'pcs'
        productData.sellByUnit = values.unit || 'pcs'
        productData.initialQuantity = values.initialQuantity || 0
      } else {
        productData.totalMeters = values.totalMeters || 0
        productData.metersPerUnit = values.metersPerUnit || 0
      }

      console.log('Submitting product data:', productData)

      const result = await window.api.products.create(productData)

      if (result.success) {
        toast.success('Product created successfully!')
        navigate('/dashboard/inventory/products')
      } else {
        toast.error('Error: ' + result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPageTitle = () =>
    productKind === 'RAW_MATERIAL' ? 'Add Raw Material' : 'Add Simple Product'

  const getPageDescription = () =>
    productKind === 'RAW_MATERIAL'
      ? 'Add product tracked by meters.'
      : 'Add product sold by piece/unit.'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/dashboard/inventory/products" className="hover:text-foreground">
          Products
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-semibold">Add Product</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{getPageTitle()}</h1>
          <p className="text-muted-foreground mt-1">{getPageDescription()}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" autoComplete="off">
          <div className="rounded-xl border border-emerald-500/20  p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Product Type</h2>
                <p className="text-xs text-muted-foreground">
                  Choose how this product is tracked in inventory.
                </p>
              </div>
            </div>
            <FormField
              control={form.control}
              name="productKind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        value: 'SIMPLE',
                        label: 'Simple',
                        helper: 'Pieces/Units',
                        icon: Package,
                        accent: 'emerald'
                      },
                      {
                        value: 'RAW_MATERIAL',
                        label: 'Raw Material',
                        helper: 'Meters',
                        icon: Ruler,
                        accent: 'amber'
                      }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all ${
                          field.value === option.value
                            ? option.accent === 'emerald'
                              ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]'
                              : 'border-amber-400 bg-amber-500/10 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]'
                            : 'border-border bg-background hover:border-emerald-300/60 hover:bg-muted/40'
                        }`}
                      >
                        <div
                          className={`absolute inset-x-0 top-0 h-1 ${
                            option.accent === 'emerald'
                              ? 'bg-gradient-to-r from-emerald-400 to-emerald-200'
                              : 'bg-gradient-to-r from-amber-400 to-amber-200'
                          } ${field.value === option.value ? 'opacity-100' : 'opacity-0'} transition-opacity`}
                        />
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                              field.value === option.value
                                ? option.accent === 'emerald'
                                  ? 'border-emerald-300 bg-emerald-500/10 text-emerald-600'
                                  : 'border-amber-300 bg-amber-500/10 text-amber-600'
                                : 'border-border text-muted-foreground group-hover:text-foreground'
                            }`}
                          >
                            <option.icon className="h-5 w-5" />
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              {option.label}
                            </div>
                            <div className="text-xs text-muted-foreground">{option.helper}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <BasicInformation
            form={form}
            categories={categories}
            brands={brands}
            productKind={productKind}
          />
          <ClothDetails form={form} attributes={attributes} productKind={productKind} />
          {productKind === 'RAW_MATERIAL' && (
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
                          min="0"
                          step="0.1"
                          className="bg-muted border-border h-12"
                          placeholder="e.g., 120"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="metersPerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meters per Unit</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.1"
                          className="bg-muted border-border h-12"
                          placeholder="Optional"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
          <SupplierInventorySection
            form={form}
            currentStore={currentStore}
            productKind={productKind}
          />
          <div className="border rounded-lg p-4 bg-blue-500/10 border-blue-500/20">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              💡 <strong>Note:</strong>{' '}
              {productKind === 'RAW_MATERIAL'
                ? 'Raw materials are tracked by meters.'
                : 'Simple products are tracked by piece/unit.'}
            </p>
          </div>
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/inventory/products')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <LoadingButton type="submit" isLoading={isSubmitting}>
              Create Product
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  )
}
