import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataPage } from '@renderer/components/shared/data-page'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Edit, Package as PackageIcon, PackagePlus, Trash2 } from 'lucide-react'

import { toast } from 'sonner'
import { DeleteConfirm } from '@renderer/components/shared/delete-confirm'
import { RestockModal } from '@renderer/components/inventory/restock-modal'

export default function ProductsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const navigate = useNavigate()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [restockProduct, setRestockProduct] = useState<any>(null)

  const [currentStore, setCurrentStore] = useState<any>(null)

  useEffect(() => {
    const storeData = localStorage.getItem('selectedStore')
    if (storeData) {
      setCurrentStore(JSON.parse(storeData))
    }
  }, [])

  // ✅ Helper function to get stock unit based on product type
  const getStockUnit = (product: any) => {
    if (product.productKind === 'RAW_MATERIAL') {
      return 'meters'
    } else {
      return 'pcs'
    }
  }

  // ✅ Helper function to format stock display
  const formatStock = (product: any) => {
    const stock = product.stockLevel || 0
    const unit = getStockUnit(product)

    // For raw materials, show decimal
    if (product.productKind === 'RAW_MATERIAL') {
      return `${stock.toFixed(1)} ${unit}`
    }

    return `${stock} ${unit}`
  }

  // ✅ Helper function to get badge color based on product type
  const getStockBadgeClass = (product: any) => {
    const isLowStock = (product.stockLevel || 0) < (product.minStockLevel || 5)

    if (isLowStock) {
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    }

    if (product.productKind === 'RAW_MATERIAL') {
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    }

    return 'bg-muted text-muted-foreground border-border'
  }

  console.log(products)
  const loadProducts = async () => {
    if (!currentStore?._id) return
    setIsLoading(true)
    try {
      const result = await window.api.products.getAll({
        storeId: currentStore._id,
        page,
        pageSize,
        search: searchTerm,
        includeInactive: showArchived
      })
      console.log(result)
      if (result.success) {
        setProducts(result.data)
        setTotalRecords(result.total)
        setTotalPages(result.totalPages)
      } else {
        toast.error('Failed to load products: ' + result.error)
      }
    } catch (error) {
      toast.error('Failed to load products')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [currentStore?._id, page, pageSize, searchTerm, showArchived])

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const result = await window.api.products.delete(deleteId)
      if (result.success) {
        toast.success(
          result.archived ? 'Product archived successfully' : 'Product deleted successfully'
        )
        setDeleteId(null)
        loadProducts()
      } else {
        toast.error('Failed to delete product: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Failed to delete product: ' + error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const openAdd = () => {
    navigate('/dashboard/inventory/products/create')
  }

  const openEdit = (product: any) => {
    if (product.productKind === 'RAW_MATERIAL') {
      navigate(`/dashboard/inventory/products/${product._id}/edit-raw`)
    } else {
      navigate(`/dashboard/inventory/products/${product._id}/edit`)
    }
  }

  const openDetail = (product: any) => {
    navigate(`/dashboard/inventory/products/${product._id}`)
  }

  const columns = [
    {
      header: 'Sr #',
      accessor: '_id',
      render: (_: any, index: number) => (
        <span className="text-muted-foreground font-mono text-xs">
          {(page - 1) * pageSize + index + 1}
        </span>
      )
    },
    {
      header: 'Product',
      accessor: 'name',
      render: (item: any) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {item.images && item.images.length > 0 ? (
              <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <PackageIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground leading-tight">{item.name}</span>
              {/* ✅ Product type indicator */}
              {item.productKind === 'RAW_MATERIAL' && (
                <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded">
                  📏 FABRIC
                </span>
              )}
              {!item.isActive && (
                <span className="text-[9px] bg-slate-500/10 text-slate-500 px-1.5 py-0.5 rounded">
                  ARCHIVED
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground uppercase font-mono">
              {item.sku}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (item: any) => <span>{item.category?.name}</span>
    },
    {
      header: 'Price',
      accessor: 'sellingPrice',
      render: (item: any) => (
        <div className="flex flex-col">
          <span className="text-[#E8705A] font-bold">
            Rs. {(item.sellingPrice || 0).toLocaleString()}
          </span>
          {/* ✅ Show price unit */}
          <span className="text-[9px] text-muted-foreground">
            per {item.productKind === 'RAW_MATERIAL' ? 'meter' : 'piece'}
          </span>
        </div>
      )
    },
    {
      header: 'Stock',
      accessor: 'stockLevel',
      render: (item: any) => (
        <Badge className={getStockBadgeClass(item)}>
          {formatStock(item)} {/* ✅ Dynamic unit display */}
        </Badge>
      )
    },
    {
      header: 'Stock Value',
      accessor: 'stockValue',
      render: (item: any) => (
        <span className="font-semibold text-foreground">
          Rs. {((item.stockLevel || 0) * (item.sellingPrice || 0)).toLocaleString()}
        </span>
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
            className="h-8 w-8 hover:bg-accent hover:text-[#E8705A]"
            onClick={() => setRestockProduct(item)}
          >
            <PackagePlus className="w-4 h-4" />
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
        <p className="text-muted-foreground">Please select a store to manage products.</p>
      </div>
    )
  }

  return (
    <>
      <DataPage
        title="Products"
        description="Manage your product inventory and stock levels."
        data={products}
        columns={columns}
        searchPlaceholder="Search products, SKU..."
        fileName="products_export"
        addLabel="Add Product"
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
        onRowClick={(item) => openDetail(item)}
        extraActions={
          <Button
            variant="outline"
            className="border-border"
            onClick={() => {
              setShowArchived((prev) => !prev)
              setPage(1)
            }}
          >
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>
        }
      />

      <DeleteConfirm
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        description="Products with sales will be archived instead of deleted."
      />

      <RestockModal
        open={!!restockProduct}
        onOpenChange={(open) => !open && setRestockProduct(null)}
        product={restockProduct}
        currentStore={currentStore}
        onSuccess={() => {
          loadProducts()
        }}
      />
    </>
  )
}
