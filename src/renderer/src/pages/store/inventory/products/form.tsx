import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Input } from '@renderer/components/ui/input'
import { SearchableDropdown } from '@renderer/components/shared/searchable-dropdown' // New import
import { Upload, X, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'

const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  sku: z.string().min(2, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional().or(z.literal('')),
  brand: z.string().optional().or(z.literal('')),
  barcode: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  unit: z.string().min(1, 'Unit is required'),
  color: z.string().optional().or(z.literal('')),
  fabricType: z.string().optional().or(z.literal('')),
  productType: z.string().optional().or(z.literal('')),
  pieceCount: z.string().optional().or(z.literal('')),
  pattern: z.string().optional().or(z.literal('')),
  collectionName: z.string().optional().or(z.literal('')),
  designNumber: z.string().optional().or(z.literal(''))
})

type ProductFormValues = z.infer<typeof productSchema>

export default function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id

  const [currentStore, setCurrentStore] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  // Dynamic attributes
  const [fabricTypes, setFabricTypes] = useState<any[]>([])
  const [productTypes, setProductTypes] = useState<any[]>([])
  const [pieceCounts, setPieceCounts] = useState<any[]>([])
  const [patterns, setPatterns] = useState<any[]>([])
  const [collections, setCollections] = useState<any[]>([])
  const [colors, setColors] = useState<any[]>([])

  useEffect(() => {
    const storeData = localStorage.getItem('selectedStore')
    if (storeData) {
      setCurrentStore(JSON.parse(storeData))
    }
  }, [])

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: `PRD-${Date.now()}`,
      category: '',
      subcategory: '',
      brand: '',
      barcode: '',
      description: '',
      unit: 'pcs',
      color: '',
      fabricType: '',
      productType: '',
      pieceCount: '',
      pattern: '',
      collectionName: '',
      designNumber: ''
    }
  })

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
        setFabricTypes(attrs.filter((a) => a.type === 'FABRIC'))
        setProductTypes(attrs.filter((a) => a.type === 'OTHER'))
        setPieceCounts(attrs.filter((a) => a.type === 'PIECE_COUNT'))
        setPatterns(attrs.filter((a) => a.type === 'PATTERN'))
        setCollections(attrs.filter((a) => a.type === 'COLLECTION'))
        setColors(attrs.filter((a) => a.type === 'COLOR'))
      }
    } catch (error) {
      console.error('Failed to load initial data:', error)
    }
  }

  const loadProduct = async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const result = await window.api.products.getById(id)
      if (result.success && result.data) {
        const product = result.data
        form.reset({
          name: product.name,
          sku: product.sku,
          category: product.category?._id || product.category,
          subcategory: product.subcategory?._id || product.subcategory || '',
          brand: product.brand?._id || product.brand || '',
          barcode: product.barcode || '',
          description: product.description || '',
          unit: product.unit || 'pcs',
          color: product.color || '',
          fabricType: product.fabricType || '',
          productType: product.productType || '',
          pieceCount: product.pieceCount || '',
          pattern: product.pattern || '',
          collectionName: product.collectionName || '',
          designNumber: product.designNumber || ''
        })
        setImagePreviews(product.images || [])
      } else {
        toast.error('Failed to load product')
        navigate('/dashboard/inventory/products')
      }
    } catch (error) {
      toast.error('Error loading product')
      navigate('/dashboard/inventory/products')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [currentStore?._id])

  useEffect(() => {
    if (isEditMode) {
      loadProduct()
    }
  }, [id])

  const watchedBarcode = form.watch('barcode')
  useEffect(() => {
    const checkBarcode = async () => {
      if (!watchedBarcode || !currentStore?._id) {
        if (form.getFieldState('barcode').error?.type === 'manual') {
          form.clearErrors('barcode')
        }
        return
      }

      try {
        const result = await window.api.products.checkBarcode({
          storeId: currentStore._id,
          barcode: watchedBarcode,
          excludeId: id
        })

        if (result.success && result.exists) {
          form.setError('barcode', {
            type: 'manual',
            message: `Barcode "${watchedBarcode}" is already used by product: ${result.productName}`
          })
        } else {
          if (form.getFieldState('barcode').error?.type === 'manual') {
            form.clearErrors('barcode')
          }
        }
      } catch (error) {
        console.error('Barcode check failed:', error)
      }
    }

    const timer = setTimeout(checkBarcode, 500)
    return () => clearTimeout(timer)
  }, [watchedBarcode, currentStore?._id, id])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setSelectedFiles((prev) => [...prev, ...files])

      const newPreviews: string[] = []
      for (const file of files) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = (error) => reject(error)
          })
          newPreviews.push(base64)
        } catch (err) {
          console.error('Failed to generate preview for', file.name, err)
        }
      }
      setImagePreviews((prev) => [...prev, ...newPreviews])
    }
  }

  const removeImage = (index: number) => {
    setImagePreviews((prev) => {
      const targetUrl = prev[index]

      if (!targetUrl.startsWith('media://')) {
        const nonMediaPreviews = prev.filter((u) => !u.startsWith('media://'))
        const previewRelativeIndex = nonMediaPreviews.indexOf(targetUrl)

        if (previewRelativeIndex !== -1) {
          setSelectedFiles((currentFiles) =>
            currentFiles.filter((_, i) => i !== previewRelativeIndex)
          )
        }
      }

      return prev.filter((_, i) => i !== index)
    })
  }

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

  const onSubmit: SubmitHandler<ProductFormValues> = async (values) => {
    if (!currentStore?._id) {
      toast.error('No store selected')
      return
    }
    setIsSubmitting(true)
    try {
      const uploadedUrls: string[] = [...imagePreviews.filter((url) => url.startsWith('media://'))]

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
          toast.error(`Failed to upload ${file.name}`)
        }
      }

      const data = {
        ...values,
        store: currentStore._id,
        images: uploadedUrls,
        brand: values.brand || null,
        productKind: 'SIMPLE'
      }

      let result
      if (isEditMode && id) {
        result = await window.api.products.update(id, data)
      } else {
        result = await window.api.products.create(data)
      }

      if (result.success) {
        toast.success(`Product ${isEditMode ? 'updated' : 'created'} successfully`)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading product...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/dashboard/inventory/products" className="hover:text-foreground">
          Products
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-semibold">
          {isEditMode ? 'Edit Product' : 'Create Product'}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isEditMode ? 'Edit Product' : 'Create New Product'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditMode
              ? 'Update product details and inventory information'
              : 'Add a new product to your inventory'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" autoComplete="off">
          {/* Images Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Product Images</h2>
            <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg border-2 border-dashed border-border">
              {imagePreviews.map((url, index) => (
                <div
                  key={index}
                  className="relative w-28 h-28 rounded-lg border-2 border-border overflow-hidden group shadow-md hover:shadow-lg transition-shadow"
                >
                  <img src={url} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <label className="w-28 h-28 rounded-lg border-2 border-dashed border-muted-foreground/50 hover:border-[#4ade80] hover:bg-[#4ade80]/10 flex flex-col items-center justify-center cursor-pointer transition-all bg-background shadow-sm hover:shadow-md">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground font-semibold">Add Image</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Supported formats: PNG, JPG, JPEG, WEBP (Max 5MB per image)
            </p>
          </div>

          {/* Basic Information */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-muted border-border h-12"
                        placeholder="e.g., iPhone 15 Pro Max"
                      />
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
                    <FormLabel>SKU / Model *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-muted border-border h-12 font-mono"
                        placeholder="Auto-generated"
                        disabled={isEditMode}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Category *</FormLabel>
                      <FormControl>
                        <SearchableDropdown
                          value={field.value}
                          onChange={(val) => {
                            field.onChange(val)
                            form.setValue('subcategory', '')
                          }}
                          options={categories
                            .filter((c) => !c.parent)
                            .map((c) => ({ label: c.name, value: c._id }))}
                          placeholder="Select Category"
                          searchPlaceholder="Search category..."
                          emptyMessage="No category found."
                          allowClear={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcategory (Optional)</FormLabel>
                      <FormControl>
                        <SearchableDropdown
                          value={field.value || ''}
                          onChange={field.onChange}
                          options={categories
                            .filter(
                              (c) =>
                                c.parent?._id === form.getValues('category') ||
                                c.parent === form.getValues('category')
                            )
                            .map((c) => ({ label: c.name, value: c._id }))}
                          placeholder="Select Subcategory"
                          searchPlaceholder="Search subcategory..."
                          emptyMessage="No subcategory found."
                          disabled={!form.watch('category')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <SearchableDropdown
                        value={field.value || ''}
                        onChange={field.onChange}
                        options={brands.map((b) => ({ label: b.name, value: b._id }))}
                        placeholder="Select Brand"
                        searchPlaceholder="Search brand..."
                        emptyMessage="No brand found."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-muted border-border h-12"
                        placeholder="pcs, box, kg, etc."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-muted border-border h-12 font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Cloth Details (Optional) */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-[#4ade80]">Cloth Details (Optional)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="fabricType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fabric Type</FormLabel>
                    <FormControl>
                      <SearchableDropdown
                        value={field.value || ''}
                        onChange={field.onChange}
                        options={fabricTypes.map((t) => ({ label: t.name, value: t.name }))}
                        placeholder="Select Fabric Type"
                        searchPlaceholder="Search fabric..."
                        emptyMessage="No fabric found."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Type</FormLabel>
                    <FormControl>
                      <SearchableDropdown
                        value={field.value || ''}
                        onChange={field.onChange}
                        options={productTypes.map((t) => ({ label: t.name, value: t.name }))}
                        placeholder="Select Product Type"
                        searchPlaceholder="Search type..."
                        emptyMessage="No type found."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pieceCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Piece Count</FormLabel>
                    <FormControl>
                      <SearchableDropdown
                        value={field.value || ''}
                        onChange={field.onChange}
                        options={pieceCounts.map((t) => ({ label: t.name, value: t.name }))}
                        placeholder="Select Piece Count"
                        searchPlaceholder="Search pieces..."
                        emptyMessage="No piece count found."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Color Dropdown with Color Circles */}
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <SearchableDropdown
                        value={field.value || ''}
                        onChange={field.onChange}
                        options={colors.map((t) => ({
                          label: t.name,
                          value: t.value,
                          color: t.value // Pass hex color
                        }))}
                        placeholder="Select Color"
                        searchPlaceholder="Search colors..."
                        emptyMessage="No colors found."
                        showColorCircle={true} // Enable color display
                      />
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
                      <SearchableDropdown
                        value={field.value || ''}
                        onChange={field.onChange}
                        options={patterns.map((t) => ({ label: t.name, value: t.name }))}
                        placeholder="Select Pattern"
                        searchPlaceholder="Search pattern..."
                        emptyMessage="No pattern found."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="collectionName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection</FormLabel>
                    <FormControl>
                      <SearchableDropdown
                        value={field.value || ''}
                        onChange={field.onChange}
                        options={collections.map((t) => ({ label: t.name, value: t.name }))}
                        placeholder="Select Collection"
                        searchPlaceholder="Search collection..."
                        emptyMessage="No collection found."
                      />
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
                      <Input
                        {...field}
                        className="bg-muted border-border h-12"
                        placeholder="e.g., D-101, LAWN-A1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
            <LoadingButton type="submit" isLoading={isSubmitting}>
              {isEditMode ? 'Update Product' : 'Create Product'}
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  )
}
