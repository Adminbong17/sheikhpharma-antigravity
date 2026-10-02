import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ShoppingCart, Search, Eye, Package } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderInvoicePrint } from "@/components/OrderInvoicePrint";
import BackButton from "@/components/BackButton";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const statusColor: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600",
  processing: "bg-blue-500/10 text-blue-600",
  shipped: "bg-purple-500/10 text-purple-600",
  delivered: "bg-green-500/10 text-green-600",
  cancelled: "bg-red-500/10 text-red-600",
};

const VendorOrders = () => {
  const { formatPrice } = useCurrency();
  const { vendorId } = useVendor();
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [courierCache, setCourierCache] = useState<Record<string, { minRatio: number; couriers: any[] }>>({});

  useEffect(() => {
    if (!vendorId) return;
    const loadOrders = async () => {
      const { data } = await supabase
        .from("order_items")
        .select("*, products!inner(id, name, image_url, vendor_id), orders!inner(id, order_number, status, total, created_at, customer_name, customer_phone, customer_address, customer_division, customer_zilla, customer_upazilla, payment_method, transaction_id, order_notes, steadfast_tracking_code)")
        .eq("products.vendor_id", vendorId)
        .order("created_at", { ascending: false });
      setOrders(data || []);

      // batch courier trust check
      const phones = [...new Set((data || []).map((o: any) => o.orders?.customer_phone).filter(Boolean))];
      if (phones.length > 0 && SUPABASE_URL && SUPABASE_ANON_KEY) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          const results: Record<string, { minRatio: number; couriers: any[] }> = {};
          await Promise.all(phones.map(async (phone) => {
            try {
              const res = await globalThis.fetch(`${SUPABASE_URL}/functions/v1/bdcourier`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
                body: JSON.stringify({ phone }),
              });
              if (res.ok) {
                const json = await res.json();
                if (json.success && json.data?.couriers) {
                  const couriers = json.data.couriers;
                  const ratios = couriers.map((c: any) => Number(c.success_ratio ?? 0));
                  results[phone] = { minRatio: Math.min(...ratios), couriers };
                }
              }
            } catch {}
          }));
          setCourierCache(results);
        }
      }
    };
    loadOrders();
  }, [vendorId]);

  const filtered = orders.filter((item) => {
    const matchesSearch = !searchQuery || 
      String(item.orders?.order_number).includes(searchQuery) ||
      item.products?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.orders?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.orders?.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-3 sm:p-6">
      <BackButton className="mb-2" />
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">My Orders</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.keys(statusColor).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No orders found</p>
        ) : filtered.map((item) => {
          const phone = item.orders?.customer_phone;
          const cached = phone ? courierCache[phone] : null;
          const minRatio = cached ? cached.minRatio : null;
          return (
            <div key={item.id} className="rounded-lg border bg-card p-3 space-y-2 cursor-pointer hover:border-primary/50" onClick={() => setSelectedItem(item)}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium">#{String(item.orders?.order_number ?? 0).padStart(11, '0')}</span>
                <Badge className={statusColor[item.orders?.status] || ""} >{item.orders?.status}</Badge>
              </div>
              <div className="flex items-center gap-2">
                {item.products?.image_url && <img src={item.products.image_url} alt="" className="h-10 w-10 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{item.products?.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity} · {formatPrice(item.price * item.quantity)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{new Date(item.orders?.created_at).toLocaleDateString()}</span>
                {minRatio !== null && (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold ${minRatio >= 80 ? 'bg-green-100 text-green-700' : minRatio >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    Trust {minRatio.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trust</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No orders found</TableCell></TableRow>
              ) : filtered.map((item) => {
                const phone = item.orders?.customer_phone;
                const cached = phone ? courierCache[phone] : null;
                const minRatio = cached ? cached.minRatio : null;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{String(item.orders?.order_number ?? 0).padStart(11, '0')}</TableCell>
                    <TableCell><Badge className={statusColor[item.orders?.status] || ""}>{item.orders?.status}</Badge></TableCell>
                    <TableCell>
                      {minRatio !== null ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${minRatio >= 80 ? 'bg-green-100 text-green-700' : minRatio >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {minRatio.toFixed(1)}%
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(item.orders?.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setSelectedItem(item)}>
                        <Eye className="h-3.5 w-3.5" /> Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Details Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Order Details</SheetTitle>
          </SheetHeader>

          {selectedItem && (
            <div className="space-y-5">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono font-medium">{String(selectedItem.orders?.order_number ?? 0).padStart(11, '0')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{new Date(selectedItem.orders?.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="capitalize">{selectedItem.orders?.payment_method || "N/A"}</span>
                </div>
                {selectedItem.orders?.transaction_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID</span>
                    <span className="font-mono text-xs">{selectedItem.orders.transaction_id}</span>
                  </div>
                )}
                {selectedItem.orders?.customer_phone && courierCache[selectedItem.orders.customer_phone] && (() => {
                  const { minRatio } = courierCache[selectedItem.orders.customer_phone];
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Customer Trust</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${minRatio >= 80 ? 'bg-green-100 text-green-700' : minRatio >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {minRatio.toFixed(1)}%
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <p className="font-semibold mb-1">Status</p>
                <Badge className={`${statusColor[selectedItem.orders?.status] || ""} text-sm px-3 py-1`}>
                  {selectedItem.orders?.status}
                </Badge>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <p className="font-semibold text-sm">Product</p>
                <div className="flex items-center gap-3">
                  {selectedItem.products?.image_url ? (
                    <img src={selectedItem.products.image_url} alt={selectedItem.products.name} className="h-12 w-12 rounded-md object-cover border" />
                  ) : (
                    <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedItem.products?.name || selectedItem.product_name || "Product"}</p>
                    <p className="text-xs text-muted-foreground">Qty: {selectedItem.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold shrink-0">{formatPrice(selectedItem.price * selectedItem.quantity)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center rounded-lg border bg-primary/5 px-4 py-3">
                <span className="font-semibold">Order Total</span>
                <span className="text-lg font-bold text-primary">{formatPrice(selectedItem.orders?.total)}</span>
              </div>

              <OrderInvoicePrint
                hideCustomer
                order={{
                  id: selectedItem.orders?.id,
                  order_number: selectedItem.orders?.order_number,
                  created_at: selectedItem.orders?.created_at,
                  status: selectedItem.orders?.status,
                  payment_method: selectedItem.orders?.payment_method,
                  transaction_id: selectedItem.orders?.transaction_id,
                  customer_name: selectedItem.orders?.customer_name,
                  customer_phone: selectedItem.orders?.customer_phone,
                  customer_address: selectedItem.orders?.customer_address,
                  customer_division: selectedItem.orders?.customer_division,
                  customer_zilla: selectedItem.orders?.customer_zilla,
                  customer_upazilla: selectedItem.orders?.customer_upazilla,
                  order_notes: selectedItem.orders?.order_notes,
                  total: selectedItem.orders?.total,
                  steadfast_tracking_code: selectedItem.orders?.steadfast_tracking_code,
                  order_items: [{
                    id: selectedItem.id,
                    quantity: selectedItem.quantity,
                    price: selectedItem.price,
                    products: selectedItem.products,
                  }],
                }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default VendorOrders;
