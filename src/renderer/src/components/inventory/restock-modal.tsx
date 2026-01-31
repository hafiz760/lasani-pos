import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface RestockModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: any
  currentStore: any
  onSuccess: () => void
}

export function RestockModal({
  open,
  onOpenChange,
  product,
  currentStore,
  onSuccess
}: RestockModalProps) {
  const [loading, setLoading] = useState(false)
  const [fetchingInfo, setFetchingInfo] = useState(false)
  const [suppliers, setSuppliers] = useState<any[]>([])
  console.log(product, 'product')
  // Form State
  const [supplierId, setSupplierId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unitCost, setUnitCost] = useState(0)
  const [sellingPrice, setSellingPrice] = useState(0)

  useEffect(() => {
    if (open && product && currentStore) {
      // Reset form
      setQuantity(1)
      setUnitCost(product?.buyingPrice || 0)
      setSellingPrice(product?.sellingPrice || 0)
      setSupplierId('')

      // Fetch suppliers and last supply info
      fetchData()
    }
  }, [open, product, currentStore])

  const fetchData = async () => {
    setFetchingInfo(true)
    try {
      // Fetch Suppliers
      const suppliersResult = await window.api.suppliers.getAll({
        storeId: currentStore._id,
        pageSize: 100
      })
      if (suppliersResult.success) {
        setSuppliers(suppliersResult.data)
      }
    } catch (error) {
      console.error('Failed to fetch suppliers', error)
    } finally {
      setFetchingInfo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId || quantity <= 0) {
      toast.error('Please select a supplier and valid quantity')
      return
    }

    setLoading(true)
    try {
      const result = await window.api.products.restock({
        productId: product?._id,
        supplierId: supplierId,
        quantity: Number(quantity),
        unitCost: Number(unitCost),
        sellingPrice: Number(sellingPrice)
      })

      if (result.success) {
        const totalCost = Number(quantity) * Number(unitCost)
        toast.success(
          `Successfully restocked ${product?.name}!\n+${quantity} units | Cost: Rs. ${totalCost.toLocaleString()}`
        )
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error('Restock failed: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Restock failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const totalCost = quantity * unitCost

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card text-foreground border-border">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1">
            <span>Restock Product</span>
            <span className="text-sm font-normal text-muted-foreground">{product?.name}</span>
          </DialogTitle>
          <DialogDescription>
            Add inventory from a supplier. This will update stock and supplier balance directly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="supplier" className="text-xs uppercase font-bold text-muted-foreground">
              Supplier <span className="text-red-500">*</span>
            </Label>
            {fetchingInfo ? (
              <div className="h-10 w-full rounded-md border border-input bg-muted animate-pulse" />
            ) : (
              <Select value={supplierId} onValueChange={setSupplierId} required>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="quantity"
                className="text-xs uppercase font-bold text-muted-foreground"
              >
                {product?.productKind === 'RAW_MATERIAL' ? 'Meters to Add' : 'Quantity'}{' '}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0.1"
                step={product?.productKind === 'RAW_MATERIAL' ? '0.1' : '1'}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0.1, parseFloat(e.target.value) || 0))}
                className="font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="unitCost"
                className="text-xs uppercase font-bold text-muted-foreground"
              >
                {product?.productKind === 'RAW_MATERIAL' ? 'Price per Meter' : 'Unit Cost'}{' '}
                <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">
                  Rs.
                </span>
                <Input
                  id="unitCost"
                  type="number"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="sellingPrice"
              className="text-xs uppercase font-bold text-muted-foreground"
            >
              Selling Price ({product?.productKind === 'RAW_MATERIAL' ? 'Per Meter' : 'Per Unit'})
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">
                Rs.
              </span>
              <Input
                id="sellingPrice"
                type="number"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center border-t border-border mt-2">
            <span className="font-bold text-sm uppercase text-muted-foreground">Total Cost</span>
            <span className="text-xl font-black text-primary">
              Rs. {totalCost.toLocaleString()}
            </span>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !supplierId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restock Now
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
