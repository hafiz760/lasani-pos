import { Input } from '@renderer/components/ui/input'
import { SearchableDropdown } from '@renderer/components/shared/searchable-dropdown'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'

interface ClothDetailsProps {
  form: any
  attributes: any
  productKind: string
}

export function ClothDetails({ form, attributes, productKind }: ClothDetailsProps) {
  const titleColor =
    productKind === 'RAW_MATERIAL'
      ? 'text-amber-600'
      : productKind === 'COMBO_SET'
        ? 'text-purple-600'
        : 'text-[#4ade80]'

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className={`text-lg font-semibold mb-4 ${titleColor}`}>
        {productKind === 'SIMPLE' ? 'Cloth Details (Optional)' : 'Cloth Details'}
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
                  options={attributes.fabricTypes.map((t: any) => ({
                    label: t.name,
                    value: t.name
                  }))}
                  placeholder="Select Fabric Type"
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
                  options={attributes.colors.map((t: any) => ({
                    label: t.name,
                    value: t.value,
                    color: t.value
                  }))}
                  placeholder="Select Color"
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
                  options={attributes.patterns.map((t: any) => ({ label: t.name, value: t.name }))}
                  placeholder="Select Pattern"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {productKind === 'SIMPLE' && (
          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Size</FormLabel>
                <FormControl>
                  <SearchableDropdown
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={
                      attributes.sizes?.map((t: any) => ({
                        label: t.name,
                        value: t.name
                      })) || []
                    }
                    placeholder="Select Size"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
  )
}
