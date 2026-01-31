import { useState, useRef, useEffect } from 'react'
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Package,
  CheckCircle2,
  Printer,
  ShoppingBag,
  SearchX
} from 'lucide-react'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@renderer/components/ui/card'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Badge } from '@renderer/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@renderer/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@renderer/components/ui/form'
import { useNavigate } from 'react-router-dom'
import { printContent } from '@renderer/lib/print-utils'

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

const checkoutSchema = z.object({
  customerName: z.string().optional().or(z.literal('')),
  customerPhone: z.string().optional().or(z.literal('')),
  customerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  discountPercent: z.number().min(0).max(100),
  discountAmount: z.number().min(0),
  taxAmount: z.number().min(0),
  paymentMethod: z.enum(['Cash', 'Card', 'Bank Transfer', 'Installment', 'Credit'])
})

type CheckoutFormValues = z.infer<typeof checkoutSchema>

export default function POSPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentStore, setCurrentStore] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Receipt state
  const [lastSale, setLastSale] = useState<any>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Custom dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Low Stock Alert State
  const [stockAlert, setStockAlert] = useState<{
    open: boolean
    message: string
    product: any | null
  }>({
    open: false,
    message: '',
    product: null
  })

  useEffect(() => {
    const storeData = localStorage.getItem('selectedStore')
    if (storeData) {
      setCurrentStore(JSON.parse(storeData))
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setIsDropdownOpen(false)
        setSelectedIndex(0)
      }
      // F5 to complete sale (when cart has items)
      if (e.key === 'F5' && cart.length > 0 && !isSubmitting && !showReceipt) {
        e.preventDefault()
        form.handleSubmit(onSubmit)()
      }
      // F1 to clear cart
      if (e.key === 'F1' && cart.length > 0 && !showReceipt) {
        e.preventDefault()
        setCart([])
        toast.success('Cart cleared')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart, isSubmitting, showReceipt])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
        setSelectedIndex(0)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadProducts = async () => {
    if (!currentStore?._id) return
    setIsLoading(true)
    try {
      const result = await window.api.products.getAll({
        storeId: currentStore._id,
        pageSize: 1000
      })
      if (result.success) {
        setProducts(result.data)
      } else {
        toast.error('Failed to load products')
      }
    } catch (error) {
      toast.error('Error loading products')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (currentStore?._id) {
      loadProducts()
    }
  }, [currentStore?._id])

  const manualRefresh = async () => {
    await loadProducts()
    toast.success('Product prices refreshed')
  }

  const filteredProducts = products.filter(
    (p: any) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase())
  )

  // Reset selected index when filtered products change
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (search.trim()) {
        // Check for exact match first
        const exactMatch = products.find(
          (p: any) =>
            p.sku?.toLowerCase() === search.toLowerCase() ||
            p.barcode?.toLowerCase() === search.toLowerCase()
        )

        if (exactMatch) {
          addToCart(exactMatch)
          setSearch('')
          setIsDropdownOpen(false)
          setSelectedIndex(0)
        } else if (filteredProducts.length > 0) {
          // Add the selected product from dropdown
          addToCart(filteredProducts[selectedIndex])
          setSearch('')
          setIsDropdownOpen(false)
          setSelectedIndex(0)
        } else {
          setIsDropdownOpen(true)
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isDropdownOpen) {
        setIsDropdownOpen(true)
      } else if (selectedIndex < filteredProducts.length - 1) {
        setSelectedIndex(selectedIndex + 1)
        scrollToSelected(selectedIndex + 1)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (isDropdownOpen && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1)
        scrollToSelected(selectedIndex - 1)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsDropdownOpen(false)
      setSelectedIndex(0)
    }
  }

  const scrollToSelected = (index: number) => {
    const dropdown = dropdownRef.current
    if (dropdown) {
      const items = dropdown.querySelectorAll('[data-product-item]')
      const selectedItem = items[index] as HTMLElement
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearch(value)
    if (value.trim().length > 0) {
      setIsDropdownOpen(true)
    } else {
      setIsDropdownOpen(false)
    }
    setSelectedIndex(0)
  }

  const addToCart = (product: any) => {
    const stock = product.stockLevel || 0
    if (stock <= 0) {
      setStockAlert({
        open: true,
        message: 'This item is currently out of stock.',
        product: product
      })
      return
    }

    const existingItem = cart.find((item: any) => item._id === product._id)
    if (existingItem) {
      if (existingItem.quantity >= stock) {
        setStockAlert({
          open: true,
          message: 'You cannot add more of this item. Maximum stock level reached.',
          product: product
        })
        return
      }
      setCart(
        cart.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        )
      )
      toast.success(`Added ${product.name} to cart`)
    } else {
      setCart([
        ...cart,
        { ...product, quantity: 1, sellingPrice: product.sellingPrice || product.buyingPrice || 0 }
      ])
      toast.success(`${product.name} added to cart`)
    }
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(
      cart.map((item: any) => {
        if (item._id === id) {
          const newQty = item.quantity + delta
          const product = products.find((p: any) => p._id === id)
          if (!product) return item

          if (newQty > (product.stockLevel || 0)) {
            setStockAlert({
              open: true,
              message: 'Maximum available stock reached for this item.',
              product: product
            })
            return item
          }
          return newQty > 0 ? { ...item, quantity: newQty } : item
        }
        return item
      })
    )
  }

  const updatePrice = (id: string, newPrice: number) => {
    setCart(cart.map((item: any) => (item._id === id ? { ...item, sellingPrice: newPrice } : item)))
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item._id !== id))
  }

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      discountPercent: 0,
      discountAmount: 0,
      taxAmount: 0,
      paymentMethod: 'Cash'
    }
  })

  const formValues = useWatch({ control: form.control })
  const { discountPercent, discountAmount, taxAmount } = formValues

  const subtotal = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0)
  const effectiveDiscount =
    (discountAmount || 0) > 0 ? discountAmount || 0 : subtotal * ((discountPercent || 0) / 100)
  const total = subtotal - effectiveDiscount + (taxAmount || 0)

  const onSubmit = async (values: CheckoutFormValues) => {
    if (cart.length === 0) return
    if (!currentStore?._id) return

    // Get user from local storage
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null
    if (!user) {
      toast.error('User session not found. Please login again.')
      return
    }

    setIsSubmitting(true)
    try {
      // Calculate total profit
      let totalProfit = 0

      const items = cart.map((item) => {
        const costPrice = item.buyingPrice || 0
        const profit = (item.sellingPrice - costPrice) * item.quantity
        totalProfit += profit

        return {
          product: item._id,
          productName: item.name,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
          costPrice: costPrice,
          totalAmount: item.sellingPrice * item.quantity,
          profitAmount: profit,
          discountAmount: 0
        }
      })

      // Adjust total profit with global discount
      if (effectiveDiscount > 0) {
        totalProfit -= effectiveDiscount
      }

      const paidAmount = values.paymentMethod === 'Credit' ? 0 : total
      const paymentStatus = values.paymentMethod === 'Credit' ? 'PENDING' : 'PAID'

      const salePayload = {
        store: currentStore._id,
        soldBy: user.id || user._id,
        invoiceNumber: `INV-${Date.now()}`,
        customerName: values.customerName || undefined,
        customerPhone: values.customerPhone || undefined,
        customerEmail: values.customerEmail || undefined,
        items: items,
        totalAmount: total,
        subtotal: subtotal,
        taxAmount: values.taxAmount,
        discountAmount: effectiveDiscount,
        discountPercent: values.discountPercent,
        paidAmount: paidAmount,
        paymentMethod: values.paymentMethod,
        paymentStatus: paymentStatus,
        profitAmount: totalProfit,
        saleDate: new Date()
      }

      const result = await window.api.sales.create(salePayload)

      if (result.success) {
        toast.success('Sale completed successfully!')
        setCart([])
        form.reset({
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          discountPercent: 0,
          discountAmount: 0,
          taxAmount: 0,
          paymentMethod: 'Cash'
        })
        setLastSale(salePayload)
        setShowReceipt(true)
        loadProducts()
      } else {
        toast.error('Sale failed: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrint = async () => {
    const content = receiptRef.current
    if (!content) return

    await printContent({
      title: 'Receipt',
      content: content.innerHTML
    })

    setTimeout(() => {
      setShowReceipt(false)
      setLastSale(null)
    }, 1000)
  }

  const handleCloseReceipt = () => {
    setShowReceipt(false)
    setLastSale(null)
  }

  if (!currentStore) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] text-muted-foreground p-8">
        <h2 className="text-2xl font-bold mb-2">No Store Selected</h2>
        <p>Please select a store to access the POS system.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen animate-in fade-in duration-500 overflow-hidden bg-background p-4 gap-4">
      {/* Top Search Bar with Custom Dropdown */}
      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search item by name, SKU or barcode (F2)..."
              className="bg-card text-foreground border-border pl-14 h-14 text-xl focus:border-[#4ade80] focus:ring-[#4ade80]/20 rounded-xl w-full"
              value={search}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              autoFocus
              title="Keyboard shortcuts: F2=Focus, ↑↓=Navigate, Enter=Add, ESC=Close, F5=Complete sale, F1=Clear cart"
            />
          </div>

          {/* Custom Dropdown */}
          {isDropdownOpen && filteredProducts.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-50 max-h-[500px] overflow-hidden flex flex-col"
            >
              <div className="overflow-y-auto max-h-[450px] custom-scrollbar">
                <div className="p-2">
                  <div className="text-xs font-black uppercase text-muted-foreground px-3 py-2 border-b border-border">
                    Product Results ({filteredProducts.length})
                  </div>
                  {filteredProducts.map((product, index) => (
                    <div
                      key={product._id}
                      data-product-item
                      className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all border-b border-border/30 last:border-0 ${
                        index === selectedIndex
                          ? 'bg-[#4ade80]/20 ring-2 ring-[#4ade80]/50'
                          : 'hover:bg-[#4ade80]/10'
                      }`}
                      onClick={() => {
                        addToCart(product)
                        setSearch('')
                        setIsDropdownOpen(false)
                        setSelectedIndex(0)
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="h-12 w-12 bg-muted/50 rounded-lg flex items-center justify-center overflow-hidden border border-border shrink-0">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground/20" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-sm text-foreground truncate">
                            {product.name}
                          </h4>
                          <span className="font-black text-sm text-[#4ade80] shrink-0 ml-2">
                            Rs. {product.sellingPrice?.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter bg-muted/50 px-1.5 py-0.5 rounded">
                            SKU: {product.sku || '-'}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-black h-4 px-1 ${
                              product.stockLevel < 5
                                ? 'text-red-500 border-red-500/20'
                                : 'text-green-500 border-green-500/20'
                            }`}
                          >
                            {product.stockLevel} IN STOCK
                          </Badge>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-[#4ade80]" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-muted/20 border-t border-border flex justify-between items-center text-[9px] font-black text-muted-foreground tracking-widest uppercase shrink-0">
                <span>↑↓ Navigate • Enter to add</span>
                <span>ESC to close • F2 to search</span>
              </div>
            </div>
          )}

          {/* No Results Message */}
          {isDropdownOpen && search.trim() && filteredProducts.length === 0 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-50 p-8"
            >
              <div className="flex flex-col items-center gap-2">
                <SearchX className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm font-black uppercase text-muted-foreground">
                  No matches found
                </p>
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={manualRefresh}
          className="h-14 w-14 bg-card hover:bg-accent text-foreground border border-border rounded-xl"
          title="Refresh prices"
        >
          <Package className="w-6 h-6" />
        </Button>
        <Button
          onClick={() => navigate('/dashboard')}
          className="h-14 px-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold"
        >
          Exit POS
        </Button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Main Area: Cart Items */}
        <div className="flex-1 flex flex-col overflow-hidden bg-card/30 rounded-2xl border border-border">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-[#4ade80]" />
              Current Order
            </h2>
            <Badge className="bg-[#4ade80] text-black hover:bg-[#4ade80] font-black h-8 px-4 text-sm">
              {cart.length} {cart.length === 1 ? 'ITEM' : 'ITEMS'}
            </Badge>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground italic gap-4">
                  <div className="relative">
                    <ShoppingCart className="w-32 h-32 opacity-10" />
                    <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-muted border-4 border-background flex items-center justify-center font-bold text-lg opacity-50">
                      0
                    </div>
                  </div>
                  <p className="text-2xl font-black uppercase tracking-widest opacity-20">
                    Your cart is empty
                  </p>
                  <p className="text-sm not-italic font-bold text-[#4ade80] animate-pulse">
                    Press F2 to search and add products
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b border-border">
                    <div className="col-span-6">Product Details</div>
                    <div className="col-span-2 text-center">Price</div>
                    <div className="col-span-2 text-center">Quantity</div>
                    <div className="col-span-2 text-right">Subtotal</div>
                  </div>
                  {cart.map((item) => (
                    <div
                      key={item._id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-card p-4 rounded-xl border border-border hover:border-[#4ade80]/50 transition-all group relative"
                    >
                      <div className="col-span-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 border border-border">
                          {item.images?.[0] ? (
                            <img
                              src={item.images[0]}
                              alt={item.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-foreground text-sm truncate">
                            {item.name}
                          </h4>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                            {item.sku || 'No SKU'} • {item.category?.name || 'General'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 md:hidden absolute top-2 right-2"
                          onClick={() => removeFromCart(item._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="col-span-2">
                        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-2 border border-border">
                          <span className="text-xs font-black text-[#4ade80]">Rs.</span>
                          <input
                            type="number"
                            className="w-full bg-transparent text-sm font-black text-foreground focus:outline-none"
                            value={item.sellingPrice === 0 ? '' : item.sellingPrice}
                            onChange={(e) =>
                              updatePrice(
                                item._id,
                                e.target.value === '' ? 0 : Number(e.target.value)
                              )
                            }
                            onFocus={(e) => e.target.select()}
                          />
                        </div>
                      </div>

                      <div className="col-span-2 flex justify-center">
                        <div className="flex items-center bg-muted rounded-lg border border-border p-1">
                          <button
                            onClick={() => updateQuantity(item._id, -1)}
                            className="h-8 w-8 rounded-md hover:bg-background flex items-center justify-center transition-colors text-[#4ade80]"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center text-sm font-black text-foreground">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item._id, 1)}
                            className="h-8 w-8 rounded-md hover:bg-background flex items-center justify-center transition-colors text-[#4ade80]"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="col-span-2 text-right flex flex-col items-end gap-1">
                        <span className="text-xs font-black uppercase text-muted-foreground tracking-widest md:hidden">
                          Subtotal
                        </span>
                        <span className="text-lg font-black text-foreground">
                          Rs. {(item.sellingPrice * item.quantity).toLocaleString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 hidden md:flex"
                          onClick={() => removeFromCart(item._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Right Area: Checkout Details */}
        <Card className="w-full lg:w-[400px] bg-card border-border flex flex-col shadow-2xl overflow-hidden shrink-0 rounded-2xl">
          <CardHeader className="border-b border-border py-4 bg-muted/30">
            <CardTitle className="text-lg font-black uppercase tracking-tight">
              Order Summary
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Checkout Totals */}
                <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-muted-foreground">
                      Subtotal
                    </span>
                    <span className="font-black text-foreground">
                      Rs. {(subtotal || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-muted-foreground">
                      Tax Amount
                    </span>
                    <FormField
                      control={form.control}
                      name="taxAmount"
                      render={({ field }) => (
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value === 0 ? '' : field.value}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
                            }
                            className="h-9 w-28 bg-background border-border text-right font-black"
                            placeholder="0"
                          />
                        </FormControl>
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-muted-foreground">
                      Discount (Rs.)
                    </span>
                    <FormField
                      control={form.control}
                      name="discountAmount"
                      render={({ field }) => (
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value === 0 ? '' : field.value}
                            onChange={(e) => {
                              field.onChange(
                                e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
                              )
                              form.setValue('discountPercent', 0)
                            }}
                            className="h-9 w-28 bg-background border-border text-right font-black text-red-500"
                            placeholder="0"
                          />
                        </FormControl>
                      )}
                    />
                  </div>

                  <div className="pt-4 border-t border-border flex justify-between items-center">
                    <span className="text-sm font-black uppercase tracking-widest text-[#4ade80]">
                      Grand Total
                    </span>
                    <span className="text-3xl font-black text-[#4ade80]">
                      Rs. {(total || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest border-l-4 border-[#4ade80] pl-3">
                    Customer Information
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Customer Name"
                              {...field}
                              className="h-11 bg-muted/50 border-border font-bold"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Phone Number"
                              {...field}
                              className="h-11 bg-muted/50 border-border font-bold"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest border-l-4 border-[#4ade80] pl-3">
                    Payment Method
                  </h4>
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <div className="grid grid-cols-2 gap-2">
                        {['Cash', 'Card', 'Bank Transfer', 'Credit'].map((method) => (
                          <Button
                            key={method}
                            type="button"
                            variant="outline"
                            className={`h-12 font-black border-2 transition-all duration-200 ${
                              field.value === method
                                ? 'bg-[#4ade80] text-[#4ade80] border-[#4ade80] hover:bg-[#4ade80] hover:text-[#4ade80] hover:border-[#4ade80]'
                                : 'bg-transparent text-foreground border-border hover:bg-muted'
                            }`}
                            onClick={() => field.onChange(method)}
                          >
                            {method.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    )}
                  />
                </div>

                <LoadingButton
                  type="submit"
                  className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-black font-black uppercase text-lg tracking-widest h-16 shadow-2xl shadow-[#4ade80]/30 rounded-xl"
                  isLoading={isSubmitting}
                  loadingText="PROCESSING..."
                  disabled={cart.length === 0}
                >
                  <ShoppingBag className="w-6 h-6 mr-2" />
                  Place Order
                </LoadingButton>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alert Dialog */}
      <Dialog
        open={stockAlert.open}
        onOpenChange={(open) => setStockAlert({ ...stockAlert, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Alert</DialogTitle>
            <DialogDescription>{stockAlert.message}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal - Keep your existing receipt code here */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-center text-[#4ade80]">
              Sale Completed Successfully!
            </DialogTitle>
            <DialogDescription className="text-center">
              Thank you for your purchase. Here is your receipt.
            </DialogDescription>
          </DialogHeader>

          <div ref={receiptRef} className="space-y-6 p-6 bg-card">
            {/* Store Info */}
            <div className="text-center border-b-2 border-dashed pb-4">
              <h2 className="text-2xl font-black uppercase tracking-wider">
                {currentStore?.name || 'Store'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {currentStore?.address || 'Store Address'}
              </p>
              <p className="text-sm text-muted-foreground">
                Tel: {currentStore?.phone || 'Store Phone'}
              </p>
            </div>

            {/* Receipt Details */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Invoice #:</span>
                <span className="font-mono font-black">{lastSale?.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Date:</span>
                <span className="font-mono">
                  {lastSale?.saleDate
                    ? format(new Date(lastSale.saleDate), 'MMM dd, yyyy HH:mm')
                    : format(new Date(), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
              {lastSale?.customerName && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">Customer:</span>
                  <span>{lastSale.customerName}</span>
                </div>
              )}
              {lastSale?.customerPhone && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">Phone:</span>
                  <span>{lastSale.customerPhone}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="border-2 border-dashed rounded-lg p-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-dashed">
                    <TableHead className="text-left">Item</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lastSale?.items?.map((item: any, index: number) => (
                    <TableRow key={index} className="border-b border-dashed">
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-black">{item.productName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono">
                        Rs. {item.sellingPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-black">
                        Rs. {item.totalAmount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="space-y-2 border-t-2 border-dashed pt-4">
              <div className="flex justify-between items-center">
                <span className="font-bold">Subtotal:</span>
                <span className="font-mono">Rs. {lastSale?.subtotal?.toLocaleString() || '0'}</span>
              </div>
              {lastSale?.taxAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="font-bold">Tax:</span>
                  <span className="font-mono">Rs. {lastSale.taxAmount.toLocaleString()}</span>
                </div>
              )}
              {lastSale?.discountAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="font-bold">Discount:</span>
                  <span className="font-mono text-red-500">
                    -Rs. {lastSale.discountAmount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-xl font-black text-[#4ade80] border-t-2 border-dashed pt-2">
                <span>Total:</span>
                <span>Rs. {lastSale?.totalAmount?.toLocaleString() || '0'}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="border-t-2 border-dashed pt-4">
              <div className="flex justify-between items-center">
                <span className="font-bold">Payment Method:</span>
                <span className="font-black uppercase">{lastSale?.paymentMethod || 'Cash'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold">Status:</span>
                <span
                  className={`font-black uppercase ${lastSale?.paymentStatus === 'PAID' ? 'text-green-500' : 'text-yellow-500'}`}
                >
                  {lastSale?.paymentStatus || 'PAID'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center border-t-2 border-dashed pt-4">
              <p className="text-sm font-bold">Thank you for your business!</p>
              <p className="text-xs text-muted-foreground mt-1">Please come again</p>
            </div>
          </div>

          <div className="flex justify-between gap-4 pt-4 border-t">
            <Button variant="outline" onClick={handleCloseReceipt} className="flex-1">
              Close
            </Button>
            <Button
              onClick={handlePrint}
              className="flex-1 bg-[#4ade80] hover:bg-[#22c55e] text-black font-black"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
