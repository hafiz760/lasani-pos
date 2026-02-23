import { useState, useEffect } from "react";
import { DataPage } from "@renderer/components/shared/data-page";
import { Badge } from "@renderer/components/ui/badge";
import { LoadingButton } from "@renderer/components/ui/loading-button";
import { Button } from "@renderer/components/ui/button";
import {
  MoreVertical,
  Edit,
  Building2,
  Eye,
  Ban,
  CheckCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@renderer/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@renderer/components/ui/dialog";
import { Input } from "@renderer/components/ui/input";
import { toast } from "sonner";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@renderer/components/ui/form";
import { StoreFormData, storeSchema } from "@renderer/lib/validations/store.validation";

export default function StoresPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadStores = async () => {
    setIsLoading(true);
    try {
      const result = await window.api.stores.getAll({
        page,
        pageSize,
        includeInactive: true,
        search: searchTerm
      });
      if (result.success) {
        setStores(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } else {
        toast.error(result.error || "Failed to load stores");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, [page, pageSize, searchTerm]);

  const form = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      phone: "",
      email: "",
      taxRate: 0,
    },
  });

  const resetForm = () => {
    form.reset({
      name: "",
      code: "",
      address: "",
      phone: "",
      email: "",
      taxRate: 0,
    });
    setSelectedStore(null);
  };

  const handleEdit = (store: any) => {
    setSelectedStore(store);
    form.reset({
      name: store.name,
      code: store.code,
      address: store.address,
      phone: store.phone,
      email: store.email,
      taxRate: store.settings?.taxRate || 0,
    });
    setIsEditOpen(true);
  };

  const onSubmit: SubmitHandler<StoreFormData> = async (values) => {
    setIsSubmitting(true);
    try {
      let result;
      if (isEditOpen) {
        result = await window.api.stores.update(selectedStore._id, values);
      } else {
        result = await window.api.stores.create(values);
      }

      if (result.success) {
        toast.success(`Store ${isEditOpen ? "updated" : "created"} successfully`);
        setIsAddOpen(false);
        setIsEditOpen(false);
        resetForm();
        loadStores();
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const action = currentStatus ? "deactivate" : "activate";
    if (confirm(`Are you sure you want to ${action} this store?`)) {
      try {
        const res = await window.api.stores.toggleStatus(id);
        if (res.success) {
          toast.success(`Store ${action}d successfully`);
          loadStores();
        } else {
          toast.error(res.error || `Failed to ${action} store`);
        }
      } catch (error: any) {
        toast.error("Error: " + error.message);
      }
    }
  };

  const columns = [
    {
      header: "Store Name",
      accessor: "name",
      render: (item: any) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#E8705A]/10 flex items-center justify-center overflow-hidden">
            {item.settings?.logo ? (
              <img
                src={item.settings.logo}
                alt={item.name}
                className="object-cover w-10 h-10"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <Building2 className="w-5 h-5 text-[#E8705A]" />
            )}
          </div>
          <div>
            <Link
              to={`/admin/stores/${item._id}`}
              className="font-bold hover:underline"
            >
              {item.name}
            </Link>
            <p className="text-xs text-muted-foreground">{item.code}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Address",
      accessor: "address",
      render: (item: any) => <span className="text-sm">{item.address}</span>,
    },
    {
      header: "Contact",
      accessor: "phone",
      render: (item: any) => (
        <div className="text-sm">
          <p>{item.phone}</p>
          <p className="text-xs text-muted-foreground">{item.email}</p>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      render: (item: any) => (
        <Badge
          className={
            item.isActive
              ? "bg-[#E8705A]/10 text-[#E8705A] border-[#E8705A]/20"
              : "bg-gray-500/10 text-gray-400 border-gray-500/20"
          }
        >
          {item.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessor: "_id",
      render: (item: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-accent h-8 w-8"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="bg-popover border-border text-popover-foreground"
            align="end"
          >
            <DropdownMenuItem asChild>
              <Link
                to={`/admin/stores/${item._id}`}
                className="flex items-center cursor-pointer focus:bg-accent"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleEdit(item)}
              className="focus:bg-[#E8705A] focus:text-white cursor-pointer"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleToggleStatus(item._id, item.isActive)}
              className={
                item.isActive
                  ? "focus:bg-amber-500 focus:text-white cursor-pointer text-amber-500"
                  : "focus:bg-[#E8705A] focus:text-white cursor-pointer text-[#E8705A]"
              }
            >
              {item.isActive ? (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <DataPage
        title="Stores"
        description="Manage all store locations and their settings"
        data={stores}
        columns={columns}
        searchPlaceholder="Search stores..."
        fileName="stores_export"
        addLabel="Add Store"
        onAdd={() => setIsAddOpen(true)}
        isLoading={isLoading}
        currentPage={page}
        totalPages={totalPages}
        totalRecords={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        searchTerm={searchTerm}
        onSearchChange={(term) => {
          setSearchTerm(term);
          setPage(1);
        }}
      />

      <Dialog
        open={isAddOpen || isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetForm();
            setIsAddOpen(false);
            setIsEditOpen(false);
          }
        }}
      >
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>
              {isEditOpen ? "Edit Store" : "Add New Store"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Store Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted border-border"
                          placeholder="Main Branch"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Store Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                          className="bg-muted border-border"
                          placeholder="MAIN"
                          disabled={isEditOpen}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-muted border-border"
                        placeholder="123 Main Street, City"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted border-border"
                          placeholder="+1234567890"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          className="bg-muted border-border"
                          placeholder="store@example.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="taxRate"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Tax Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="bg-muted border-border"
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsAddOpen(false);
                    setIsEditOpen(false);
                  }}
                  className="border-border"
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isLoading={isSubmitting}
                  loadingText={isEditOpen ? "Updating..." : "Creating..."}
                  className="bg-[#E8705A] hover:bg-[#D4604C] text-black font-semibold"
                >
                  {isEditOpen ? "Update Store" : "Create Store"}
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
