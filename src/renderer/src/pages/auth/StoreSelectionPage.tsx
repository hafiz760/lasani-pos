import { useNavigate } from 'react-router-dom'
import { StoreSelection } from '@renderer/components/shared/store-selection'
import { ModeToggle } from '@renderer/components/shared/mode-toggle'
import { Smartphone } from 'lucide-react'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function StoreSelectionPage() {
  const navigate = useNavigate()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleSelect = (store: any) => {
    setIsRefreshing(true)
    localStorage.setItem('selectedStore', JSON.stringify(store))

    // Brief timeout to show a nice loading state before transition
    setTimeout(() => {
      navigate('/dashboard')
      window.location.reload() // Ensure all contexts are fresh
    }, 800)
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background elements for premium feel */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#4ade80]/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <header className="fixed top-0 left-0 right-0 h-20 px-8 flex items-center justify-between border-b border-border/50 bg-background/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-[#4ade80] flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-black" />
          </div>
          <span className="text-2xl font-bold bg-linear-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
            ShopPOS
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle />
          <button
            onClick={() => {
              localStorage.removeItem('user')
              localStorage.removeItem('token')
              localStorage.removeItem('selectedStore')
              navigate('/login')
            }}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="pt-24 pb-12">
        {isRefreshing ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4 animate-in fade-in duration-500">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-2 border-border" />
              <Loader2 className="h-16 w-16 animate-spin text-[#4ade80] absolute top-0 left-0" />
            </div>
            <p className="text-xl font-medium animate-pulse">Initializing Store Environment...</p>
            <p className="text-muted-foreground">Loading inventory, sales and reports data...</p>
          </div>
        ) : (
          <StoreSelection onSelect={handleSelect} />
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 py-6 border-t border-border/20 text-center">
        <p className="text-xs text-muted-foreground">
          &copy; 2026 ShopPOS. Secure Multi-Store Management System.
        </p>
      </footer>
    </div>
  )
}
