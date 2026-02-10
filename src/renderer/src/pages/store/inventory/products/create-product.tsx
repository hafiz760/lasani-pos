import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@renderer/components/ui/form'
import { ProductTypeSelector } from '@renderer/components/inventory/product-form/product-type-selector'
import { ProductImages } from '@renderer/components/inventory/product-form/product-images'
import { BasicInformation } from '@renderer/components/inventory/product-form/basic-information'
import { RawMaterialConfig } from '@renderer/components/inventory/product-form/raw-material-config'
import { ComboSetConfig } from '@renderer/components/inventory/product-form/combo-set-config'
import { ClothDetails } from '@renderer/components/inventory/product-form/cloth-details'
import { SupplierInventorySection } from '@renderer/components/inventory/product-form/supplier-inventory-section'

// Dynamic schema based on product type
const createProductSchema = (productKind: string) => {
  const baseSchema = {
    name: z.string().min(2, 'Product name is required'),
    sku: z.string().min(2, 'SKU is required'),
    category: z.string().min(1, 'Category is required'),
    subcategory: z.string().optional().or(z.literal('')),
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
    )
  }

  if (productKind === 'SIMPLE') {
    return z.object({
      ...baseSchema,
      initialQuantity: z.preprocess(
        (val) => (val === '' || val === undefined ? undefined : Number(val)),
        z.number().int().min(1, 'Quantity is required and must be at least 1')
      )
    })
  }

  if (productKind === 'RAW_MATERIAL') {
    return z.object({
      ...baseSchema,
      totalMeters: z.preprocess(
        (val) => (val === '' || val === undefined ? undefined : Number(val)),
        z.number().min(0.1, 'Total meters is required and must be at least 0.1')
      ),
      metersPerUnit: z.preprocess(
        (val) => (val === '' || val === undefined ? 0 : Number(val)),
        z.number().min(0, 'Meters per unit must be 0 or greater').optional()
      )
    })
  }

  if (productKind === 'COMBO_SET') {
    return z.object({
      ...baseSchema,
      initialQuantity: z.preprocess(
        (val) => (val === '' || val === undefined ? undefined : Number(val)),
        z.number().int().min(1, 'Quantity is required and must be at least 1')
      ),
      canSellSeparate: z.boolean().default(true),
      canSellPartialSet: z.boolean().default(true),
      components: z
        .array(
          z.object({
            name: z.string().min(1, 'Component name is required'),
            meters: z.preprocess(
              (val) => (val === '' || val === undefined ? undefined : Number(val)),
              z.number().min(0.1, 'Meters must be at least 0.1')
            )
          })
        )
        .min(2, 'At least 2 components required')
    })
  }

  return z.object(baseSchema)
}

export default function CreateProductPage() {
  const navigate = useNavigate()
  const [currentStore, setCurrentStore] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  // Product Type Selection
  const [productKind, setProductKind] = useState<'SIMPLE' | 'RAW_MATERIAL' | 'COMBO_SET'>('SIMPLE')

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

  // Dynamic form initialization
  const getDefaultValues = () => {
    const base = {
      name: '',
      sku: `${productKind === 'RAW_MATERIAL' ? 'RAW' : productKind === 'COMBO_SET' ? 'COMBO' : 'PRD'}-${Date.now()}`,
      category: '',
      subcategory: '',
      brand: '',
      barcode: '',
      description: '',
      unit: productKind === 'SIMPLE' ? 'pcs' : 'set',
      color: '',
      fabricType: '',
      pattern: '',
      size: '',
      designNumber: '',
      supplier: '',
      initialQuantity: '',
      buyingPrice: '',
      sellingPrice: ''
    }

    if (productKind === 'RAW_MATERIAL') {
      return { ...base, totalMeters: '', metersPerUnit: 4 }
    }

    if (productKind === 'COMBO_SET') {
      return {
        ...base,
        canSellSeparate: true,
        canSellPartialSet: true,
        components: [
          { name: 'Dupatta', meters: 2.5 },
          { name: 'Shalwar', meters: 2.5 },
          { name: 'Qameez', meters: 2.5 }
        ]
      }
    }

    return base
  }

  const form = useForm({
    resolver: zodResolver(createProductSchema(productKind)),
    defaultValues: getDefaultValues()
  })

  // Reset form when product type changes
  useEffect(() => {
    form.reset(getDefaultValues())
  }, [productKind])

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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const onSubmit = async (values: any) => {
    if (!currentStore?._id) {
      toast.error('No store selected')
      return
    }
    setIsSubmitting(true)
    try {
      // Upload images
      const uploadedUrls: string[] = []
      for (const file of selectedFiles) {
        try {
          const base64Data = await fileToBase64(file)
          const uploadRes = await window.api.app.uploadImage({
            base64Data,
            fileName: file.name
          })
          if (uploadRes.success) {
            uploadedUrls.push(uploadRes.url)
          }
        } catch (err) {
          console.error('Failed to upload file:', file.name, err)
        }
      }

      // Build product data based on type
      let productData: any = {
        ...values,
        store: currentStore._id,
        images: uploadedUrls,
        brand: values.brand || null,
        subcategory: values.subcategory || null,
        productKind,
        buyingPrice: values.buyingPrice || 0,
        sellingPrice: values.sellingPrice || 0,
        minStockLevel: 5,
        supplier: values.supplier !== 'none' && values.supplier ? values.supplier : null
      }

      // Type-specific data
      if (productKind === 'SIMPLE') {
        productData.baseUnit = values.unit || 'pcs'
        productData.sellByUnit = values.unit || 'pcs'
        productData.initialQuantity = values.initialQuantity || 0
      } else if (productKind === 'RAW_MATERIAL') {
        productData.baseUnit = 'meter'
        productData.sellByUnit = 'meter'
        productData.totalMeters = values.totalMeters || 0
        productData.metersPerUnit = values.metersPerUnit || 0
        // Don't send initialQuantity for raw materials
      } else if (productKind === 'COMBO_SET') {
        productData.baseUnit = 'set'
        productData.sellByUnit = 'set'
        productData.isComboSet = true
        productData.initialQuantity = values.initialQuantity || 0
        productData.comboComponents = values.components.map((comp: any) => ({
          name: comp.name,
          meters: comp.meters,
          buyingPrice: 0,
          sellingPrice: 0,
          stockLevel: 0
        }))
        productData.totalComboMeters = values.components.reduce(
          (sum: number, comp: any) => sum + (comp.meters || 0),
          0
        )
        productData.canSellSeparate = values.canSellSeparate
        productData.canSellPartialSet = values.canSellPartialSet
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

  const getPageTitle = () => {
    switch (productKind) {
      case 'RAW_MATERIAL':
        return 'Add Raw Material (Fabric)'
      case 'COMBO_SET':
        return 'Add Combo Set Product'
      default:
        return 'Add Simple Product'
    }
  }

  const getPageDescription = () => {
    switch (productKind) {
      case 'RAW_MATERIAL':
        return 'Add fabric/cloth sold by meter. Stock tracked in meters.'
      case 'COMBO_SET':
        return 'Create multi-piece sets (e.g., 3-piece Ladies Suit).'
      default:
        return 'Add product sold by piece/unit.'
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/dashboard/inventory/products" className="hover:text-foreground">
          Products
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-semibold">Add Product</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{getPageTitle()}</h1>
          <p className="text-muted-foreground mt-1">{getPageDescription()}</p>
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" autoComplete="off">
          {/* Product Type Selector */}
          <ProductTypeSelector value={productKind} onChange={setProductKind} />

          {/* Type-Specific Configuration */}
          {productKind === 'RAW_MATERIAL' && <RawMaterialConfig form={form} />}
          {productKind === 'COMBO_SET' && <ComboSetConfig form={form} />}

          {/* Product Images */}
          <ProductImages
            imagePreviews={imagePreviews}
            setImagePreviews={setImagePreviews}
            setSelectedFiles={setSelectedFiles}
          />

          {/* Basic Information */}
          <BasicInformation
            form={form}
            categories={categories}
            brands={brands}
            productKind={productKind}
          />

          {/* Cloth Details */}
          <ClothDetails form={form} attributes={attributes} productKind={productKind} />

          {/* Supplier & Pricing - FOR ALL TYPES */}
          <SupplierInventorySection
            form={form}
            currentStore={currentStore}
            productKind={productKind}
          />

          {/* Info Box */}
          <div
            className={`border rounded-lg p-4 ${
              productKind === 'RAW_MATERIAL'
                ? 'bg-amber-500/10 border-amber-500/20'
                : productKind === 'COMBO_SET'
                  ? 'bg-purple-500/10 border-purple-500/20'
                  : 'bg-blue-500/10 border-blue-500/20'
            }`}
          >
            <p
              className={`text-sm ${
                productKind === 'RAW_MATERIAL'
                  ? 'text-amber-700 dark:text-amber-400'
                  : productKind === 'COMBO_SET'
                    ? 'text-purple-700 dark:text-purple-400'
                    : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              💡 <strong>Note:</strong>{' '}
              {productKind === 'RAW_MATERIAL'
                ? 'Raw material is tracked and sold by meter. Stock level = total meters.'
                : productKind === 'COMBO_SET'
                  ? 'Combo sets can be sold as full sets or individual components if enabled.'
                  : 'Simple products are tracked by piece/unit.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/inventory/products')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              isLoading={isSubmitting}
              className={
                productKind === 'RAW_MATERIAL'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : productKind === 'COMBO_SET'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : ''
              }
            >
              Create Product
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  )
}
