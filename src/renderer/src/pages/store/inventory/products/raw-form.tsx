import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Input } from '@renderer/components/ui/input'
import { SearchableDropdown } from '@renderer/components/shared/searchable-dropdown'
import { Upload, X, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'

const rawProductSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  sku: z.string().min(2, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional().or(z.literal('')),
  brand: z.string().optional().or(z.literal('')),
  barcode: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  unit: z.string().min(1, 'Unit is required'),
  totalMeters: z.coerce.number().min(0, 'Meters must be positive'),
  metersPerSuit: z.coerce.number().min(0.1, 'Meters per suit must be at least 0.1'),
  color: z.string().optional().or(z.literal('')),
  fabricType: z.string().optional().or(z.literal('')),
  productType: z.string().optional().or(z.literal('')),
  pieceCount: z.string().optional().or(z.literal('')),
  pattern: z.string().optional().or(z.literal('')),
  collectionName: z.string().optional().or(z.literal('')),
  designNumber: z.string().optional().or(z.literal(''))
})

type RawProductFormValues = z.infer<typeof rawProductSchema>

export default function RawProductFormPage() {
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
  const [patterns, setPatterns] = useState<any[]>([])
  const [colors, setColors] = useState<any[]>([])

  useEffect(() => {
    const storeData = localStorage.getItem('selectedStore')
    if (storeData) {
      setCurrentStore(JSON.parse(storeData))
    }
  }, [])

  const form = useForm<any>({
    resolver: zodResolver(rawProductSchema),
    defaultValues: {
      name: '',
      sku: `RAW-${Date.now()}`,
      category: '',
      subcategory: '',
      brand: '',
      barcode: '',
      description: '',
      unit: 'suits',
      totalMeters: 0,
      metersPerSuit: 4,
      color: '',
      fabricType: '',
      productType: '',
      pieceCount: '',
      pattern: '',
      collectionName: '',
      designNumber: ''
    }
  })

  const watchedMeters = form.watch('totalMeters')
  const watchedMetersPerSuit = form.watch('metersPerSuit')

  useEffect(() => {
    if (watchedMeters !== undefined && watchedMetersPerSuit) {
      const suits = Math.floor(watchedMeters / watchedMetersPerSuit)
      if (!isNaN(suits)) {
        form.setValue('stockLevel', suits)
      }
    }
  }, [watchedMeters, watchedMetersPerSuit, form])

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
        setPatterns(attrs.filter((a) => a.type === 'PATTERN'))
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
          unit: product.unit || 'suits',
          totalMeters: product.totalMeters || 0,
          metersPerSuit: product.metersPerSuit || 4,
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
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
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

  const onSubmit: any = async (values: RawProductFormValues) => {
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
        }
      }

      const data = {
        ...values,
        store: currentStore._id,
        images: uploadedUrls,
        brand: values.brand || null,
        productKind: 'RAW'
      }
      console.log(data)

      let result
      if (isEditMode && id) {
        result = await window.api.products.update(id, data)
      } else {
        result = await window.api.products.create(data)
      }

      if (result.success) {
        toast.success(`Raw Product ${isEditMode ? 'updated' : 'created'} successfully`)
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
    return <div className="p-10 text-center">Loading...</div>
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
          {isEditMode ? 'Edit Raw Product' : 'Create Raw Product'}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isEditMode ? 'Edit Raw Product' : 'New Raw Product (Textile)'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Specialized form for textile products with meter calculations.
          </p>
        </div>
      </div>

      <Form {...(form as any)}>
        <form
          onSubmit={form.handleSubmit(onSubmit as any)}
          className="space-y-8"
          autoComplete="off"
        >
          {/* Material Calculation Card */}
          <div className="bg-card border border-[#4ade80]/30 rounded-lg p-6 bg-gradient-to-br from-background to-[#4ade80]/5">
            <h2 className="text-lg font-semibold mb-4 text-[#4ade80]">
              Material Calculation (Meters → Suits)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="totalMeters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Meters Available</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="bg-muted border-border h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metersPerSuit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meters Per Suit</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="bg-muted border-border h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col justify-center p-4 bg-[#4ade80]/10 border border-[#4ade80]/20 rounded-xl">
                <p className="text-xs text-muted-foreground uppercase font-semibold">
                  Calculated Suits
                </p>
                <p className="text-3xl font-black text-[#4ade80]">
                  {form.watch('stockLevel')} Suits
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Basic Information */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4 text-[#4ade80]">Basic Information</h2>
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
                            placeholder="e.g. Wash & Wear Blue"
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
                            disabled={isEditMode}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          />
                        </FormControl>
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
                          <Input {...field} className="bg-muted border-border h-12 font-mono" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4 text-[#4ade80]">
                  Cloth Details (Optional)
                </h2>
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
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                              color: t.value
                            }))}
                            showColorCircle={true}
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
                            placeholder="e.g. D-101"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Images */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4 text-[#4ade80]">Product Images</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {imagePreviews.map((url, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg border border-border overflow-hidden group"
                      >
                        <img src={url} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/50 hover:border-[#4ade80] hover:bg-[#4ade80]/5 flex flex-col items-center justify-center cursor-pointer transition-all">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Add Image</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Sticky Actions */}
              <div className="bg-card border border-border rounded-lg p-6 sticky top-6">
                <div className="space-y-4">
                  <LoadingButton
                    type="submit"
                    isLoading={isSubmitting}
                    className="w-full h-12 text-lg"
                  >
                    {isEditMode ? 'Update Raw Product' : 'Save Raw Product'}
                  </LoadingButton>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12"
                    onClick={() => navigate('/dashboard/inventory/products')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
