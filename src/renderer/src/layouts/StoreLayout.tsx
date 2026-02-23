import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Smartphone,
  Wallet,
  ChevronRight,
  Bell,
  Loader2
} from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { ModeToggle } from '@renderer/components/shared/mode-toggle'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { StoreSwitcher } from '@renderer/components/shared/store-switcher'

const storeMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: ShoppingCart, label: 'POS', href: '/dashboard/pos' },
  { icon: Users, label: 'Customers', href: '/dashboard/customers' },
  {
    icon: Package,
    label: 'Inventory',
    href: '/dashboard/inventory/products',
    submenu: [
      { label: 'Products', href: '/dashboard/inventory/products' },
      { label: 'Categories', href: '/dashboard/inventory/categories' },
      { label: 'Brands', href: '/dashboard/inventory/brands' },
      { label: 'Attributes', href: '/dashboard/inventory/attributes' }
    ]
  },
  { icon: Users, label: 'Suppliers', href: '/dashboard/purchases/suppliers' },
  { icon: BarChart3, label: 'Sale Reports', href: '/dashboard/reports/sales' },

  {
    icon: Wallet,
    label: 'Accounting',
    href: '/dashboard/accounting/accounts',
    submenu: [
      { label: 'Chart of Accounts', href: '/dashboard/accounting/accounts' },
      { label: 'Expenses', href: '/dashboard/accounting/expenses' },
      { label: 'Transactions', href: '/dashboard/accounting/transactions' }
    ]
  },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' }
]

interface StoreLayoutProps {
  onLogout?: () => void
}

export default function StoreLayout({ onLogout }: StoreLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  useEffect(() => {
    const loadUser = () => {
      const userData = localStorage.getItem('user')
      if (!userData) {
        navigate('/login')
        return
      }
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      setIsLoading(false)
    }

    loadUser()

    // Listen for storage changes to sync user data (like avatar) across tabs/layouts
    window.addEventListener('storage', loadUser)
    return () => window.removeEventListener('storage', loadUser)
  }, [navigate])

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    )
  }

  useEffect(() => {
    const activeParent = storeMenuItems.find(
      (item) =>
        item.submenu?.some((subItem) => location.pathname.startsWith(subItem.href)) ||
        (item.submenu && location.pathname.startsWith(item.href))
    )
    if (activeParent && !expandedMenus.includes(activeParent.label)) {
      setExpandedMenus((prev) => [...prev, activeParent.label])
    }
  }, [location.pathname, expandedMenus])

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    } else {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      localStorage.removeItem('selectedStore')
      navigate('/login')
    }
  }

  const isPosPage = location.pathname === '/dashboard/pos'

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#E8705A]" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {!isPosPage && (
        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-20'
            }`}
        >
          <div className="flex h-16 items-center justify-between px-4 border-b border-border">
            {isSidebarOpen ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#E8705A] flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-[#E8705A] to-[#D4604C] bg-clip-text text-transparent">
                  RexPOS
                </span>
              </div>
            ) : (
              <div className="h-8 w-8 rounded-lg bg-[#E8705A] flex items-center justify-center mx-auto">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-144px)] py-4">
            <div className="px-3 space-y-1">
              {storeMenuItems.map((item) => {
                const isActive =
                  item.href === '/dashboard'
                    ? location.pathname === '/dashboard'
                    : location.pathname.startsWith(item.href)
                const isParentActive =
                  item.submenu?.some((subItem) => location.pathname.startsWith(subItem.href)) ||
                  isActive
                const hasSubmenu = item.submenu && item.submenu.length > 0
                const isExpanded = expandedMenus.includes(item.label)

                return (
                  <div key={item.label}>
                    {!hasSubmenu ? (
                      <Link to={item.href}>
                        <Button
                          variant={isActive ? 'secondary' : 'ghost'}
                          className={`w-full justify-start mb-1 ${isActive
                            ? 'bg-[#E8705A]/10 text-[#E8705A] hover:bg-[#E8705A]/20 font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            } ${!isSidebarOpen && 'px-2 justify-center'}`}
                        >
                          <item.icon className={`h-5 w-5 ${isSidebarOpen && 'mr-3'}`} />
                          {isSidebarOpen && <span>{item.label}</span>}
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          className={`w-full justify-between mb-1 ${isParentActive ? 'text-foreground' : 'text-muted-foreground'
                            } ${!isSidebarOpen && 'px-2 justify-center'}`}
                          onClick={() => toggleMenu(item.label)}
                        >
                          <div className="flex items-center">
                            <item.icon className={`h-5 w-5 ${isSidebarOpen && 'mr-3'}`} />
                            {isSidebarOpen && <span>{item.label}</span>}
                          </div>
                          {isSidebarOpen && (
                            <ChevronRight
                              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''
                                }`}
                            />
                          )}
                        </Button>

                        {isSidebarOpen && isExpanded && (
                          <div className="ml-9 space-y-1 border-l border-border/50 pl-3 my-1">
                            {item.submenu?.map((subItem) => (
                              <Link key={subItem.href} to={subItem.href}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`w-full justify-start h-9 ${location.pathname === subItem.href
                                    ? 'text-[#E8705A] bg-[#E8705A]/5'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                  {subItem.label}
                                </Button>
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
            <Button
              variant="ghost"
              className={`w-full justify-start text-red-500 hover:text-red-500 hover:bg-red-500/10 ${!isSidebarOpen && 'px-2 justify-center'
                }`}
              onClick={handleLogout}
            >
              <LogOut className={`h-5 w-5 ${isSidebarOpen && 'mr-3'}`} />
              {isSidebarOpen && <span>Log out</span>}
            </Button>
          </div>
        </aside>
      )}
      <main
        className={`flex-1 transition-all duration-300 ease-in-out ${isPosPage ? 'ml-0' : isSidebarOpen ? 'ml-64' : 'ml-20'
          }`}
      >
        {!isPosPage && (
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <StoreSwitcher />
              <ModeToggle />

              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#E8705A]" />
              </Button>

              <div className="flex items-center gap-3 pl-4 border-l border-border">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase">
                    {user?.globalRole || 'STAFF'}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full hover:bg-transparent"
                    >
                      <Avatar className="h-10 w-10 border border-border cursor-pointer transition-transform hover:scale-105">
                        <AvatarImage src={user?.avatarUrl} />
                        <AvatarFallback className="bg-[#E8705A]/10 text-[#E8705A] font-bold">
                          {user?.fullName?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
        )}

        <div className={`${isPosPage ? 'p-0 h-screen' : 'p-6'} max-w-[1600px] mx-auto space-y-6`}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
