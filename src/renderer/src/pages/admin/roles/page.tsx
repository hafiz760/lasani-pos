import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { Button } from "@renderer/components/ui/button";
import { Plus, Shield, Trash2, Edit2, Search, MoreHorizontal, Settings2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@renderer/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@renderer/components/ui/dropdown-menu";
import { Input } from "@renderer/components/ui/input";
import { Label } from "@renderer/components/ui/label";
import { Textarea } from "@renderer/components/ui/textarea";
import { LoadingButton } from "@renderer/components/ui/loading-button";
import { toast } from "sonner";
import { Badge } from "@renderer/components/ui/badge";
import { Avatar, AvatarFallback } from "@renderer/components/ui/avatar";

export default function RolesPage() {
    const navigate = useNavigate();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<any>(null);
    const [roleName, setRoleName] = useState("");
    const [roleDescription, setRoleDescription] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [roles, setRoles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadRoles = async () => {
        setIsLoading(true);
        try {
            const result = await window.api.roles.getAll();
            if (result.success) {
                setRoles(result.data);
            } else {
                toast.error(result.error || "Failed to load roles");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRoles();
    }, []);

    const filteredRoles = useMemo(() => {
        return roles.filter((role: any) =>
            role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            role.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [roles, searchTerm]);

    const handleOpenAdd = () => {
        setEditingRole(null);
        setRoleName("");
        setRoleDescription("");
        setIsAddOpen(true);
    };

    const handleOpenEdit = (role: any) => {
        setEditingRole(role);
        setRoleName(role.name);
        setRoleDescription(role.description || "");
        setIsAddOpen(true);
    };

    const handleManagePermissions = (id: string) => {
        navigate(`/admin/roles/${id}`);
    };

    const handleSubmit = async () => {
        if (!roleName) {
            toast.error("Role name is required");
            return;
        }

        const roleData = {
            name: roleName,
            description: roleDescription,
            permissions: editingRole ? editingRole.permissions : [],
        };

        setIsSubmitting(true);
        try {
            let result;
            if (editingRole) {
                result = await window.api.roles.update(editingRole._id, roleData);
            } else {
                result = await window.api.roles.create(roleData);
            }

            if (result.success) {
                toast.success(editingRole ? "Role updated successfully" : "Role created successfully");
                setIsAddOpen(false);
                loadRoles();
            } else {
                toast.error("Error: " + result.error);
            }
        } catch (error: any) {
            toast.error("Error: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this role?")) return;
        try {
            const result = await window.api.roles.delete(id);
            if (result.success) {
                toast.success("Role deleted successfully");
                loadRoles();
            } else {
                toast.error("Error: " + result.error);
            }
        } catch (error: any) {
            toast.error("Error: " + error.message);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E8705A]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                        Roles & Permissions
                    </h2>
                    <p className="text-muted-foreground">
                        Create system roles and manage their granular permissions.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search roles..."
                            className="pl-9 bg-card border-border h-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={handleOpenAdd}
                        className="bg-[#E8705A] hover:bg-[#D4604C] text-black font-semibold h-10"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Role
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredRoles.map((role: any) => (
                    <Card
                        key={role._id}
                        className="bg-card border-border hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => handleManagePermissions(role._id)}
                    >
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                            <Avatar className="h-12 w-12 border border-border group-hover:border-[#E8705A]/50 transition-colors">
                                <AvatarFallback className="bg-[#E8705A]/10 text-[#E8705A] font-bold">
                                    <Shield className="h-6 w-6" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <CardTitle className="text-base truncate group-hover:text-[#E8705A] transition-colors">
                                    {role.name}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground truncate">
                                    {role.permissions?.length || 0} Permissions
                                </p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground">
                                    <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleManagePermissions(role._id); }}>
                                        <Settings2 className="w-4 h-4 mr-2" />
                                        Manage Permissions
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleOpenEdit(role); }}>
                                        <Edit2 className="w-4 h-4 mr-2" />
                                        Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-500 focus:bg-red-500 focus:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDelete(role._id); }}>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Role
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2 h-10 leading-relaxed">
                                {role.description || "No description provided."}
                            </p>
                            <div className="mt-4 flex items-center gap-2">
                                <Badge variant="outline" className="bg-[#E8705A]/10 text-[#E8705A] border-[#E8705A]/20">
                                    System Role
                                </Badge>
                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                                    ID: {role._id.slice(-6)}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[425px] bg-card border-border text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">{editingRole ? "Edit Role Details" : "Create New Role"}</DialogTitle>
                        <DialogDescription>
                            Enter the basic identity for this role. You can manage its specific permissions after creation.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-semibold">Role Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Sales Manager"
                                value={roleName}
                                onChange={(e) => setRoleName(e.target.value)}
                                className="bg-muted/50 border-border h-12 text-lg focus:ring-[#E8705A]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="What is the purpose of this role?"
                                value={roleDescription}
                                onChange={(e) => setRoleDescription(e.target.value)}
                                className="bg-muted/50 border-border min-h-[120px] resize-none focus:ring-[#E8705A]"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-6">
                        <Button variant="ghost" onClick={() => setIsAddOpen(false)}>
                            Cancel
                        </Button>
                        <LoadingButton
                            onClick={handleSubmit}
                            isLoading={isSubmitting}
                            loadingText={editingRole ? "Updating..." : "Creating..."}
                            className="bg-[#E8705A] hover:bg-[#D4604C] text-black font-semibold h-10 px-8"
                        >
                            {editingRole ? "Save Details" : "Create Role"}
                        </LoadingButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
