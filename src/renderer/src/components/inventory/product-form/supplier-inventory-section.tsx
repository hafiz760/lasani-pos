import { useEffect, useState } from 'react'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { Package, DollarSign, TrendingUp } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@renderer/components/ui/form'

interface SupplierInventorySectionProps {
  form: any
  currentStore: any
  productKind: 'SIMPLE' | 'RAW_MATERIAL'
  productId?: string
  disablePricing?: boolean
  disableQuantity?: boolean
  disableSupplier?: boolean
}

const supplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contactPerson: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  openingBalance: z.coerce.number().default(0)
})

type SupplierFormValues = z.infer<typeof supplierSchema>

export function SupplierInventorySection({
  form,
  currentStore,
  productKind,
  productId,
  disablePricing = false,
  disableQuantity = false,
  disableSupplier = false
}: SupplierInventorySectionProps) {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false)
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false)
  const [isSupplierSubmitting, setIsSupplierSubmitting] = useState(false)
  const [hasResolvedSupplier, setHasResolvedSupplier] = useState(false)

  const isRawMaterial = productKind === 'RAW_MATERIAL'
  const buyingPrice = form.watch('buyingPrice') || 0
  const sellingPrice = form.watch('sellingPrice') || 0
  const normalizeId = (value: any) => {
    if (!value) return ''
    if (typeof value === 'string') {
      return value === '[object Object]' ? '' : value
    }
    if (typeof value === 'object') {
      if (value.$oid) return String(value.$oid)
      if (value.id) return String(value.id)
      if (value._id?.$oid) return String(value._id.$oid)
      if (value._id) return String(value._id)
      if (value.value?.$oid) return String(value.value.$oid)
      if (value.value?._id?.$oid) return String(value.value._id.$oid)
      if (value.value?._id) return String(value.value._id)
      if (value.value) return String(value.value)
      if (value.supplierId) return String(value.supplierId)
    }
    const stringValue = String(value)
    return stringValue === '[object Object]' ? '' : stringValue
  }

  const selectedSupplier = form.watch('supplier')
  const selectedSupplierId = normalizeId(selectedSupplier)

  // Get quantity based on product type
  let quantity = 0
  let unitLabel = 'pcs'

  if (isRawMaterial) {
    const rawMeters = form.watch('totalMeters')
    quantity = rawMeters === '' || rawMeters === undefined ? 0 : Number(rawMeters) || 0
    unitLabel = 'meters'
  } else {
    const rawQty = form.watch('initialQuantity')
    quantity = rawQty === '' || rawQty === undefined ? 0 : Number(rawQty) || 0
    unitLabel = 'pcs'
  }

  const totalCost = buyingPrice * quantity
  const potentialRevenue = sellingPrice * quantity
  const profitMargin = potentialRevenue - totalCost

  useEffect(() => {
    loadSuppliers()
  }, [currentStore?._id])

  useEffect(() => {
    if (!selectedSupplier) return
    const selectedId = normalizeId(selectedSupplier)
    if (!selectedId) {
      form.setValue('supplier', '')
      return
    }
    const hasMatch = suppliers.some((supplier) => normalizeId(supplier._id) === selectedId)
    if (!hasMatch && selectedId && currentStore?._id && !hasResolvedSupplier) {
      resolveSupplierById(selectedId)
      return
    }
    if (!hasMatch && selectedId) return
    if (selectedId && selectedId !== selectedSupplier) {
      form.setValue('supplier', selectedId, { shouldDirty: true, shouldValidate: true })
    }
  }, [selectedSupplier, suppliers, form, productId, currentStore?._id, hasResolvedSupplier])

  useEffect(() => {
    if (!selectedSupplierId || suppliers.length === 0) return
    const hasMatch = suppliers.some((supplier) => normalizeId(supplier._id) === selectedSupplierId)
    if (hasMatch) {
      form.setValue('supplier', selectedSupplierId, { shouldDirty: false, shouldValidate: true })
    }
    console.log('Supplier select state:', {
      selectedSupplierId,
      hasMatch,
      supplierIds: suppliers.map((supplier) => normalizeId(supplier._id))
    })
  }, [selectedSupplierId, suppliers, form])

  useEffect(() => {
    if (selectedSupplier || !productId || !currentStore?._id || hasResolvedSupplier) return
    resolveSupplierByProduct()
  }, [selectedSupplier, productId, currentStore?._id, hasResolvedSupplier])

  const supplierForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: {
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      openingBalance: 0
    }
  })

  const loadSuppliers = async () => {
    if (!currentStore?._id) return
    setIsLoadingSuppliers(true)
    try {
      const result = await window.api.suppliers.getAll({
        storeId: currentStore._id,
        page: 1,
        pageSize: 1000
      })
      if (result.success) {
        setSuppliers(result.data)
      }
    } catch (error) {
      console.error('Failed to load suppliers:', error)
    } finally {
      setIsLoadingSuppliers(false)
    }
  }

  const resolveSupplierByProduct = async () => {
    if (!productId || !currentStore?._id || hasResolvedSupplier) return
    setHasResolvedSupplier(true)
    try {
      const result = await window.api.suppliers.getByProductId({
        storeId: currentStore._id,
        productId
      })
      if (result.success && result.data?._id) {
        addResolvedSupplier(result.data)
      }
    } catch (error) {
      console.error('Failed to resolve supplier by product:', error)
    }
  }

  const resolveSupplierById = async (supplierId: string) => {
    if (!supplierId || hasResolvedSupplier) return
    setHasResolvedSupplier(true)
    try {
      const result = await window.api.suppliers.getById(supplierId)
      if (result.success && result.data?._id) {
        addResolvedSupplier(result.data)
      }
    } catch (error) {
      console.error('Failed to resolve supplier by id:', error)
    }
  }

  const addResolvedSupplier = (supplier: any) => {
    const supplierId = normalizeId(supplier?._id)
    if (!supplierId) return
    setSuppliers((prev) => {
      const exists = prev.some((item) => normalizeId(item._id) === supplierId)
      return exists ? prev : [supplier, ...prev]
    })
    form.setValue('supplier', supplierId, { shouldDirty: true, shouldValidate: true })
  }

  const onSupplierSubmit: SubmitHandler<SupplierFormValues> = async (values) => {
    if (!currentStore?._id) return
    setIsSupplierSubmitting(true)
    try {
      const result = await window.api.suppliers.create({
        ...values,
        store: currentStore._id
      })
      if (result.success) {
        toast.success('Supplier created successfully')
        setSuppliers((prev) => [result.data, ...prev])
        form.setValue('supplier', String(result.data._id), {
          shouldDirty: true,
          shouldValidate: true
        })
        supplierForm.reset()
        setIsAddSupplierOpen(false)
      } else {
        toast.error(result.error || 'Failed to create supplier')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create supplier')
    } finally {
      setIsSupplierSubmitting(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/5 border-2 border-blue-500/30 rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Supplier, Pricing & Stock
        </h2>
        <Button
          type="button"
          variant="outline"
          className="h-10 border-blue-500/2"
          onClick={() => setIsAddSupplierOpen(true)}
          disabled={disableSupplier}
        >
          Add Supplier
        </Button>
      </div>

      <div className="space-y-6">
        {/* Row 1: Supplier */}
        <FormField
          control={form.control}
          name="supplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier *</FormLabel>
              <div className="flex flex-col gap-2">
                <Select
                  onValueChange={field.onChange}
                  value={selectedSupplierId || ''}
                  disabled={isLoadingSuppliers || disableSupplier}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background border-blue-500/20 h-12">
                      <SelectValue placeholder="Select supplier..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border">
                    {suppliers.map((supplier) => {
                      const supplierId = normalizeId(supplier._id)
                      if (!supplierId) return null
                      return (
                        <SelectItem key={supplierId} value={supplierId}>
                          {supplier.name}
                          {supplier.currentBalance > 0 && (
                            <span className="ml-2 text-xs text-red-400">
                              (Balance: Rs. {supplier.currentBalance.toLocaleString()})
                            </span>
                          )}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                {disableSupplier
                  ? 'Supplier locked due to sales activity'
                  : 'Select supplier to track balance'}
              </p>
            </FormItem>
          )}
        />

        {/* Row 2: Buying & Selling Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="buyingPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Buying Price (per {isRawMaterial ? 'Meter' : 'Unit'}) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={field.value === 0 || field.value === '' ? '' : field.value}
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val === '' ? '' : parseFloat(val) || '')
                    }}
                    disabled={disablePricing}
                    className="bg-background border-blue-500/20 h-12 text-lg font-semibold"
                    placeholder="e.g., 150.00"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  {disablePricing
                    ? 'Price locked due to sales activity'
                    : `Cost price per ${unitLabel === 'meters' ? 'meter' : 'piece'}`}
                </p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sellingPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling Price (per {isRawMaterial ? 'Meter' : 'Unit'}) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={field.value === 0 || field.value === '' ? '' : field.value}
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val === '' ? '' : parseFloat(val) || '')
                    }}
                    disabled={disablePricing}
                    className="bg-background border-blue-500/20 h-12 text-lg font-semibold"
                    placeholder="e.g., 200.00"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  {disablePricing
                    ? 'Price locked due to sales activity'
                    : `Selling price per ${unitLabel === 'meters' ? 'meter' : 'piece'}`}
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Row 3: Initial Quantity (Only for SIMPLE) */}
        {!isRawMaterial && (
          <FormField
            control={form.control}
            name="initialQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Quantity (Pieces) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={field.value === 0 || field.value === '' ? '' : field.value}
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val === '' ? '' : parseInt(val) || '')
                    }}
                    disabled={disableQuantity}
                    className="bg-background border-blue-500/20 h-12 text-lg font-semibold"
                    placeholder="e.g., 10"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  {disableQuantity
                    ? 'Quantity locked due to sales activity'
                    : 'How many pieces are you adding to stock?'}
                </p>
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Cost Calculation Display */}
      {quantity > 0 && buyingPrice > 0 && (
        <div className="mt-6 p-5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-blue-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Financial Summary
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-background/50 rounded-lg border border-blue-500/20">
              <p className="text-xs text-muted-foreground mb-1">Buying Price</p>
              <p className="text-xl font-bold text-blue-600">Rs. {buyingPrice.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                per {unitLabel === 'meters' ? 'meter' : 'unit'}
              </p>
            </div>

            <div className="text-center p-3 bg-background/50 rounded-lg border border-blue-500/20">
              <p className="text-xs text-muted-foreground mb-1">Stock</p>
              <p className="text-xl font-bold text-blue-600">
                {isRawMaterial ? quantity.toFixed(1) : quantity}
              </p>
              <p className="text-xs text-muted-foreground">{unitLabel}</p>
            </div>

            <div className="text-center p-3 bg-amber-500/10 rounded-lg border-2 border-amber-500/30">
              <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
              <p className="text-xl font-bold text-amber-600">Rs. {totalCost.toLocaleString()}</p>
            </div>

            {sellingPrice > 0 && (
              <div className="text-center p-3 bg-green-500/10 rounded-lg border-2 border-green-500/30">
                <p className="text-xs text-muted-foreground mb-1">Profit</p>
                <p className="text-xl font-bold text-green-600">
                  Rs. {profitMargin.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {form.watch('supplier') && totalCost > 0 && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <strong>Supplier Balance:</strong> Will increase by Rs. {totalCost.toLocaleString()}{' '}
                when you create this product.
              </p>
            </div>
          )}
        </div>
      )}

      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Add Supplier</DialogTitle>
          </DialogHeader>
          <Form {...supplierForm}>
            <form onSubmit={supplierForm.handleSubmit(onSupplierSubmit)} className="space-y-4">
              <FormField
                control={supplierForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Supplier name" />
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
                      <Input {...field} placeholder="Contact person" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={supplierForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Phone number" />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Email address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={supplierForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Street address" />
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
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="City" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={supplierForm.control}
                name="openingBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Balance</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value === 0 ? '' : field.value}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
                        }
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddSupplierOpen(false)}>
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isLoading={isSupplierSubmitting}
                  loadingText="Saving..."
                >
                  Create Supplier
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
