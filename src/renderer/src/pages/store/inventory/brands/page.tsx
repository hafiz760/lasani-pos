import { useState, useEffect } from "react";
import { DataPage } from "@renderer/components/shared/data-page";
import { LoadingButton } from "@renderer/components/ui/loading-button";
import { Button } from "@renderer/components/ui/button";
import { Edit, Trash2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@renderer/components/ui/dialog";
import { Input } from "@renderer/components/ui/input";
import { DeleteConfirm } from "@renderer/components/shared/delete-confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@renderer/components/ui/dropdown-menu";
import { z } from "zod";
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

const brandSchema = z.object({
  name: z.string().min(2, "Brand name must be at least 2 characters"),
});

type BrandFormValues = z.infer<typeof brandSchema>;

export default function BrandsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [brands, setBrands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentStore, setCurrentStore] = useState<any>(null);

  useEffect(() => {
    const storeData = localStorage.getItem('selectedStore');
    if (storeData) {
      setCurrentStore(JSON.parse(storeData));
    }
  }, []);

  const loadBrands = async () => {
    if (!currentStore?._id) return;
    setIsLoading(true);
    try {
      const result = await window.api.brands.getAll({
        storeId: currentStore._id,
        page,
        pageSize,
        search: searchTerm,
      });
      if (result.success) {
        setBrands(result.data);
        setTotalRecords(result.total || result.data.length);
        setTotalPages(result.totalPages || 1);
      }
    } catch (error) {
      toast.error("Failed to load brands");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, [currentStore?._id, page, pageSize, searchTerm]);

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit: SubmitHandler<BrandFormValues> = async (values) => {
    if (!currentStore?._id) {
      toast.error("No store selected");
      return;
    }
    setIsSubmitting(true);
    try {
      let result;
      if (editingBrand) {
        result = await window.api.brands.update(editingBrand._id, {
          name: values.name,
          store: currentStore._id,
        });
      } else {
        result = await window.api.brands.create({
          name: values.name,
          store: currentStore._id,
        });
      }

      if (result.success) {
        toast.success(
          `Brand ${editingBrand ? "updated" : "created"} successfully`
        );
        setIsFormOpen(false);
        setEditingBrand(null);
        form.reset();
        loadBrands();
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const result = await window.api.brands.delete(deleteId);
      if (result.success) {
        toast.success("Brand deleted successfully");
        loadBrands();
      } else {
        toast.error("Error deleting brand: " + result.error);
      }
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setDeleteId(null);
      setIsDeleting(false);
    }
  };

  const openEdit = (brand: any) => {
    setEditingBrand(brand);
    form.reset({ name: brand.name });
    setIsFormOpen(true);
  };

  const openAdd = () => {
    setEditingBrand(null);
    form.reset({ name: "" });
    setIsFormOpen(true);
  };

  const columns = [
    { header: "Brand Name", accessor: "name" },
    {
      header: "Actions",
      accessor: "_id",
      render: (item: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-accent">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="bg-popover border-border text-popover-foreground"
            align="end"
          >
            <DropdownMenuItem
              onClick={() => openEdit(item)}
              className="focus:bg-[#4ade80] focus:text-black cursor-pointer"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteId(item._id)}
              className="focus:bg-red-500 focus:text-white cursor-pointer text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (!currentStore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-bold">No Store Selected</h2>
        <p className="text-muted-foreground">Please select a store to manage brands.</p>
      </div>
    );
  }

  return (
    <>
      <DataPage
        title="Brands"
        description="Manage product manufacturers and brands"
        data={brands}
        columns={columns}
        searchPlaceholder="Search brands..."
        fileName="brands_export"
        addLabel="Add Brand"
        onAdd={openAdd}
        isLoading={isLoading}
        currentPage={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
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
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) form.reset();
        }}
      >
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>
              {editingBrand ? "Edit Brand" : "Add New Brand"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Apple, Samsung, etc."
                        className="bg-muted border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  className="border-border"
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isLoading={isSubmitting}
                  loadingText={editingBrand ? "Updating..." : "Creating..."}
                  className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold"
                >
                  {editingBrand ? "Update" : "Create"}
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DeleteConfirm
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        description="This will permanently delete this brand. Products from this brand will need to be reassigned."
      />
    </>
  );
}
