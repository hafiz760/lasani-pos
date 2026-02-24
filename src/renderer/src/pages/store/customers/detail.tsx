import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import {
    ChevronRight,
    ArrowLeft,
    Phone,
    ShoppingCart,
    TrendingUp,
    Clock,
    CircleCheckBig,
    CircleDot,
    Wallet
} from 'lucide-react'
import { toast } from 'sonner'

export default function CustomerDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [customer, setCustomer] = useState<any>(null)
    const [sales, setSales] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [totalSales, setTotalSales] = useState(0)
    const pageSize = 15

    const loadDetails = async (p = page) => {
        if (!id) return
        setIsLoading(true)
        try {
            const result = await window.api.customers.getDetails({
                customerId: id,
                page: p,
                pageSize
            })
            if (result.success) {
                setCustomer(result.customer)
                setSales(result.sales)
                setStats(result.stats)
                setTotalPages(result.totalPages)
                setTotalSales(result.totalSales)
            } else {
                toast.error(result.error || 'Failed to load customer details')
            }
        } catch (error: any) {
            console.error('Customer details error:', error)
            toast.error(error?.message || 'Failed to load customer details')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadDetails()
    }, [id])

    useEffect(() => {
        if (customer) loadDetails(page)
    }, [page])

    const statusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
                return (
                    <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border-0 text-[10px] uppercase font-bold">
                        Paid
                    </Badge>
                )
            case 'PARTIAL':
                return (
                    <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/20 border-0 text-[10px] uppercase font-bold">
                        Partial
                    </Badge>
                )
            case 'PENDING':
                return (
                    <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/20 border-0 text-[10px] uppercase font-bold">
                        Pending
                    </Badge>
                )
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    if (isLoading && !customer) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-[#E8705A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Loading customer details...</p>
                </div>
            </div>
        )
    }

    if (!customer) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                    <p className="text-muted-foreground">Customer not found</p>
                    <Button onClick={() => navigate('/dashboard/customers')}>Back to Customers</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link to="/dashboard/customers" className="hover:text-foreground transition-colors">
                    Customers
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-semibold">{customer.name}</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        {customer.phone && (
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Phone className="w-3.5 h-3.5" />
                                {customer.phone}
                            </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                            Customer since {new Date(customer.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <Button variant="outline" onClick={() => navigate('/dashboard/customers')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to List
                </Button>
            </div>

            {/* Stats Row */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <ShoppingCart className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase">Total Sales</span>
                        </div>
                        <p className="text-xl font-bold text-foreground">{stats.totalSalesCount}</p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase">Revenue</span>
                        </div>
                        <p className="text-xl font-bold text-foreground">
                            Rs. {stats.totalRevenue.toLocaleString()}
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Wallet className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase">Paid</span>
                        </div>
                        <p className="text-xl font-bold text-emerald-500">
                            Rs. {stats.totalPaid.toLocaleString()}
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase">Pending</span>
                        </div>
                        <p className="text-xl font-bold text-red-500">
                            Rs. {stats.totalPending.toLocaleString()}
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 text-emerald-500 mb-1">
                            <CircleCheckBig className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase">Paid</span>
                        </div>
                        <p className="text-xl font-bold text-foreground">{stats.paidCount}</p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 text-amber-500 mb-1">
                            <CircleDot className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase">Partial / Pending</span>
                        </div>
                        <p className="text-xl font-bold text-foreground">
                            {stats.partialCount + stats.pendingCount}
                        </p>
                    </div>
                </div>
            )}

            {/* Outstanding Balance Card */}
            {customer.balance > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-5 py-3 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-red-400 uppercase font-semibold">Outstanding Balance</p>
                        <p className="text-lg font-bold text-red-500">
                            Rs. {(customer.balance || 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            )}

            {/* Sales Table */}
            <div className="bg-card border border-border rounded-lg">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-foreground">Sales History</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {totalSales} sale{totalSales !== 1 ? 's' : ''} recorded for this customer
                        </p>
                    </div>
                </div>

                {sales.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">
                                            Invoice
                                        </th>
                                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">
                                            Date
                                        </th>
                                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">
                                            Items
                                        </th>
                                        <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase">
                                            Total
                                        </th>
                                        <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase">
                                            Paid
                                        </th>
                                        <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase">
                                            Remaining
                                        </th>
                                        <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase">
                                            Status
                                        </th>
                                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">
                                            Method
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sales.map((sale: any) => {
                                        const remaining = Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0))
                                        return (
                                            <tr
                                                key={sale._id}
                                                className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                                                onClick={() => navigate(`/dashboard/reports/sales/${sale._id}`)}
                                            >
                                                <td className="p-3">
                                                    <span className="text-xs font-mono font-semibold text-[#E8705A]">
                                                        {sale.invoiceNumber}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-sm text-muted-foreground">
                                                    {new Date(sale.saleDate).toLocaleDateString()}
                                                </td>
                                                <td className="p-3">
                                                    <span className="text-sm text-foreground">
                                                        {sale.items?.length || 0} item{(sale.items?.length || 0) !== 1 ? 's' : ''}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <span className="text-sm font-semibold text-foreground">
                                                        Rs. {(sale.totalAmount || 0).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <span className="text-sm font-medium text-emerald-500">
                                                        Rs. {(sale.paidAmount || 0).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <span
                                                        className={`text-sm font-medium ${remaining > 0 ? 'text-red-500' : 'text-muted-foreground'}`}
                                                    >
                                                        Rs. {remaining.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">{statusBadge(sale.paymentStatus)}</td>
                                                <td className="p-3">
                                                    <span className="text-xs text-muted-foreground uppercase">
                                                        {sale.paymentMethod}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Page {page} of {totalPages} · {totalSales} total sales
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage((p) => p + 1)}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="p-12 text-center">
                        <ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground text-sm">No sales recorded for this customer</p>
                    </div>
                )}
            </div>
        </div>
    )
}
