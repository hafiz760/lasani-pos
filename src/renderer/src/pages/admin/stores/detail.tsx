import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { Button } from "@renderer/components/ui/button";
import { ArrowLeft, Store, MapPin, Phone, Mail, Settings, Activity } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@renderer/components/ui/badge";
import { Separator } from "@renderer/components/ui/separator";

export default function StoreDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [store, setStore] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const result = await window.api.stores.getById(id!);
                if (result.success) {
                    setStore(result.data);
                } else {
                    toast.error(result.error || "Failed to fetch store details");
                    navigate("/admin/stores");
                }
            } catch (error: any) {
                toast.error(error.message);
                navigate("/admin/stores");
            } finally {
                setIsLoading(false);
            }
        };

        fetchStore();
    }, [id, navigate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!store) return null;

    return (
        <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate("/admin/stores")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Store Details</h1>
                </div>
                <Badge variant={store.isActive ? "default" : "secondary"} className="text-sm px-3 py-1">
                    {store.isActive ? "Active" : "Inactive"}
                </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="overflow-hidden border-none shadow-lg">
                    <CardHeader className="bg-primary/5 pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Store className="h-5 w-5 text-primary" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-[100px_1fr] gap-4 items-start">
                            <span className="text-sm font-medium text-muted-foreground pt-1">Name</span>
                            <span className="text-base font-semibold">{store.name}</span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] gap-4 items-start">
                            <span className="text-sm font-medium text-muted-foreground pt-1">Code</span>
                            <Badge variant="outline" className="w-fit font-mono">{store.code}</Badge>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-[100px_1fr] gap-4 items-start">
                            <span className="text-sm font-medium text-muted-foreground pt-1">
                                <MapPin className="h-4 w-4 inline mr-2" /> Address
                            </span>
                            <span className="text-sm">{store.address}</span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] gap-4 items-start">
                            <span className="text-sm font-medium text-muted-foreground pt-1">
                                <Phone className="h-4 w-4 inline mr-2" /> Phone
                            </span>
                            <span className="text-sm">{store.phone}</span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] gap-4 items-start">
                            <span className="text-sm font-medium text-muted-foreground pt-1">
                                <Mail className="h-4 w-4 inline mr-2" /> Email
                            </span>
                            <span className="text-sm">{store.email}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none shadow-lg">
                    <CardHeader className="bg-primary/5 pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Settings className="h-5 w-5 text-primary" />
                            Settings & Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                            <span className="text-sm font-medium text-muted-foreground">Currency</span>
                            <Badge className="w-fit">{store.settings?.currency || 'PKR'}</Badge>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                            <span className="text-sm font-medium text-muted-foreground">Tax Rate</span>
                            <span className="text-base font-semibold">{store.settings?.taxRate || 0}%</span>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                            <span className="text-sm font-medium text-muted-foreground">Timezone</span>
                            <span className="text-sm font-mono text-muted-foreground">{store.settings?.timezone || 'Asia/Karachi'}</span>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-[120px_1fr] gap-4 items-center pt-2">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Activity className="h-4 w-4" /> Status
                            </span>
                            <span className={store.isActive ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                                {store.isActive ? "Operational" : "Deactivated"}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                        No recent activity recorded for this store yet.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
