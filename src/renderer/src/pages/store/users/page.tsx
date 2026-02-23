// "use client";

// import { useEffect, useState } from "react";
// import { DataPage } from "@/components/shared/data-page";
// import { getUsers, deleteUser, getRoles, createUser } from "@/actions/user";
// import { Badge } from "@/components/ui/badge";
// import { LoadingButton } from "@/components/ui/loading-button";
// import { Button } from "@/components/ui/button";
// import { MoreVertical, Trash2, ShieldCheck, Mail, Lock } from "lucide-react";
// import {
//     DropdownMenu,
//     DropdownMenuContent,
//     DropdownMenuItem,
//     DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//     Dialog,
//     DialogContent,
//     DialogHeader,
//     DialogTitle,
//     DialogFooter,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { toast } from "sonner";
// import { z } from "zod";
// import { useForm, SubmitHandler } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import {
//     Form,
//     FormControl,
//     FormField,
//     FormItem,
//     FormLabel,
//     FormMessage,
// } from "@/components/ui/form";

// const userSchema = z.object({
//     fullName: z.string().min(2, "Full name must be at least 2 characters"),
//     email: z.string().email("Invalid email address"),
//     password: z.string().min(6, "Password must be at least 6 characters"),
//     role: z.string().min(1, "Please select a role"),
// });

// type UserFormValues = z.infer<typeof userSchema>;

// export default function UsersPage() {
//     const [users, setUsers] = useState<any[]>([]);
//     const [roles, setRoles] = useState<any[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [isAddOpen, setIsAddOpen] = useState(false);
//     const [isSaving, setIsSaving] = useState(false);

//     const form = useForm<UserFormValues>({
//         resolver: zodResolver(userSchema),
//         defaultValues: {
//             fullName: "",
//             email: "",
//             password: "",
//             role: "",
//         },
//     });

//     const loadData = async () => {
//         setIsLoading(true);
//         const [uData, rData] = await Promise.all([getUsers(), getRoles()]);
//         setUsers(uData.data);
//         setRoles(rData);
//         setIsLoading(false);
//     };

//     useEffect(() => {
//         loadData();
//     }, []);

//     const handleDelete = async (id: string) => {
//         if (!confirm("Are you sure you want to remove this user?")) return;
//         const result = await deleteUser(id);
//         if (result.success) {
//             toast.success("User removed successfully");
//             loadData();
//         } else {
//             toast.error("Error: " + result.error);
//         }
//     };

//     const onSubmit: SubmitHandler<UserFormValues> = async (values) => {
//         setIsSaving(true);
//         const result = await createUser(values);
//         if (result.success) {
//             toast.success("User created successfully");
//             setIsAddOpen(false);
//             form.reset();
//             loadData();
//         } else {
//             toast.error("Error: " + result.error);
//         }
//         setIsSaving(false);
//     };

//     const columns = [
//         {
//             header: "User",
//             accessor: "fullName",
//             render: (item: any) => (
//                 <div className="flex flex-col">
//                     <span className="font-semibold text-foreground">{item.fullName}</span>
//                     <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
//                         <Mail className="w-3 h-3" />
//                         {item.email}
//                     </div>
//                 </div>
//             )
//         },
//         {
//             header: "Role",
//             accessor: "role.name",
//             render: (item: any) => (
//                 <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1 capitalize">
//                     <ShieldCheck className="w-3 h-3" />
//                     {item.role?.name || "Staff"}
//                 </Badge>
//             )
//         },
//         {
//             header: "Status",
//             accessor: "isActive",
//             render: (item: any) => (
//                 <Badge className={item.isActive ? "bg-[#E8705A]/10 text-[#E8705A] border-[#E8705A]/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>
//                     {item.isActive ? "Active" : "Inactive"}
//                 </Badge>
//             )
//         },
//         {
//             header: "Actions",
//             accessor: "_id",
//             render: (item: any) => (
//                 <DropdownMenu>
//                     <DropdownMenuTrigger asChild>
//                         <Button variant="ghost" size="icon" className="hover:bg-accent">
//                             <MoreVertical className="w-4 h-4" />
//                         </Button>
//                     </DropdownMenuTrigger>
//                     <DropdownMenuContent className="bg-popover border-border text-popover-foreground" align="end">
//                         <DropdownMenuItem
//                             onClick={() => handleDelete(item._id)}
//                             className="focus:bg-red-500 focus:text-white cursor-pointer text-red-400"
//                         >
//                             <Trash2 className="w-4 h-4 mr-2" />
//                             Remove Access
//                         </DropdownMenuItem>
//                     </DropdownMenuContent>
//                 </DropdownMenu>
//             )
//         }
//     ];

//     return (
//         <>
//             <DataPage
//                 title="Users & Roles"
//                 description="Manage system access and assign roles to your team members."
//                 data={users}
//                 columns={columns}
//                 searchPlaceholder="Search Name or Email..."
//                 fileName="system_users_export"
//                 addLabel="Add User"
//                 onAdd={() => setIsAddOpen(true)}
//             />

//             <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) form.reset(); }}>
//                 <DialogContent className="bg-background border-border text-foreground">
//                     <DialogHeader>
//                         <DialogTitle>Add New System User</DialogTitle>
//                     </DialogHeader>
//                     <Form {...form}>
//                         <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
//                             <FormField
//                                 control={form.control}
//                                 name="fullName"
//                                 render={({ field }) => (
//                                     <FormItem className="space-y-2">
//                                         <FormLabel>Full Name</FormLabel>
//                                         <FormControl>
//                                             <Input
//                                                 {...field}
//                                                 className="bg-muted border-border"
//                                                 placeholder="John Doe"
//                                             />
//                                         </FormControl>
//                                         <FormMessage />
//                                     </FormItem>
//                                 )}
//                             />
//                             <FormField
//                                 control={form.control}
//                                 name="email"
//                                 render={({ field }) => (
//                                     <FormItem className="space-y-2">
//                                         <FormLabel>Email Address</FormLabel>
//                                         <FormControl>
//                                             <Input
//                                                 {...field}
//                                                 type="email"
//                                                 className="bg-muted border-border"
//                                                 placeholder="john@mobileshop.com"
//                                             />
//                                         </FormControl>
//                                         <FormMessage />
//                                     </FormItem>
//                                 )}
//                             />
//                             <FormField
//                                 control={form.control}
//                                 name="password"
//                                 render={({ field }) => (
//                                     <FormItem className="space-y-2">
//                                         <FormLabel>Password</FormLabel>
//                                         <FormControl>
//                                             <div className="relative">
//                                                 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//                                                 <Input
//                                                     {...field}
//                                                     type="password"
//                                                     className="bg-muted border-border pl-10"
//                                                     placeholder="••••••••"
//                                                 />
//                                             </div>
//                                         </FormControl>
//                                         <FormMessage />
//                                     </FormItem>
//                                 )}
//                             />
//                             <FormField
//                                 control={form.control}
//                                 name="role"
//                                 render={({ field }) => (
//                                     <FormItem className="space-y-2">
//                                         <FormLabel>Assign Role</FormLabel>
//                                         <Select onValueChange={field.onChange} value={field.value}>
//                                             <FormControl>
//                                                 <SelectTrigger className="bg-muted border-border">
//                                                     <SelectValue placeholder="Select Role" />
//                                                 </SelectTrigger>
//                                             </FormControl>
//                                             <SelectContent className="bg-popover border-border text-popover-foreground">
//                                                 {roles.map(r => (
//                                                     <SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>
//                                                 ))}
//                                             </SelectContent>
//                                         </Select>
//                                         <FormMessage />
//                                     </FormItem>
//                                 )}
//                             />
//                             <DialogFooter className="pt-4">
//                                 <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="border-border">Cancel</Button>
//                                 <LoadingButton
//                                     type="submit"
//                                     isLoading={isSaving}
//                                     loadingText="Creating..."
//                                     className="bg-[#E8705A] hover:bg-[#D4604C] text-black font-semibold"
//                                 >
//                                     Create User
//                                 </LoadingButton>
//                             </DialogFooter>
//                         </form>
//                     </Form>
//                 </DialogContent>
//             </Dialog>
//         </>
//     );
// }
