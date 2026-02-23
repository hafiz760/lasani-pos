import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Building2,
  UserCog,
  Loader2,
  Shield,
  Lock
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

const adminMenuItems = [
  { icon: LayoutDashboard, label: 'Admin Dashboard', href: '/admin' },
  { icon: Building2, label: 'Store Management', href: '/admin/stores' },
  { icon: UserCog, label: 'User Management', href: '/admin/users' },
  { icon: Lock, label: 'Roles & Permissions', href: '/admin/roles' }
]

interface AdminLayoutProps {
  onLogout?: () => void
}

export default function AdminLayout({ onLogout }: AdminLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUser = () => {
      const userData = localStorage.getItem('user')
      if (!userData) {
        navigate('/login')
        return
      }
      const parsedUser = JSON.parse(userData)
      if (parsedUser.globalRole !== 'ADMIN') {
        navigate('/dashboard')
        return
      }
      setUser(parsedUser)
      setIsLoading(false)
    }

    loadUser()

    // Listen for storage changes to sync user data (like avatar) across tabs/layouts
    window.addEventListener('storage', loadUser)
    return () => window.removeEventListener('storage', loadUser)
  }, [navigate])

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    } else {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      navigate('/login')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#E8705A]" />
      </div>
    )
  }

  if (!user || user.globalRole !== 'ADMIN') {
    return null
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          {isSidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#E8705A] flex items-center justify-center">
                <Shield className="h-5 w-5 text-black" />
              </div>
              <div className="absolute inset-0 bg-linear-to-r from-[#E8705A]/10 to-purple-500/10 blur-3xl" />
              <span className="text-xl font-bold bg-gradient-to-r from-[#E8705A] to-[#D4604C] bg-clip-text text-transparent">
                RexPOS
              </span>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-lg bg-[#E8705A] flex items-center justify-center mx-auto">
              <Shield className="h-5 w-5 text-black" />
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
            {adminMenuItems.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={`w-full justify-start mb-1 ${
                      isActive
                        ? 'bg-[#E8705A]/10 text-[#E8705A] hover:bg-[#E8705A]/20 font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    } ${!isSidebarOpen && 'px-2 justify-center'}`}
                  >
                    <item.icon className={`h-5 w-5 ${isSidebarOpen && 'mr-3'}`} />
                    {isSidebarOpen && <span>{item.label}</span>}
                  </Button>
                </Link>
              )
            })}
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <Button
            variant="ghost"
            className={`w-full justify-start text-red-500 hover:text-red-500 hover:bg-red-500/10 ${
              !isSidebarOpen && 'px-2 justify-center'
            }`}
            onClick={handleLogout}
          >
            <LogOut className={`h-5 w-5 ${isSidebarOpen && 'mr-3'}`} />
            {isSidebarOpen && <span>Log out</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
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
            <div className="absolute -inset-0.5 bg-linear-to-r from-[#E8705A] to-purple-500 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Super Admin Console
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <ModeToggle />

            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs text-muted-foreground mt-1 text-purple-400 font-bold uppercase">
                  SUPER ADMIN
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
                      <AvatarFallback className="bg-purple-600 text-white font-bold">
                        SA
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin/profile" className="cursor-pointer flex items-center">
                      <UserCog className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
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

        <div className="p-6 w-full space-y-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
