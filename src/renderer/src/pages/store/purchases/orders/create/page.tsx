import { useState, useEffect } from 'react'
import { Search, X, PlusCircle, ArrowLeft, UserPlus } from 'lucide-react'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Button } from '@renderer/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { Input } from '@renderer/components/ui/input'
import { Card, CardContent } from '@renderer/components/ui/card'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@renderer/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { z } from 'zod'
import { useForm, useFieldArray, SubmitHandler, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'

const purchaseItemSchema = z.object({
  product: z.string().min(1, 'Product is required'),
  productName: z.string().optional(),
  quantity: z.preprocess((val) => Number(val), z.number().min(1, 'Quantity must be at least 1')),
  unitCost: z.preprocess((val) => Number(val), z.number().min(0, 'Unit cost cannot be negative')),
  sellingPrice: z.preprocess(
    (val) => (val === '' || val === null ? undefined : Number(val)),
    z.number().min(0, 'Selling price cannot be negative').optional()
  )
})

const purchaseOrderSchema = z.object({
  supplier: z.string().min(1, 'Supplier is required'),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
  notes: z.string().default(''),
  discountAmount: z.preprocess((val) => Number(val), z.number().min(0).default(0)),
  taxAmount: z.preprocess((val) => Number(val), z.number().min(0).default(0)),
  shippingCost: z.preprocess((val) => Number(val), z.number().min(0).default(0))
})

type IPurchaseItem = {
  product: string
  productName?: string
  quantity: number
  unitCost: number
  sellingPrice?: number | null
}

type PurchaseOrderFormValues = {
  supplier: string
  items: IPurchaseItem[]
  notes: string
  discountAmount: number
  taxAmount: number
  shippingCost: number
}

const supplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contactPerson: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  openingBalance: z.coerce.number().default(0)
})

type SupplierFormValues = z.infer<typeof supplierSchema>

export default function CreatePurchaseOrderPage() {
  const [productSearch, setProductSearch] = useState('')
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false)
  const navigate = useNavigate()

  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [_isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStore, setCurrentStore] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const storeData = localStorage.getItem('selectedStore')
    if (storeData) {
      setCurrentStore(JSON.parse(storeData))
    }
  }, [])

  const loadInitialData = async () => {
    if (!currentStore?._id) return
    setIsLoading(true)
    try {
      const [suppliersRes, productsRes] = await Promise.all([
        window.api.suppliers.getAll({ storeId: currentStore._id, pageSize: 1000 }),
        window.api.products.getAll({ storeId: currentStore._id, pageSize: 1000 })
      ])
      if (suppliersRes.success) setSuppliers(suppliersRes.data)
      if (productsRes.success) setProducts(productsRes.data)
    } catch (error) {
      toast.error('Failed to load initial data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      setCurrentUser(user)
    }
  }, [currentStore?._id])

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema) as any,
    defaultValues: {
      supplier: '',
      items: [],
      notes: '',
      discountAmount: 0,
      taxAmount: 0,
      shippingCost: 0
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })

  const supplierForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      address: '',
      city: '',
      openingBalance: 0
    }
  })

  const watchedItems = useWatch({ control: form.control, name: 'items' }) || []
  const watchedTax = useWatch({ control: form.control, name: 'taxAmount' }) || 0
  const watchedShipping = useWatch({ control: form.control, name: 'shippingCost' }) || 0
  const watchedDiscount = useWatch({ control: form.control, name: 'discountAmount' }) || 0

  const subtotal = watchedItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitCost || 0),
    0
  )
  const total = subtotal + Number(watchedTax) + Number(watchedShipping) - Number(watchedDiscount)

  const onSubmit: SubmitHandler<PurchaseOrderFormValues> = async (values) => {
    if (!currentStore?._id) return
    setIsSubmitting(true)
    try {
      const result = await window.api.purchaseOrders.create({
        ...values,
        store: currentStore._id,
        subtotal,
        totalAmount: total,
        purchaseDate: new Date(),
        status: 'DRAFT',
        createdBy: currentUser?.id || currentUser?._id,
        items: values.items.map((item) => ({
          ...item,
          totalCost: Number(item.quantity) * Number(item.unitCost)
        }))
      })

      if (result.success) {
        toast.success('Purchase order created')
        navigate('/dashboard/purchases/orders')
      } else {
        toast.error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSupplierSubmit: SubmitHandler<SupplierFormValues> = async (values) => {
    if (!currentStore?._id) return
    try {
      const result = await window.api.suppliers.create({ ...values, store: currentStore._id })
      if (result.success) {
        toast.success('Supplier created successfully')
        const suppliersRes = await window.api.suppliers.getAll({
          storeId: currentStore._id,
          pageSize: 1000
        })
        if (suppliersRes.success) setSuppliers(suppliersRes.data)
        form.setValue('supplier', result.data._id)
        supplierForm.reset()
        setIsAddSupplierOpen(false)
      } else {
        toast.error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    }
  }

  if (!currentStore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-bold">No Store Selected</h2>
        <p className="text-muted-foreground">Please select a store to create purchase orders.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
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
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Create Purchase Order
          </h2>
          <p className="text-muted-foreground">Create a new purchase order for suppliers</p>
        </div>
      </div>

      <Card className="bg-card border-border text-foreground">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <div className="flex gap-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-muted border-border flex-1">
                              <SelectValue placeholder="Select Supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover border-border text-popover-foreground">
                            {suppliers.map((s: any) => (
                              <SelectItem key={s._id} value={s._id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setIsAddSupplierOpen(true)}
                          className="border-border hover:bg-[#4ade80]/10 hover:border-[#4ade80]"
                          title="Add New Supplier"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Notes</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted border-border"
                          placeholder="Optional notes..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mb-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Order Items{' '}
                  <span className="text-muted-foreground">({fields.length} products)</span>
                </h3>
              </div>

              <div className="flex flex-col border border-border rounded-lg bg-card">
                <div className="p-3 border-b border-border bg-muted/30">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                    <Input
                      placeholder="Search products to add..."
                      className="bg-background border-border pl-10 h-9"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value)
                        setShowAutocomplete(e.target.value.length > 0)
                        setSelectedSuggestionIndex(0)
                      }}
                      onFocus={() => {
                        if (productSearch.length > 0) {
                          setShowAutocomplete(true)
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowAutocomplete(false), 200)
                      }}
                      onKeyDown={(e) => {
                        const searchLower = productSearch.toLowerCase()
                        const filteredProducts = products.filter(
                          (p: any) =>
                            p.name?.toLowerCase().includes(searchLower) ||
                            p.sku?.toLowerCase().includes(searchLower) ||
                            p.barcode?.toLowerCase().includes(searchLower)
                        )

                        if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setSelectedSuggestionIndex((prev) =>
                            prev < filteredProducts.length - 1 ? prev + 1 : prev
                          )
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0))
                        } else if (e.key === 'Enter') {
                          e.preventDefault()
                          if (filteredProducts.length > 0) {
                            const selectedProduct = filteredProducts[selectedSuggestionIndex]
                            if (selectedProduct) {
                              const existingIndex = watchedItems.findIndex(
                                (item: any) => item.product === selectedProduct._id
                              )

                              if (existingIndex !== -1) {
                                toast.info('Product already added! Updating quantity...')
                                setProductSearch('')
                                setShowAutocomplete(false)
                                setSelectedSuggestionIndex(0)
                              } else {
                                append({
                                  product: selectedProduct._id,
                                  productName: selectedProduct.name,
                                  quantity: 1,
                                  unitCost: selectedProduct.buyingPrice,
                                  sellingPrice: selectedProduct.sellingPrice
                                })
                                setProductSearch('')
                                setShowAutocomplete(false)
                                setSelectedSuggestionIndex(0)
                              }
                            }
                          }
                        }
                      }}
                    />

                    {showAutocomplete && productSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-[300px] overflow-y-auto z-50">
                        {(() => {
                          const searchLower = productSearch.toLowerCase()
                          const filteredProducts = products.filter(
                            (p: any) =>
                              p.name?.toLowerCase().includes(searchLower) ||
                              p.sku?.toLowerCase().includes(searchLower) ||
                              p.barcode?.toLowerCase().includes(searchLower)
                          )

                          if (filteredProducts.length === 0) {
                            return (
                              <div className="p-3 text-sm text-muted-foreground text-center">
                                No products found
                              </div>
                            )
                          }

                          return filteredProducts.map((product: any, index: number) => (
                            <div
                              key={product._id}
                              className={`p-2 cursor-pointer transition-colors border-b border-border last:border-0 ${
                                index === selectedSuggestionIndex
                                  ? 'bg-[#4ade80]/10 border-l-2 border-l-[#4ade80]'
                                  : 'hover:bg-muted'
                              }`}
                              onClick={() => {
                                const existingIndex = watchedItems.findIndex(
                                  (item: any) => item.product === product._id
                                )

                                if (existingIndex !== -1) {
                                  toast.info('Product already added!')
                                } else {
                                  append({
                                    product: product._id,
                                    productName: product.name,
                                    quantity: 1,
                                    unitCost: product.buyingPrice,
                                    sellingPrice: product.sellingPrice
                                  })
                                }
                                setProductSearch('')
                                setShowAutocomplete(false)
                              }}
                            >
                              <div className="font-medium text-sm text-foreground">
                                {product.name}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                {product.sku && <span>SKU: {product.sku}</span>}
                                <span>Stock: {product.stockLevel}</span>
                                <span className="ml-auto font-medium text-foreground">
                                  Rs. {product.buyingPrice}
                                </span>
                              </div>
                            </div>
                          ))
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted border-b border-border sticky top-0 z-10">
                      <tr className="text-[10px] uppercase font-bold text-muted-foreground">
                        <th className="text-left p-2 w-[40%]">Product Name</th>
                        <th className="text-center p-2 w-[12%]">Qty</th>
                        <th className="text-right p-2 w-[16%]">Cost (Rs)</th>
                        <th className="text-right p-2 w-[16%]">Sell (Rs)</th>
                        <th className="text-right p-2 w-[12%]">Total</th>
                        <th className="p-2 w-[4%]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {fields.map((field, index) => (
                        <tr key={field.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-2">
                            <span className="font-medium">
                              {watchedItems[index]?.productName || 'Select Product'}
                            </span>
                          </td>
                          <td className="p-1">
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem className="m-0">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      {...field}
                                      className="h-8 bg-transparent border-none text-center focus:bg-muted font-medium"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="p-1">
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitCost`}
                              render={({ field }) => (
                                <FormItem className="m-0">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      {...field}
                                      className="h-8 bg-transparent border-none text-right focus:bg-muted font-medium"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="p-1">
                            <FormField
                              control={form.control}
                              name={`items.${index}.sellingPrice`}
                              render={({ field }) => {
                                const { value, ...fieldProps } = field
                                return (
                                  <FormItem className="m-0">
                                    <FormControl>
                                      <Input
                                        type="number"
                                        placeholder="Optional"
                                        {...fieldProps}
                                        value={value ?? ''}
                                        className="h-8 bg-transparent border-none text-right focus:bg-muted"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )
                              }}
                            />
                          </td>
                          <td className="p-2 text-right text-xs font-bold text-[#4ade80]">
                            {(
                              (watchedItems[index]?.quantity || 0) *
                              (watchedItems[index]?.unitCost || 0)
                            ).toLocaleString()}
                          </td>
                          <td className="p-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              className="h-7 w-7 text-red-500 hover:bg-red-500/10"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-2 border-t border-border bg-muted/20 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast.info('Please use the search bar to add products.')
                    }}
                    className="text-xs h-8"
                  >
                    <PlusCircle className="w-3 h-3 mr-1" />
                    How to Add items?
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 bg-muted p-4 rounded-lg border border-border">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase">Subtotal</span>
                  <span className="text-sm font-bold">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-red-400">
                    Discount (-Rs)
                  </span>
                  <FormField
                    control={form.control}
                    name="discountAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            className="h-7 bg-transparent border-border text-sm"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase">Other Costs</span>
                  <div className="flex gap-1">
                    <FormField
                      control={form.control}
                      name="taxAmount"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Tax"
                              {...field}
                              className="h-7 bg-muted border-border text-xs"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shippingCost"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ship"
                              {...field}
                              className="h-7 bg-muted border-border text-xs"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end justify-center">
                  <span className="text-[10px] text-[#4ade80] uppercase font-bold">
                    Grand Total
                  </span>
                  <span className="text-xl font-black text-[#4ade80]">
                    Rs. {total.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="border-border"
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isLoading={isSubmitting}
                  loadingText="Creating PO..."
                  className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-black px-8"
                >
                  Create Purchase Order
                </LoadingButton>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <DialogContent className="bg-background border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>
          <Form {...supplierForm}>
            <form onSubmit={supplierForm.handleSubmit(onSupplierSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={supplierForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted border-border"
                          placeholder="e.g. ABC Distributors"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={supplierForm.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-muted border-border" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddSupplierOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold"
                >
                  Create Supplier
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
