'use client'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  Package,
  History,
  AlertTriangle,
  TrendingUp,
  Search,
  DollarSign,
  FileText,
  Receipt,
  Wallet,
  BarChart3,
  Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Avatar, AvatarFallback } from '@renderer/components/ui/avatar'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  ComposedChart,
  Line
} from 'recharts'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

type Period = 'today' | 'week' | 'month' | 'all'

interface SimpleDashboardProps {
  stats: any
}

export default function SimpleDashboard({ stats: initialStats }: SimpleDashboardProps) {
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(initialStats)
  const [period, setPeriod] = useState<Period>('today')
  const [isLoading, setIsLoading] = useState(false)
  const selectedStore = JSON.parse(localStorage.getItem('selectedStore') || '{}')

  // Fetch today's data on mount
  useEffect(() => {
    fetchStats('today')
  }, [])

  const fetchStats = async (p: Period) => {
    setIsLoading(true)
    try {
      const storeId = selectedStore._id || selectedStore.id
      if (!storeId) return
      const result = await window.api.dashboard.getStats(storeId, p)
      if (result.success) {
        setStats(result.data)
      } else {
        toast.error(result.error || 'Failed to load stats')
      }
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    fetchStats(p)
  }

  const chartData = stats?.chartData || []

  const periodLabels: Record<Period, string> = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    all: 'All Time'
  }

  const chartDescription: Record<Period, string> = {
    today: 'Hourly sales for today',
    week: 'Daily sales this week',
    month: 'Weekly sales this month',
    all: 'Sales over the last 7 days'
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
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
      title: 'View Reports',
      description: 'Business insights',
      icon: FileText,
      href: '/dashboard/accounting/transactions/preview'
    },
    {
      title: 'Transactions',
      description: 'View all transactions',
      icon: Receipt,
      href: '/dashboard/accounting/transactions'
    },
    {
      title: 'Sales History',
      description: 'Review recent orders',
      icon: History,
      href: '/dashboard/reports/sales'
    },
    {
      title: 'Inventory',
      description: 'Check stock levels',
      icon: Package,
      href: '/dashboard/inventory/products'
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
      {/* Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            {selectedStore?.name || 'Store'} — {periodLabels[period]}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 self-start sm:self-auto">
          {(['today', 'week', 'month', 'all'] as Period[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'ghost'}
              size="sm"
              className={
                period === p
                  ? 'bg-[#E8705A] text-white hover:bg-[#D4604C] font-semibold px-3'
                  : 'text-muted-foreground hover:text-foreground px-3'
              }
              onClick={() => handlePeriodChange(p)}
              disabled={isLoading}
            >
              {periodLabels[p]}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5"
      >
        <motion.div variants={item}>
          <Card className="bg-card border-border hover:border-[#E8705A]/50 transition-colors">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-[#E8705A]/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-[#E8705A]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">Revenue</p>
                <h3 className="text-base sm:text-xl font-bold text-[#E8705A]">
                  Rs. {(stats?.revenue || 0).toLocaleString()}
                </h3>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-card border-border hover:border-[#E8705A]/50 transition-colors">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">Profit</p>
                <h3 className="text-base sm:text-xl font-bold">
                  Rs. {(stats?.profit || 0).toLocaleString()}
                </h3>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-card border-border hover:border-[#E8705A]/50 transition-colors">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">Sales</p>
                <h3 className="text-base sm:text-xl font-bold">{stats?.salesCount || 0}</h3>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-card border-border hover:border-orange-500/50 transition-colors">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-orange-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">Pending</p>
                <h3 className="text-base sm:text-xl font-bold text-orange-500">
                  Rs. {(stats?.totalPending || 0).toLocaleString()}
                </h3>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-card border-border hover:border-red-500/50 transition-colors">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                  Low Stock
                </p>
                <h3 className="text-base sm:text-xl font-bold">
                  {stats?.lowStockCount || 0} Items
                </h3>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Chart + Recent Sales */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Area Chart */}
        <Card className="lg:col-span-4 bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Sales Revenue</CardTitle>
            <p className="text-xs text-muted-foreground">{chartDescription[period]}</p>
          </CardHeader>
          <CardContent className="pl-2 pr-4">
            <div className="h-[280px] w-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8705A]" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E8705A" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#E8705A" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      dy={10}
                      interval={period === 'today' ? 3 : 0}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: any) => [
                        `Rs. ${Number(value).toLocaleString()}`,
                        'Revenue'
                      ]}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                      cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
                    />
                    <Bar
                      dataKey="sales"
                      fill="url(#barGradient)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#D4604C"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray=""
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="lg:col-span-3 bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Sales</CardTitle>
            <p className="text-xs text-muted-foreground">Latest transactions</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {stats?.recentSales?.length > 0 ? (
                stats.recentSales.map((sale: any, i: number) => (
                  <div key={i} className="flex items-center">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarFallback className="bg-[#E8705A]/10 text-xs text-[#E8705A] font-bold">
                        {(sale.customer?.name || 'WI')
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-3 space-y-0.5 min-w-0 flex-1">
                      <p className="text-sm font-medium leading-none truncate">
                        {sale.customer?.name || 'Walk-In'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(sale.createdAt), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                    <div className="ml-auto text-right shrink-0">
                      <p className="text-sm font-bold">Rs. {sale.totalAmount.toLocaleString()}</p>
                      <p
                        className={`text-[10px] font-medium uppercase tracking-wider ${
                          sale.paymentStatus === 'PAID'
                            ? 'text-emerald-500'
                            : sale.paymentStatus === 'PARTIAL'
                              ? 'text-orange-500'
                              : 'text-red-500'
                        }`}
                      >
                        {sale.paymentStatus}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">No recent sales</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports & Analytics */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Reports & Analytics</h2>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Sales Report',
              description: 'Revenue, profit & invoice breakdown',
              icon: BarChart3,
              href: '/dashboard/reports/sales-report',
              color: '#E8705A'
            },
            {
              title: 'Transactions Report',
              description: 'Account debits & credits',
              icon: Receipt,
              href: '/dashboard/reports/transactions',
              color: '#8b5cf6'
            },
            {
              title: 'Customer Report',
              description: 'Balances & pending payments',
              icon: Users,
              href: '/dashboard/reports/customers',
              color: '#3b82f6'
            },
            {
              title: 'Expense Report',
              description: 'Categorized business spending',
              icon: Wallet,
              href: '/dashboard/reports/expenses',
              color: '#ef4444'
            }
          ].map((report) => (
            <motion.div key={report.title} whileHover={{ y: -3 }} className="h-full">
              <Button
                onClick={() => navigate(report.href)}
                className="w-full h-full p-5 sm:p-6 flex flex-col items-center justify-center gap-3 sm:gap-4 bg-card border border-border hover:border-[#E8705A] hover:bg-[#E8705A]/5 transition-all rounded-xl group"
                variant="ghost"
              >
                <div
                  className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${report.color}15` }}
                >
                  <report.icon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: report.color }} />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm text-foreground">{report.title}</div>
                  <div className="text-[11px] text-muted-foreground font-normal">
                    {report.description}
                  </div>
                </div>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Operations */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Quick Operations</h2>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((action) => (
            <motion.div key={action.title} whileHover={{ y: -3 }} className="h-full">
              <Button
                onClick={() => navigate(action.href)}
                className="w-full h-full p-6 flex flex-col items-center justify-center gap-3 bg-card border border-border hover:border-[#E8705A] hover:bg-[#E8705A]/5 transition-all rounded-xl group"
                variant="ghost"
              >
                <div className="h-12 w-12 rounded-full bg-[#E8705A]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <action.icon className="h-6 w-6 text-[#E8705A]" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm text-foreground">{action.title}</div>
                  <div className="text-[11px] text-muted-foreground font-normal">
                    {action.description}
                  </div>
                </div>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
