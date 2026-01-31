import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { SearchableDropdown } from '@renderer/components/shared/searchable-dropdown'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'

interface ComboSetConfigProps {
  form: any
}

const COMPONENT_OPTIONS = [
  { label: 'Dupatta', value: 'Dupatta' },
  { label: 'Shalwar', value: 'Shalwar' },
  { label: 'Qameez', value: 'Qameez' },
  { label: 'Trouser', value: 'Trouser' },
  { label: 'Kurta', value: 'Kurta' },
  { label: 'Waistcoat', value: 'Waistcoat' }
]

export function ComboSetConfig({ form }: ComboSetConfigProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'components'
  })

  const totalMeters =
    form.watch('components')?.reduce((sum: number, comp: any) => sum + (comp.meters || 0), 0) || 0

  return (
    <>
      {/* Components Configuration */}
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-2 border-purple-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-purple-600 flex items-center gap-2">
            <span className="text-2xl">📦</span> Set Components
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: '', meters: 2.5 })}
            className="border-purple-500/30 hover:bg-purple-500/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Component
          </Button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex gap-4 items-start bg-background/50 p-4 rounded-lg border border-purple-500/20"
            >
              <div className="flex-1 grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`components.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Component Name *</FormLabel>
                      <FormControl>
                        <SearchableDropdown
                          value={field.value}
                          onChange={field.onChange}
                          options={COMPONENT_OPTIONS}
                          placeholder="Select Component"
                          allowClear={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`components.${index}.meters`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meters *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {fields.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="mt-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-purple-600">Total Meters Per Set:</span>
            <span className="text-2xl font-bold text-purple-600">{totalMeters.toFixed(1)} m</span>
          </div>
        </div>
      </div>

      {/* Selling Options */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Selling Options</h2>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="canSellSeparate"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Allow selling individual pieces</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Customers can buy just Dupatta, Shalwar, or Qameez separately
                  </p>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="canSellPartialSet"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Allow selling 2-piece combinations</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Customers can buy any 2 pieces together (e.g., Qameez + Shalwar)
                  </p>
                </div>
              </FormItem>
            )}
          />
        </div>
      </div>
    </>
  )
}
