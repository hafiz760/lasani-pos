import { useState, useEffect } from 'react'
import { Store as StoreIcon, ArrowRight, Building2, MapPin } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { motion } from 'framer-motion'

interface StoreSelectionProps {
  onSelect: (store: any) => void
}

export function StoreSelection({ onSelect }: StoreSelectionProps) {
  const [stores, setStores] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async () => {
    setIsLoading(true)
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) return
      const user = JSON.parse(userStr)

      const result = await window.api.users.getStores(user.id || user._id)
      if (result.success) {
        setStores(result.data.map((item: any) => item.store))
      }
    } catch (error) {
      console.error('Failed to load stores:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E8705A]"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-12 space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#E8705A]/10 border border-[#E8705A]/20 mb-4">
          <StoreIcon className="w-8 h-8 text-[#E8705A]" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Select Your <span className="text-[#E8705A]">Store</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Choose one of your assigned stores to access the management dashboard and POS system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map((store) => (
          <motion.div
            key={store._id}
            whileHover={{ y: -5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Card
              className="group relative overflow-hidden bg-card border-border hover:border-[#E8705A]/50 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-[#E8705A]/5"
              onClick={() => onSelect(store)}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Building2 className="w-16 h-16" />
              </div>

              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-[#E8705A]/20 transition-colors">
                    <StoreIcon className="w-5 h-5 text-muted-foreground group-hover:text-[#E8705A]" />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded">
                    {store.code || 'STORE'}
                  </div>
                </div>
                <CardTitle className="text-xl group-hover:text-[#E8705A] transition-colors">
                  {store.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {store.address || 'Default Location'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <div className="flex items-center gap-4 py-3 border-y border-border/50">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                      Contact
                    </p>
                    <p className="text-sm font-medium">{store.phone || 'No phone set'}</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                      Status
                    </p>
                    <span className="inline-flex h-2 w-2 rounded-full bg-[#E8705A] mr-2"></span>
                    <span className="text-sm font-medium">Active</span>
                  </div>
                </div>
                <Button className="w-full bg-[#E8705A] hover:bg-[#D4604C] text-black font-semibold group-hover:gap-3 transition-all">
                  Access Store
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {stores.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4 rounded-2xl border-2 border-dashed border-border bg-muted/30">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <h2 className="text-xl font-semibold">No Stores Assigned</h2>
            <p className="text-muted-foreground">
              You don't have access to any stores yet. Please contact your administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
