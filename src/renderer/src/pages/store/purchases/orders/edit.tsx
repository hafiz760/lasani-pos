import { useState, useEffect } from 'react'
import { Search, X, PlusCircle, ArrowLeft, UserPlus, Save, Truck } from 'lucide-react'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Button } from '@renderer/components/ui/button'
import { useNavigate, useParams } from 'react-router-dom'
import { Input } from '@renderer/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
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
import { Checkbox } from '@renderer/components/ui/checkbox'
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
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Separator } from '@renderer/components/ui/separator'

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

export default function EditPurchaseOrderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [selectedBulkProducts, setSelectedBulkProducts] = useState<string[]>([])
  const [bulkSearch, setBulkSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false)

  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStore, setCurrentStore] = useState<any>(null)
  const [_currentUser, setCurrentUser] = useState<any>(null)
  const [order, setOrder] = useState<any>(null)

  useEffect(() => {
    const storeData = localStorage.getItem('selectedStore')
    if (storeData) {
      setCurrentStore(JSON.parse(storeData))
    }
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setCurrentUser(JSON.parse(userStr))
    }
  }, [])

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

  // Watch values for real-time calculations
  const watchedItems = useWatch({ control: form.control, name: 'items' }) || []
  const watchedTax = useWatch({ control: form.control, name: 'taxAmount' }) || 0
  const watchedShipping = useWatch({ control: form.control, name: 'shippingCost' }) || 0
  const watchedDiscount = useWatch({ control: form.control, name: 'discountAmount' }) || 0

  const subtotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
    0
  )
  const total = subtotal + Number(watchedTax) + Number(watchedShipping) - Number(watchedDiscount)

  const loadInitialData = async () => {
    if (!currentStore?._id || !id) return
    setIsLoading(true)
    try {
      const [suppliersRes, productsRes, orderRes] = await Promise.all([
        window.api.suppliers.getAll({ storeId: currentStore._id, pageSize: 1000 }),
        window.api.products.getAll({ storeId: currentStore._id, pageSize: 1000 }),
        window.api.purchaseOrders.getById(id)
      ])

      if (suppliersRes.success) setSuppliers(suppliersRes.data)
      if (productsRes.success) setProducts(productsRes.data)

      if (orderRes.success) {
        const data = orderRes.data
        setOrder(data)
        form.reset({
          supplier: data.supplier?._id || data.supplier,
          items: data.items.map((item: any) => ({
            product: item.product?._id || item.product,
            productName: item.productName || item.product?.name,
            quantity: item.quantity,
            unitCost: item.unitCost,
            sellingPrice: item.sellingPrice
          })),
          notes: data.notes || '',
          discountAmount: data.discountAmount || 0,
          taxAmount: data.taxAmount || 0,
          shippingCost: data.shippingCost || 0
        })
      } else {
        toast.error('Failed to load purchase order')
        navigate(-1)
      }
    } catch (error) {
      toast.error('Failed to load initial data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (currentStore?._id && id) {
      loadInitialData()
    }
  }, [currentStore?._id, id])

  const onSubmit: SubmitHandler<PurchaseOrderFormValues> = async (values) => {
    if (!currentStore?._id || !id) return
    setIsSubmitting(true)
    try {
      const result = await window.api.purchaseOrders.update(id, {
        ...values,
        subtotal,
        totalAmount: total,
        items: values.items.map((item) => ({
          ...item,
          totalCost: Number(item.quantity) * Number(item.unitCost)
        }))
      })

      if (result.success) {
        toast.success('Purchase order updated')
        navigate(`/dashboard/purchases/orders/${id}`)
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

  const addProductToOrder = (product: any) => {
    const existing = fields.find((f) => f.product === product._id)
    if (existing) {
      toast.info('Product already in order. Focusing quantity.')
      // Logic to focus would go here but react-hook-form handles fields differently
      setProductSearch('')
      setShowAutocomplete(false)
      return
    }

    append({
      product: product._id,
      productName: product.name,
      quantity: 1,
      unitCost: product.buyingPrice || 0,
      sellingPrice: product.sellingPrice || 0
    })
    setProductSearch('')
    setShowAutocomplete(false)
  }

  const handleBulkAdd = () => {
    selectedBulkProducts.forEach((productId) => {
      const product = products.find((p: any) => p._id === productId)
      const exists = fields.find((f) => f.product === productId)

      if (product && !exists) {
        append({
          product: product._id,
          productName: product.name,
          quantity: 1,
          unitCost: product.buyingPrice || 0,
          sellingPrice: product.sellingPrice || 0
        })
      }
    })
    setIsBulkOpen(false)
    setSelectedBulkProducts([])
    toast.success('Products added to order')
  }

  const filteredProducts = productSearch.trim()
    ? products.filter(
        (p: any) =>
          p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.barcode?.toLowerCase().includes(productSearch.toLowerCase())
      )
    : []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E8705A]"></div>
      </div>
    )
  }

  if (!currentStore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-bold">No Store Selected</h2>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="border-border"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">
              Edit Purchase Order
            </h2>
            <p className="text-xs font-bold text-muted-foreground uppercase opacity-70">
              Update details for {order?.poNumber}
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="md:col-span-3 bg-card border-border overflow-hidden shadow-xl shadow-black/5">
              <CardHeader className="bg-muted/30 border-b border-border py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-[#E8705A]" />
                    Order Items
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] font-black uppercase border-border hover:bg-[#E8705A]/10 hover:text-[#E8705A]"
                    onClick={() => setIsBulkOpen(true)}
                  >
                    Bulk Selection
                  </Button>
                </div>
              </CardHeader>

              <div className="p-4 bg-muted/10 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by Name, SKU or Barcode (Enter to add)"
                    className="bg-background border-border pl-10 h-11 text-base focus-visible:ring-[#E8705A]"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value)
                      setShowAutocomplete(true)
                      setSelectedSuggestionIndex(0)
                    }}
                    onFocus={() => setShowAutocomplete(true)}
                    onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                    onKeyDown={(e) => {
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
                        if (showAutocomplete && filteredProducts[selectedSuggestionIndex]) {
                          addProductToOrder(filteredProducts[selectedSuggestionIndex])
                        }
                      } else if (e.key === 'Escape') {
                        setShowAutocomplete(false)
                      }
                    }}
                  />

                  {/* Autocomplete Dropdown */}
                  {showAutocomplete && productSearch.trim() && filteredProducts.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-2xl max-h-[400px] overflow-y-auto">
                      {filteredProducts.map((p: any, idx: number) => (
                        <div
                          key={p._id}
                          className={`p-3 cursor-pointer flex items-center justify-between border-b border-border last:border-0 ${
                            idx === selectedSuggestionIndex
                              ? 'bg-[#E8705A] text-white font-semibold'
                              : 'hover:bg-accent text-popover-foreground transition-colors'
                          }`}
                          onClick={() => addProductToOrder(p)}
                          onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm">{p.name}</span>
                            <span className="text-[10px] opacity-70 uppercase font-bold">
                              SKU: {p.sku} | Barcode: {p.barcode}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black block">
                              Rs. {p.buyingPrice.toLocaleString()}
                            </span>
                            <span className="text-[10px] opacity-70 italic font-bold uppercase">
                              Store Price
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-hidden">
                <ScrollArea className="h-[400px]">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-muted text-muted-foreground text-[10px] uppercase font-black sticky top-0 z-10 backdrop-blur-sm">
                      <tr>
                        <th className="px-4 py-3 border-r border-border">Product</th>
                        <th className="px-4 py-3 border-r border-border text-center w-24">Qty</th>
                        <th className="px-4 py-3 border-r border-border text-right w-32">
                          Unit Cost
                        </th>
                        <th className="px-4 py-3 border-r border-border text-right w-32">
                          Selling Price
                        </th>
                        <th className="px-4 py-3 text-right w-32">Total</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {fields.map((field, index) => (
                        <tr key={field.id} className="hover:bg-accent/30 transition-colors group">
                          <td className="px-4 py-2 border-r border-border font-bold">
                            <div className="flex flex-col">
                              <span className="truncate max-w-[300px]">{field.productName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 border-r border-border">
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field: inputField }) => (
                                <FormControl>
                                  <input
                                    type="number"
                                    className="w-full bg-transparent border-none text-center focus:ring-2 focus:ring-[#E8705A] rounded outline-none h-9 font-bold text-foreground"
                                    {...inputField}
                                    onFocus={(e) => e.target.select()}
                                  />
                                </FormControl>
                              )}
                            />
                          </td>
                          <td className="px-4 py-2 border-r border-border">
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitCost`}
                              render={({ field: inputField }) => (
                                <FormControl>
                                  <input
                                    type="number"
                                    className="w-full bg-transparent border-none text-right focus:ring-2 focus:ring-[#E8705A] rounded outline-none h-9 font-bold text-foreground pr-2"
                                    {...inputField}
                                    onFocus={(e) => e.target.select()}
                                  />
                                </FormControl>
                              )}
                            />
                          </td>
                          <td className="px-4 py-2 border-r border-border">
                            <FormField
                              control={form.control}
                              name={`items.${index}.sellingPrice`}
                              render={({ field: inputField }) => (
                                <FormControl>
                                  <input
                                    type="number"
                                    placeholder="Optional"
                                    className="w-full bg-transparent border-none text-right focus:ring-2 focus:ring-[#E8705A] rounded outline-none h-9 font-bold text-[#E8705A] pr-2 placeholder:text-muted-foreground/30 placeholder:text-[10px]"
                                    {...inputField}
                                    value={inputField.value ?? ''}
                                    onFocus={(e) => e.target.select()}
                                  />
                                </FormControl>
                              )}
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-black text-foreground">
                            Rs.{' '}
                            {(
                              (Number(watchedItems[index]?.quantity) || 0) *
                              (Number(watchedItems[index]?.unitCost) || 0)
                            ).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => remove(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {fields.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-20 text-center text-muted-foreground font-bold italic uppercase"
                          >
                            No products added to order yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>

              <div className="bg-muted p-6 border-t border-border">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <FormField
                    control={form.control}
                    name="taxAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                          Tax Amount (Rs)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="bg-background border-border h-11 text-base font-bold focus-visible:ring-[#E8705A]"
                            {...field}
                            onFocus={(e) => e.target.select()}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discountAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                          Discount (Rs)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="bg-background border-border h-11 text-base font-bold focus-visible:ring-[#ef4444]"
                            {...field}
                            onFocus={(e) => e.target.select()}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippingCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                          Shipping (Rs)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="bg-background border-border h-11 text-base font-bold focus-visible:ring-[#E8705A]"
                            {...field}
                            onFocus={(e) => e.target.select()}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                          Order Notes
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Optional remarks..."
                            className="bg-background border-border h-11 text-base font-medium focus-visible:ring-[#E8705A]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="bg-card border-border shadow-xl shadow-black/5">
                <CardHeader className="bg-muted/30 border-b border-border py-4">
                  <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#E8705A]" />
                    Supplier
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name="supplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground mb-2 block">
                              Select Vendor
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11 bg-muted/20 border-border text-base font-bold">
                                  <SelectValue placeholder="Choose Supplier" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-popover border-border">
                                {suppliers.map((s: any) => (
                                  <SelectItem key={s._id} value={s._id} className="font-bold py-3">
                                    <div className="flex flex-col">
                                      <span>{s.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px] font-black uppercase" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 border-border bg-[#E8705A]/10 text-[#E8705A] hover:bg-[#E8705A] hover:text-white transition-all transform hover:scale-105"
                      onClick={() => setIsAddSupplierOpen(true)}
                    >
                      <UserPlus className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-stone-900 border-border shadow-2xl">
                <CardHeader className="border-b border-border/50 py-4">
                  <CardTitle className="text-stone-400 text-xs font-black uppercase tracking-widest">
                    Checkout Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500 font-bold uppercase text-[10px] tracking-widest">
                        Subtotal
                      </span>
                      <span className="text-stone-300 font-black">
                        Rs. {subtotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500 font-bold uppercase text-[10px] tracking-widest">
                        Tax (+)
                      </span>
                      <span className="text-stone-300 font-black">
                        Rs. {Number(watchedTax).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500 font-bold uppercase text-[10px] tracking-widest">
                        Shipping (+)
                      </span>
                      <span className="text-stone-300 font-black">
                        Rs. {Number(watchedShipping).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-red-500/80">
                      <span className="font-bold uppercase text-[10px] tracking-widest">
                        Discount (-)
                      </span>
                      <span className="font-black">
                        Rs. {Number(watchedDiscount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Separator className="bg-stone-800" />

                  <div className="pt-2">
                    <div className="flex flex-col">
                      <span className="text-stone-500 font-black uppercase text-[10px] tracking-[0.2em] mb-1">
                        Grand Total
                      </span>
                      <span className="text-3xl font-black text-[#E8705A] tabular-nums tracking-tighter">
                        <span className="text-sm align-top mt-1 mr-1">Rs.</span>
                        {total.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-6 space-y-3">
                    <LoadingButton
                      type="submit"
                      isLoading={isSubmitting}
                      className="w-full h-14 bg-[#E8705A] hover:bg-[#D4604C] text-black text-lg font-black uppercase tracking-widest shadow-lg shadow-[#E8705A]/20 transform active:scale-95 transition-all"
                    >
                      <Save className="w-5 h-5 mr-3" />
                      Update Order
                    </LoadingButton>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 border-stone-700 text-stone-500 hover:text-white uppercase font-black text-[10px] tracking-widest"
                      onClick={() => navigate(-1)}
                    >
                      Cancel Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>

      {/* Bulk Selection Modal */}
      <Dialog
        open={isBulkOpen}
        onOpenChange={(open) => {
          setIsBulkOpen(open)
          if (!open) {
            setSelectedBulkProducts([])
            setBulkSearch('')
          }
        }}
      >
        <DialogContent className="bg-background border-border text-foreground max-w-2xl h-[80vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#E8705A]" />
              Quick Add Products
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col gap-4 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products by Name, SKU or Barcode..."
                className="bg-muted border-border pl-10 h-11"
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 border border-border rounded-xl bg-muted/20 flex flex-col overflow-hidden shadow-inner">
              <div className="grid grid-cols-12 gap-2 p-3 bg-muted text-[10px] uppercase font-black text-muted-foreground border-b border-border">
                <div className="col-span-1"></div>
                <div className="col-span-6">Product Name</div>
                <div className="col-span-2 text-center">Stock</div>
                <div className="col-span-3 text-right">Unit Price</div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="divide-y divide-border/50">
                  {products
                    .filter((p: any) => {
                      const lowerSearch = bulkSearch.toLowerCase()
                      return (
                        p.name.toLowerCase().includes(lowerSearch) ||
                        p.sku.toLowerCase().includes(lowerSearch) ||
                        p.barcode?.toLowerCase().includes(lowerSearch)
                      )
                    })
                    .map((product: any) => (
                      <div
                        key={product._id}
                        className={`grid grid-cols-12 gap-2 p-3 items-center transition-colors cursor-pointer group ${
                          selectedBulkProducts.includes(product._id)
                            ? 'bg-[#E8705A]/10'
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => {
                          setSelectedBulkProducts((prev) =>
                            prev.includes(product._id)
                              ? prev.filter((id) => id !== product._id)
                              : [...prev, product._id]
                          )
                        }}
                      >
                        <div className="col-span-1 flex justify-center">
                          <Checkbox
                            checked={selectedBulkProducts.includes(product._id)}
                            onCheckedChange={() => {}}
                            className="border-border"
                          />
                        </div>
                        <div className="col-span-6 flex flex-col">
                          <span className="text-sm font-bold group-hover:text-[#E8705A] transition-colors">
                            {product.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-black uppercase">
                            {product.sku}
                          </span>
                        </div>
                        <div className="col-span-2 text-center text-xs font-black">
                          {product.stockLevel}
                        </div>
                        <div className="col-span-3 text-sm text-right font-black">
                          Rs. {product.buyingPrice.toLocaleString()}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-border gap-3">
            <Button
              variant="outline"
              onClick={() => setIsBulkOpen(false)}
              className="font-black uppercase text-[10px] border-border h-11 px-8"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAdd}
              className="bg-[#E8705A] hover:bg-[#D4604C] text-black font-black uppercase text-[10px] h-11 px-8 tracking-widest shadow-lg shadow-[#E8705A]/20"
              disabled={selectedBulkProducts.length === 0}
            >
              Add {selectedBulkProducts.length} Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Modal */}
      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <DialogContent className="bg-background border-border text-foreground max-w-xl p-0 overflow-hidden">
          <Form {...supplierForm}>
            <form
              onSubmit={supplierForm.handleSubmit(onSupplierSubmit)}
              className="flex flex-col h-full"
            >
              <DialogHeader className="p-6 bg-muted/30 border-b border-border">
                <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#E8705A]" />
                  Add New Vendor
                </DialogTitle>
              </DialogHeader>

              <div className="p-6 grid grid-cols-2 gap-4">
                <FormField
                  control={supplierForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                        Supplier Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Samsung Official"
                          className="bg-muted/20 border-border h-11 font-bold"
                          {...field}
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
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                        Contact Person
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Name"
                          className="bg-muted/20 border-border h-11 font-bold"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={supplierForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                        Email (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="email@example.com"
                          className="bg-muted/20 border-border h-11 font-bold"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={supplierForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                        City
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="City"
                          className="bg-muted/20 border-border h-11 font-bold"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={supplierForm.control}
                  name="openingBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                        Opening Balance (Rs)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          className="bg-muted/20 border-border h-11 font-bold"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="p-6 bg-muted/30 border-t border-border gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddSupplierOpen(false)}
                  className="font-black uppercase text-[10px] border-border h-11 px-8"
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isLoading={isSubmitting} // Use existing state
                  className="bg-[#E8705A] hover:bg-[#D4604C] text-black font-black uppercase text-[10px] h-11 px-8 shadow-lg shadow-[#E8705A]/20"
                >
                  Create Vendor
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
