import { useState, useEffect } from 'react'
import { DataPage } from '@renderer/components/shared/data-page'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Button } from '@renderer/components/ui/button'
import { HexColorPicker } from 'react-colorful'
import { Edit, Trash2, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { DeleteConfirm } from '@renderer/components/shared/delete-confirm'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { z } from 'zod'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { Badge } from '@renderer/components/ui/badge'

const attributeSchema = z.object({
  name: z.string().min(2, 'Attribute name must be at least 2 characters'),
  type: z.enum(['FABRIC', 'PATTERN', 'COLLECTION', 'PIECE_COUNT', 'COLOR', 'SIZE', 'OTHER']),
  value: z.string().optional()
})

type AttributeFormValues = z.infer<typeof attributeSchema>

const ATTRIBUTE_TYPES = [
  { label: 'Fabric Type', value: 'FABRIC' },
  { label: 'Pattern', value: 'PATTERN' },
  { label: 'Collection', value: 'COLLECTION' },
  { label: 'Piece Count', value: 'PIECE_COUNT' },
  { label: 'Color', value: 'COLOR' },
  { label: 'Size', value: 'SIZE' },
  { label: 'Other', value: 'OTHER' }
]

export default function AttributesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAttribute, setEditingAttribute] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [attributes, setAttributes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [currentStore, setCurrentStore] = useState<any>(null)

  useEffect(() => {
    const storeData = localStorage.getItem('selectedStore')
    if (storeData) {
      setCurrentStore(JSON.parse(storeData))
    }
  }, [])

  const loadAttributes = async () => {
    if (!currentStore?._id) return
    setIsLoading(true)
    try {
      const result = await window.api.attributes.getAll({
        storeId: currentStore._id
      })
      if (result.success) {
        // Simple client-side filtering since we don't have server-side search yet for attributes
        const filtered = result.data.filter(
          (attr: any) =>
            attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            attr.type.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setAttributes(filtered)
      }
    } catch (error) {
      toast.error('Failed to load attributes')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAttributes()
  }, [currentStore?._id, searchTerm])

  const form = useForm<AttributeFormValues>({
    resolver: zodResolver(attributeSchema),
    defaultValues: {
      name: '',
      type: 'FABRIC',
      value: ''
    }
  })

  const onSubmit: SubmitHandler<AttributeFormValues> = async (values) => {
    if (!currentStore?._id) {
      toast.error('No store selected')
      return
    }
    setIsSubmitting(true)
    try {
      let result
      if (editingAttribute) {
        result = await window.api.attributes.update(editingAttribute._id, {
          ...values,
          store: currentStore._id
        })
      } else {
        result = await window.api.attributes.create({
          ...values,
          store: currentStore._id
        })
      }

      if (result.success) {
        toast.success(`Attribute ${editingAttribute ? 'updated' : 'created'} successfully`)
        setIsFormOpen(false)
        setEditingAttribute(null)
        form.reset()
        loadAttributes()
      } else {
        toast.error('Error: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const result = await window.api.attributes.delete(deleteId)
      if (result.success) {
        toast.success('Attribute deleted successfully')
        loadAttributes()
      } else {
        toast.error('Error deleting attribute: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setDeleteId(null)
      setIsDeleting(false)
    }
  }

  const openEdit = (attribute: any) => {
    setEditingAttribute(attribute)
    form.reset({
      name: attribute.name,
      type: attribute.type as any,
      value: attribute.value || ''
    })
    setIsFormOpen(true)
  }

  const openAdd = () => {
    setEditingAttribute(null)
    form.reset({ name: '', type: 'FABRIC', value: '#E8705A' })
    setIsFormOpen(true)
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'FABRIC':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'PATTERN':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'COLLECTION':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'PIECE_COUNT':
        return 'bg-[#E8705A]/10 text-[#E8705A] border-[#E8705A]/20'
      case 'COLOR':
        return 'bg-pink-500/10 text-pink-500 border-pink-500/20'
      case 'SIZE':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const columns = [
    { header: 'Name', accessor: 'name' },
    {
      header: 'Type',
      accessor: 'type',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getTypeBadgeColor(item.type)}>
            {ATTRIBUTE_TYPES.find((t) => t.value === item.type)?.label || item.type}
          </Badge>
          {item.type === 'COLOR' && item.value && (
            <div
              className="h-4 w-4 rounded-full border border-white/20 shadow-sm"
              style={{ backgroundColor: item.value }}
              title={item.value}
            />
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: '_id',
      render: (item: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-accent">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="bg-popover border-border text-popover-foreground"
            align="end"
          >
            <DropdownMenuItem
              onClick={() => openEdit(item)}
              className="focus:bg-[#E8705A] focus:text-white cursor-pointer"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteId(item._id)}
              className="focus:bg-red-500 focus:text-white cursor-pointer text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ]

  if (!currentStore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-bold">No Store Selected</h2>
        <p className="text-muted-foreground">Please select a store to manage attributes.</p>
      </div>
    )
  }

  return (
    <>
      <DataPage
        title="Dynamic Attributes"
        description="Manage fabrics, patterns, collections and more for your unstitched cloth POS"
        data={attributes}
        columns={columns}
        searchPlaceholder="Search by name or type..."
        fileName="attributes_export"
        addLabel="Add Attribute"
        onAdd={openAdd}
        isLoading={isLoading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) form.reset()
        }}
      >
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>{editingAttribute ? 'Edit Attribute' : 'Add New Attribute'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attribute Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted border-border">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover border-border">
                        {ATTRIBUTE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {form.watch('type') === 'COLOR' ? 'Color Name' : 'Value / Name'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={
                          form.watch('type') === 'COLOR'
                            ? 'e.g. Royal Blue'
                            : 'e.g. Lawn, 3-Piece, Printed'
                        }
                        className="bg-muted border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('type') === 'COLOR' && (
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-3">
                      <FormLabel>Select Color</FormLabel>
                      <FormControl>
                        <div className="flex flex-col gap-4 items-center p-4 bg-muted/30 rounded-lg border border-border">
                          <HexColorPicker
                            color={field.value || '#E8705A'}
                            onChange={field.onChange}
                          />
                          <div className="flex items-center gap-3 w-full">
                            <div
                              className="w-10 h-10 rounded-lg border border-white/20 shadow-md shrink-0"
                              style={{ backgroundColor: field.value || '#E8705A' }}
                            />
                            <Input
                              {...field}
                              className="bg-muted border-border font-mono uppercase"
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  className="border-border"
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isLoading={isSubmitting}
                  loadingText={editingAttribute ? 'Updating...' : 'Creating...'}
                  className="bg-[#E8705A] hover:bg-[#D4604C] text-black font-semibold"
                >
                  {editingAttribute ? 'Update' : 'Create'}
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DeleteConfirm
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        description="This will permanently delete this attribute. Products using this value will still show it, but it won't be available in the dropdown suggestions."
      />
    </>
  )
}
