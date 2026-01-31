import { Input } from '@renderer/components/ui/input'
import { SearchableDropdown } from '@renderer/components/shared/searchable-dropdown'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'

interface BasicInformationProps {
  form: any
  categories: any[]
  brands: any[]
  productKind: 'SIMPLE' | 'RAW_MATERIAL' | 'COMBO_SET'
}

export function BasicInformation({ form, categories, brands, productKind }: BasicInformationProps) {
  const isSimple = productKind === 'SIMPLE'

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
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
                  placeholder="e.g., Premium Cotton Shirt"
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
              <FormLabel>SKU *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-muted border-border h-12 font-mono"
                  placeholder="Auto-generated"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2">
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
                    placeholder="Select Category"
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
                <FormLabel>Subcategory</FormLabel>
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
                    placeholder="Select Subcategory"
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
                  placeholder="Select Brand"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isSimple && (
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="bg-muted border-border h-12"
                    placeholder="pcs, box, kg, etc."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className={'md:col-span-2'}>
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
    </div>
  )
}
