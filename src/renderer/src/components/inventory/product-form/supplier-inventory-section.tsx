import { useEffect, useState } from 'react'
import { Input } from '@renderer/components/ui/input'
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

interface SupplierInventorySectionProps {
  form: any
  currentStore: any
  productKind: 'SIMPLE' | 'RAW_MATERIAL' | 'COMBO_SET'
}

export function SupplierInventorySection({
  form,
  currentStore,
  productKind
}: SupplierInventorySectionProps) {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false)

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

  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/5 border-2 border-blue-500/30 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 text-blue-600 flex items-center gap-2">
        <Package className="w-5 h-5" />
        Supplier, Pricing & Stock
      </h2>

      <div className="space-y-6">
        {/* Row 1: Supplier */}
        <FormField
          control={form.control}
          name="supplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier *</FormLabel>
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
    </div>
  )
}
