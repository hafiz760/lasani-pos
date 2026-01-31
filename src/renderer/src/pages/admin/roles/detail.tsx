import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { Button } from "@renderer/components/ui/button";
import { ArrowLeft, Shield, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@renderer/components/ui/badge";
import { Separator } from "@renderer/components/ui/separator";

export default function RoleDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [role, setRole] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const result = await window.api.roles.getById(id!);
                if (result.success) {
                    setRole(result.data);
                } else {
                    toast.error(result.error || "Failed to fetch role details");
                    navigate("/admin/roles");
                }
            } catch (error: any) {
                toast.error(error.message);
                navigate("/admin/roles");
            } finally {
                setIsLoading(false);
            }
        };

        fetchRole();
    }, [id, navigate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!role) return null;

    return (
        <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate("/admin/roles")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Role Details</h1>
                </div>
                <Badge variant="outline" className="text-sm px-3 py-1 font-mono uppercase tracking-wider">
                    {role.name}
                </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1 overflow-hidden border-none shadow-lg">
                    <CardHeader className="bg-primary/5 pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Shield className="h-5 w-5 text-primary" />
                            Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-muted-foreground">Role Name</span>
                            <p className="text-lg font-bold">{role.name}</p>
                        </div>
                        <Separator />
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-muted-foreground">Description</span>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {role.description || "No description provided for this role."}
                            </p>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">System Role</span>
                            <Badge variant={role.isSystem ? "default" : "outline"}>
                                {role.isSystem ? "Yes" : "No"}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 overflow-hidden border-none shadow-lg">
                    <CardHeader className="bg-primary/5 pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            Permissions & Access
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {role.permissions && Object.keys(role.permissions).length > 0 ? (
                            <div className="grid gap-6 sm:grid-cols-2">
                                {Object.entries(role.permissions).map(([module, perms]: [string, any]) => (
                                    <div key={module} className="space-y-3">
                                        <h3 className="font-semibold text-sm uppercase tracking-wider text-primary border-b pb-1">
                                            {module}
                                        </h3>
                                        <div className="space-y-2">
                                            {Object.entries(perms).map(([action, allowed]) => (
                                                <div key={action} className="flex items-center justify-between text-sm">
                                                    <span className="capitalize">{action}</span>
                                                    {allowed ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500 fill-green-500/20" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-muted-foreground/30" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Shield className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                                <p className="text-muted-foreground">No specific permissions defined for this role.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
