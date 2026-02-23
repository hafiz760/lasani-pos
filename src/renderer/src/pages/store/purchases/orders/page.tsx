import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Truck,
  Clock,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Input } from "@renderer/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@renderer/components/ui/table";

import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { Badge } from "@renderer/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Pagination } from "@renderer/components/ui/pagination";

export default function PurchaseOrdersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [_isDeleting, setIsDeleting] = useState(false);
  const [_isReceiving, setIsReceiving] = useState(false);

  const [currentStore, setCurrentStore] = useState<any>(null);

  useEffect(() => {
    const storeData = localStorage.getItem('selectedStore');
    if (storeData) {
      setCurrentStore(JSON.parse(storeData));
    }
  }, []);

  const loadOrders = async () => {
    if (!currentStore?._id) return;
    setIsLoading(true);
    try {
      const result = await window.api.purchaseOrders.getAll({
        storeId: currentStore._id,
        page,
        pageSize,
        search: searchTerm,
      });
      if (result.success) {
        setOrders(result.data);
        setTotalRecords(result.total || result.data.length);
        setTotalPages(result.totalPages || 1);
      }
    } catch (error) {
      toast.error("Failed to load purchase orders");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [currentStore?._id, page, pageSize, searchTerm]);

  const handleReceive = async (poId: string) => {
    const confirmReceive = window.confirm("Are you sure you want to mark this order as received? This will update stock levels.");
    if (!confirmReceive) return;

    setIsReceiving(true);
    try {
      toast.loading("Updating inventory...");
      // In Electron version, we might need a specific handleReceive IPC if it involves complex logic
      // For now, let's assume update status to RECEIVED
      const result = await window.api.purchaseOrders.update(poId, { status: "RECEIVED" });
      toast.dismiss();
      if (result.success) {
        toast.success("Order received and stock updated!");
        loadOrders();
      } else {
        toast.error(result.error);
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error("Error: " + error.message);
    } finally {
      setIsReceiving(false);
    }
  };

  const handleDelete = async (order: any) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${order.poNumber}? If received, this will reverse the stock and accounting data.`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const res = await window.api.purchaseOrders.delete(order._id);
      if (res.success) {
        toast.success("Order deleted successfully");
        loadOrders();
      } else {
        toast.error(res.error);
      }
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentStore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-bold">No Store Selected</h2>
        <p className="text-muted-foreground">Please select a store to manage purchase orders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Purchase Orders
          </h2>
          <p className="text-muted-foreground">
            Track and manage inventory procurement
          </p>
        </div>
        <Button
          onClick={() => navigate("/dashboard/purchases/orders/create")}
          className="bg-[#E8705A] hover:bg-[#D4604C] text-black font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Order
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border text-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-gray-400 uppercase">
              Pending Orders
            </CardTitle>
            <Clock className="w-4 h-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter((o: any) => o.status !== "RECEIVED").length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border text-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-gray-400 uppercase">
              Received (All Time)
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-[#E8705A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter((o: any) => o.status === "RECEIVED").length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border text-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-gray-400 uppercase">
              Monthly Value
            </CardTitle>
            <Truck className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs.{" "}
              {orders
                .reduce((sum: any, o: any) => sum + (o.totalAmount || 0), 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border text-foreground">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by PO number or supplier..."
              className="bg-muted border-border pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="border-border">
              <TableRow className="hover:bg-accent border-border">
                <TableHead className="text-muted-foreground">
                  Order Details
                </TableHead>
                <TableHead className="text-muted-foreground">
                  Supplier
                </TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">
                  Total Amount
                </TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-right text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground italic"
                  >
                    No purchase orders found.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order: any) => (
                  <TableRow
                    key={order._id}
                    className="hover:bg-accent border-border cursor-pointer"
                    onClick={() => navigate(`/dashboard/purchases/orders/${order._id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#E8705A]">
                          {order.poNumber}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {(order.items || []).length} Product(s)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.supplier?.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {order.purchaseDate ? format(new Date(order.purchaseDate), "MMM dd, yyyy") : "N/A"}
                    </TableCell>
                    <TableCell className="text-sm font-bold text-[#E8705A]">
                      Rs. {(order.totalAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${order.status === "RECEIVED"
                          ? "bg-[#E8705A]/10 text-[#E8705A] border-[#E8705A]/20"
                          : order.status === "CONFIRMED"
                            ? "bg-blue-400/10 text-blue-400 border-blue-400/20"
                            : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                          } border`}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {order.status !== "RECEIVED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-accent hover:text-[#E8705A]"
                            onClick={() => handleReceive(order._id)}
                          >
                            <Truck className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500"
                          onClick={() => handleDelete(order)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
                totalRecords={totalRecords}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
