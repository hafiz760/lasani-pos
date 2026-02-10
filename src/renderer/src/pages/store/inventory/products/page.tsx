import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataPage } from '@renderer/components/shared/data-page'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { MoreVertical, Edit, Eye, Package as PackageIcon, PackagePlus, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { DeleteConfirm } from '@renderer/components/shared/delete-confirm'
import { RestockModal } from '@renderer/components/inventory/restock-modal'

// Color mapping (named colors to hex values)
const COLOR_MAP: { [key: string]: string } = {
  Green: '#4ade80',
  Blue: '#60a5fa',
  Red: '#f87171',
  Amber: '#fbbf24',
  Violet: '#a78bfa',
  Pink: '#f472b6',
  Orange: '#fb923c',
  Teal: '#2dd4bf',
  Indigo: '#818cf8',
  Emerald: '#34d399',
  Yellow: '#fde047',
  Fuchsia: '#e879f9',
  Purple: '#c084fc',
  Slate: '#94a3b8',
  Stone: '#a8a29e',
  Black: '#000000',
  White: '#ffffff',
  Gray: '#475569',
  Crimson: '#ef4444',
  Sky: '#3b82f6'
}

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
    } else if (product.productKind === 'COMBO_SET') {
      return 'sets'
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

    if (product.productKind === 'COMBO_SET') {
      return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
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
    if (product.productKind === 'RAW') {
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
              {item.productKind === 'COMBO_SET' && (
                <span className="text-[9px] bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded">
                  🎁 COMBO
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
      render: (item: any) => (
        <div className="flex flex-col">
          <span>{item.category?.name}</span>
          {item.subcategory && (
            <span className="text-[10px] text-muted-foreground italic">
              {item.subcategory.name}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Color',
      accessor: 'color',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          {item.color && item.color !== 'none' ? (
            <>
              <div
                className="h-4 w-4 rounded-full border border-border shadow-sm"
                style={{ backgroundColor: COLOR_MAP[item.color] || item.color }}
              />
              <span className="text-[10px] text-muted-foreground font-mono uppercase">
                {item.color}
              </span>
            </>
          ) : (
            <span className="text-[10px] text-muted-foreground italic">None</span>
          )}
        </div>
      )
    },
    {
      header: 'Brand',
      accessor: 'brand.name',
      render: (item: any) =>
        item.brand?.name || <span className="text-muted-foreground italic">No Brand</span>
    },
    {
      header: 'Price',
      accessor: 'sellingPrice',
      render: (item: any) => (
        <div className="flex flex-col">
          <span className="text-[#4ade80] font-bold">
            Rs. {(item.sellingPrice || 0).toLocaleString()}
          </span>
          {/* ✅ Show price unit */}
          <span className="text-[9px] text-muted-foreground">
            per{' '}
            {item.productKind === 'RAW_MATERIAL'
              ? 'meter'
              : item.productKind === 'COMBO_SET'
                ? 'set'
                : 'piece'}
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
              onClick={() => openDetail(item)}
              className="focus:bg-[#4ade80] focus:text-black cursor-pointer"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openEdit(item)}
              className="focus:bg-[#4ade80] focus:text-black cursor-pointer"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setRestockProduct(item)}
              className="focus:bg-[#4ade80] focus:text-black cursor-pointer"
            >
              <PackagePlus className="w-4 h-4 mr-2" />
              Quick Restock
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteId(item._id)}
              className="focus:bg-red-500 focus:text-white cursor-pointer text-red-500"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete / Archive
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
