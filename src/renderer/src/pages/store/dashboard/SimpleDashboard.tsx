'use client'

import {
  ShoppingCart,
  Package,
  History,
  AlertTriangle,
  Store,
  TrendingUp,
  Search
} from 'lucide-react'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { motion } from 'framer-motion'

interface SimpleDashboardProps {
  stats: any
}

export default function SimpleDashboard({ stats }: SimpleDashboardProps) {
  const navigate = useNavigate()
  const selectedStore = JSON.parse(localStorage.getItem('selectedStore') || '{}')

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  }

  const quickActions = [
    {
      title: 'Open POS',
      description: 'Start a new sale',
      icon: ShoppingCart,
      href: '/dashboard/pos'
    },
    {
      title: 'Inventory',
      description: 'Check stock levels',
      icon: Package,
      href: '/dashboard/inventory/products'
    },
    {
      title: 'Sales History',
      description: 'Review recent orders',
      icon: History,
      href: '/dashboard/reports/sales'
    },
    {
      title: 'Find Product',
      description: 'Quick price check',
      icon: Search,
      href: '/dashboard/inventory/products'
    }
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Main Stats Grid - Uniform and Simple */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-3"
      >
        <motion.div variants={item} className="h-full">
          <Card className="bg-card border-border h-full hover:border-[#4ade80]/50 transition-colors">
            <CardContent className="p-6 flex items-center gap-4 h-full">
              <div className="h-12 w-12 rounded-xl bg-[#4ade80]/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-6 w-6 text-[#4ade80]" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Sales</p>
                <h3 className="text-2xl font-bold">{stats?.salesCount || 0} Transactions</h3>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="h-full">
          <Card className="bg-card border-border h-full hover:border-[#4ade80]/50 transition-colors">
            <CardContent className="p-6 flex items-center gap-4 h-full">
              <div className="h-12 w-12 rounded-xl bg-[#4ade80]/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6 text-[#4ade80]" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock alerts</p>
                <h3 className="text-2xl font-bold">{stats?.lowStockCount || 0} Items</h3>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="h-full">
          <Card className="bg-card border-border h-full hover:border-[#4ade80]/50 transition-colors">
            <CardContent className="p-6 flex items-center gap-4 h-full">
              <div className="h-12 w-12 rounded-xl bg-[#4ade80]/10 flex items-center justify-center shrink-0">
                <Store className="h-6 w-6 text-[#4ade80]" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Store</p>
                <h3 className="text-xl font-bold truncate max-w-[180px]">
                  {selectedStore?.name || 'Not Selected'}
                </h3>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Quick Access Menu - Simple Green Theme */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Quick Operations</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <motion.div key={action.title} whileHover={{ y: -4 }} className="h-full">
              <Button
                onClick={() => navigate(action.href)}
                className="w-full h-full p-8 flex flex-col items-center justify-center gap-4 bg-card border border-border hover:border-[#4ade80] hover:bg-[#4ade80]/5 transition-all rounded-2xl group"
                variant="ghost"
              >
                <div className="h-14 w-14 rounded-full bg-[#4ade80]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <action.icon className="h-7 w-7 text-[#4ade80]" />
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-foreground">{action.title}</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    {action.description}
                  </div>
                </div>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Activity Section - Minimalist */}
      <Card className="bg-card border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold">Recent Activity</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/reports/sales')}
            className="text-[#4ade80] hover:text-[#4ade80] hover:bg-[#4ade80]/10"
          >
            View All
          </Button>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {stats?.recentSales?.slice(0, 3).map((sale: any, i: number) => (
              <div
                key={i}
                className="flex items-center px-6 py-4 hover:bg-muted/30 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mr-4">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Sale #{sale.invoiceNo || i + 1}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(sale.createdAt), 'hh:mm a')} • {sale.paymentMethod}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-[#4ade80]">{sale.paymentStatus}</span>
                </div>
              </div>
            ))}
            {(!stats?.recentSales || stats.recentSales.length === 0) && (
              <div className="p-10 text-center text-muted-foreground italic text-sm">
                No transactions today.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
