import { useState, useEffect } from 'react'
import { DataPage } from '@renderer/components/shared/data-page'
import { SearchableSelect } from '@renderer/components/shared/searchable-select'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Button } from '@renderer/components/ui/button'
import { Edit, Trash2 } from 'lucide-react'
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

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  parent: z.string().optional().or(z.literal(''))
})

type CategoryFormValues = z.infer<typeof categorySchema>

export default function CategoriesPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [currentStore, setCurrentStore] = useState<any>(null)

  useEffect(() => {
    const storeData = localStorage.getItem('selectedStore')
    if (storeData) {
      setCurrentStore(JSON.parse(storeData))
    }
  }, [])

  const loadCategories = async () => {
    if (!currentStore?._id) return
    setIsLoading(true)
    try {
      const result = await window.api.categories.getAll({
        storeId: currentStore._id,
        page,
        pageSize,
        search: searchTerm
      })
      if (result.success) {
        setCategories(result.data)
        setTotalRecords(result.total || result.data.length)
        setTotalPages(result.totalPages || 1)
      }
    } catch (error) {
      toast.error('Failed to load categories')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [currentStore?._id, page, pageSize, searchTerm])

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      parent: ''
    }
  })

  const onSubmit: SubmitHandler<CategoryFormValues> = async (values) => {
    if (!currentStore?._id) {
      toast.error('No store selected')
      return
    }
    setIsSubmitting(true)
    try {
      let result
      if (editingCategory) {
        result = await window.api.categories.update(editingCategory._id, {
          name: values.name,
          parent: values.parent || null,
          store: currentStore._id
        })
      } else {
        result = await window.api.categories.create({
          name: values.name,
          parent: values.parent || null,
          store: currentStore._id
        })
      }

      if (result.success) {
        toast.success(`Category ${editingCategory ? 'updated' : 'created'} successfully`)
        setIsFormOpen(false)
        setEditingCategory(null)
        form.reset()
        loadCategories()
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
      const result = await window.api.categories.delete(deleteId)
      if (result.success) {
        toast.success('Category deleted successfully')
        loadCategories()
      } else {
        toast.error('Error deleting category: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setDeleteId(null)
      setIsDeleting(false)
    }
  }

  const openEdit = (category: any) => {
    setEditingCategory(category)
    form.reset({
      name: category.name,
      parent: category.parent?._id || category.parent || ''
    })
    setIsFormOpen(true)
  }

  const openAdd = () => {
    setEditingCategory(null)
    form.reset({ name: '', parent: '' })
    setIsFormOpen(true)
  }

  const columns = [
    { header: 'Category Name', accessor: 'name' },
    {
      header: 'Parent',
      accessor: 'parent',
      render: (item: any) => (
        <span className="text-muted-foreground italic">{item.parent?.name || 'None (Main)'}</span>
      )
    },
    {
      header: 'Actions',
      accessor: '_id',
      render: (item: any) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-accent hover:text-[#E8705A]"
            onClick={() => openEdit(item)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500"
            onClick={() => setDeleteId(item._id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ]

  if (!currentStore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-bold">No Store Selected</h2>
        <p className="text-muted-foreground">Please select a store to manage categories.</p>
      </div>
    )
  }

  return (
    <>
      <DataPage
        title="Categories"
        description="Organize your products by categories"
        data={categories}
        columns={columns}
        searchPlaceholder="Search categories..."
        fileName="categories_export"
        addLabel="Add Category"
        onAdd={openAdd}
        isLoading={isLoading}
        currentPage={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize)
          setPage(1)
        }}
        searchTerm={searchTerm}
        onSearchChange={(term) => {
          setSearchTerm(term)
          setPage(1)
        }}
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
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ladies / Gents / Blanket / Quilt"
                        className="bg-muted border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Category (Optional)</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        options={[
                          { label: 'None (Main Category)', value: '' },
                          ...categories
                            .filter((c) => c._id !== editingCategory?._id && !c.parent) // Only show main categories as parents
                            .map((c) => ({ label: c.name, value: c._id }))
                        ]}
                        placeholder="Select Parent Category"
                        searchPlaceholder="Search category..."
                        emptyText="No category found."
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Leave empty to make this a main category.
                    </p>
                  </FormItem>
                )}
              />
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
                  loadingText={editingCategory ? 'Updating...' : 'Creating...'}
                  className="bg-[#E8705A] hover:bg-[#D4604C] text-black font-semibold"
                >
                  {editingCategory ? 'Update' : 'Create'}
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
        description="This will permanently delete this category. Products in this category will need to be reassigned."
      />
    </>
  )
}
