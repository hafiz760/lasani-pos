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
  productKind: 'SIMPLE' | 'RAW_MATERIAL' | 'COMBO_SET'
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
  productKind
}: SupplierInventorySectionProps) {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false)
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false)
  const [isSupplierSubmitting, setIsSupplierSubmitting] = useState(false)

  const isRawMaterial = productKind === 'RAW_MATERIAL'
  const isComboSet = productKind === 'COMBO_SET'
  const buyingPrice = form.watch('buyingPrice') || 0
  const sellingPrice = form.watch('sellingPrice') || 0

  // Get quantity based on product type
  let quantity = 0
  let unitLabel = 'pcs'

  if (isRawMaterial) {
    quantity = form.watch('totalMeters') || 0
    unitLabel = 'meters'
  } else if (isComboSet) {
    quantity = form.watch('initialQuantity') || 0
    unitLabel = 'sets'
  } else {
    quantity = form.watch('initialQuantity') || 0
    unitLabel = 'pcs'
  }

  const totalCost = buyingPrice * quantity
  const potentialRevenue = sellingPrice * quantity
  const profitMargin = potentialRevenue - totalCost

  useEffect(() => {
    loadSuppliers()
  }, [currentStore?._id])

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
        form.setValue('supplier', result.data._id)
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
          className="h-10 border-blue-500/20 bg-black"
          onClick={() => setIsAddSupplierOpen(true)}
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
                  value={field.value}
                  disabled={isLoadingSuppliers}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background border-blue-500/20 h-12">
                      <SelectValue placeholder="Select supplier..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border">
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier._id} value={supplier._id}>
                        {supplier.name}
                        {supplier.currentBalance > 0 && (
                          <span className="ml-2 text-xs text-red-400">
                            (Balance: Rs. {supplier.currentBalance.toLocaleString()})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">Select supplier to track balance</p>
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
                <FormLabel>
                  Buying Price (per {isRawMaterial ? 'Meter' : isComboSet ? 'Set' : 'Unit'}) *
                </FormLabel>
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
                    className="bg-background border-blue-500/20 h-12 text-lg font-semibold"
                    placeholder="e.g., 150.00"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  Cost price per{' '}
                  {unitLabel === 'meters' ? 'meter' : unitLabel === 'sets' ? 'set' : 'piece'}
                </p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sellingPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Selling Price (per {isRawMaterial ? 'Meter' : isComboSet ? 'Set' : 'Unit'}) *
                </FormLabel>
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
                    className="bg-background border-blue-500/20 h-12 text-lg font-semibold"
                    placeholder="e.g., 200.00"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  Selling price per{' '}
                  {unitLabel === 'meters' ? 'meter' : unitLabel === 'sets' ? 'set' : 'piece'}
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Row 3: Initial Quantity (Only for SIMPLE and COMBO_SET) */}
        {!isRawMaterial && (
          <FormField
            control={form.control}
            name="initialQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Quantity ({isComboSet ? 'Sets' : 'Pieces'}) *</FormLabel>
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
                    className="bg-background border-blue-500/20 h-12 text-lg font-semibold"
                    placeholder="e.g., 10"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  How many {isComboSet ? 'sets' : 'pieces'} are you adding to stock?
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
                per {unitLabel === 'meters' ? 'meter' : unitLabel === 'sets' ? 'set' : 'unit'}
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
