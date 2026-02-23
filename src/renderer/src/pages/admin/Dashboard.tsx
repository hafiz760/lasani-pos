import { useEffect, useState } from "react";
import { Card, CardContent } from "@renderer/components/ui/card";
import { Building2, Users, ShoppingCart, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
    const [stores, setStores] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadStores = async () => {
            try {
                const result = await window.api.stores.getAll();
                if (result.success) {
                    setStores(result.data || []);
                } else {
                    console.error('Failed to load stores:', result.error);
                }
            } catch (error: any) {
                console.error('Failed to load stores:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadStores();
    }, []);

    const stats = [
        {
            title: "Total Stores",
            value: stores.length,
            icon: Building2,
            color: "text-blue-500",
            href: "/admin/stores"
        },
        {
            title: "Active Stores",
            value: stores.filter(s => s.isActive).length,
            icon: TrendingUp,
            color: "text-[#E8705A]",
            href: "/admin/stores"
        },
        {
            title: "Total Users",
            value: "—",
            icon: Users,
            color: "text-purple-500",
            href: "/admin/users"
        },
        {
            title: "System Health",
            value: "Good",
            icon: ShoppingCart,
            color: "text-green-500",
            href: "/admin"
        }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E8705A]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h2>
                <p className="text-muted-foreground">Manage stores, users, and system-wide settings</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Link key={stat.title} to={stat.href}>
                        <Card className="bg-card border-border text-foreground hover:bg-accent transition-colors cursor-pointer">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between space-y-0 pb-2">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {stat.title}
                                    </p>
                                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                </div>
                                <div className="text-2xl font-bold mt-2">{stat.value}</div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-card border-border">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-bold mb-4">Recent Stores</h3>
                        <div className="space-y-3">
                            {stores.slice(0, 5).map((store) => (
                                <div key={store._id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-[#E8705A]/10 flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-[#E8705A]" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{store.name}</p>
                                            <p className="text-xs text-muted-foreground">{store.code}</p>
                                        </div>
                                    </div>
                                    <div className={`h-2 w-2 rounded-full ${store.isActive ? 'bg-[#E8705A]' : 'bg-gray-500'}`} />
                                </div>
                            ))}
                            {stores.length === 0 && (
                                <p className="text-center text-muted-foreground italic py-4">No stores yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <Link to="/admin/stores">
                                <div className="p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors">
                                    <p className="font-medium">Manage Stores</p>
                                    <p className="text-xs text-muted-foreground">Add, edit, or remove stores</p>
                                </div>
                            </Link>
                            <Link to="/admin/users">
                                <div className="p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors">
                                    <p className="font-medium">Manage Users</p>
                                    <p className="text-xs text-muted-foreground">Assign users to stores</p>
                                </div>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
