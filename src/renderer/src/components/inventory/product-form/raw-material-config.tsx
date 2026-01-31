import { Input } from '@renderer/components/ui/input'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { Ruler } from 'lucide-react'

interface RawMaterialConfigProps {
  form: any
}

export function RawMaterialConfig({ form }: RawMaterialConfigProps) {
  const totalMeters = form.watch('totalMeters') || 0
  const metersPerUnit = form.watch('metersPerUnit') || 4
  const calculatedSuits =
    totalMeters > 0 && metersPerUnit > 0 ? Math.floor(totalMeters / metersPerUnit) : 0

  return (
    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-2 border-amber-500/30 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 text-amber-600 flex items-center gap-2">
        <span className="text-2xl">📏</span> Raw Material Configuration (Meter-Based)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Meters Available */}
        <FormField
          control={form.control}
          name="totalMeters"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Meters in Stock *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={field.value === 0 || field.value === '' ? '' : field.value}
                  onChange={(e) => {
                    const val = e.target.value
                    field.onChange(val === '' ? '' : parseFloat(val) || '')
                  }}
                  className="bg-background border-amber-500/20 h-12 text-lg font-semibold"
                  placeholder="e.g., 1000.0"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                Total meters of fabric you're adding to inventory
              </p>
            </FormItem>
          )}
        />

        {/* Meters Per Unit - Reference Only */}
        <FormField
          control={form.control}
          name="metersPerUnit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meters Per Suit (Reference)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={field.value === 0 || field.value === '' ? '' : field.value}
                  onChange={(e) => {
                    const val = e.target.value
                    field.onChange(val === '' ? '' : parseFloat(val) || '')
                  }}
                  className="bg-background border-amber-500/20 h-12 text-lg font-semibold"
                  placeholder="4.0"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                Optional: How many meters per suit (for reference only)
              </p>
            </FormItem>
          )}
        />
      </div>

      {/* Stock Summary */}
      <div className="mt-6 p-5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-amber-600 flex items-center gap-2">
            <Ruler className="w-4 h-4" />
            Inventory Summary
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Stock Display */}
          <div className="text-center p-4 bg-[#4ade80]/10 rounded-lg border-2 border-[#4ade80]/30">
            <p className="text-xs text-muted-foreground mb-1">Available Stock</p>
            <p className="text-3xl font-bold text-[#4ade80]">{totalMeters.toFixed(1)} meters</p>
          </div>

          {/* Reference Info */}
          {totalMeters > 0 && metersPerUnit > 0 && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-600">
                💡 <strong>Reference:</strong> With {totalMeters.toFixed(1)} meters at{' '}
                {metersPerUnit} meters/suit, you can make approximately{' '}
                <strong className="text-[#4ade80]">{calculatedSuits} suits</strong>
                {totalMeters % metersPerUnit > 0 && (
                  <>
                    {' '}
                    with <strong>{(totalMeters % metersPerUnit).toFixed(1)} meters</strong>{' '}
                    remaining
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
