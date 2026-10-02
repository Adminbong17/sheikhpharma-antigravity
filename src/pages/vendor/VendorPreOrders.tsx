import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useVendor } from "@/contexts/VendorContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, AlertTriangle } from "lucide-react";
import { isEffectivePreorder, AUTO_PREORDER_THRESHOLD } from "@/lib/preorder";
import BackButton from "@/components/BackButton";

const VendorPreOrders = () => {
  const { formatPrice } = useCurrency();
  const { vendor } = useVendor();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["vendor-preorder-products", vendor?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", vendor!.id)
        .eq("is_active", true)
        .order("preorder_count", { ascending: false });
      return (data || []).filter((p) => isEffectivePreorder(p));
    },
    enabled: !!vendor?.id,
  });

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold">Pre-Order Products</h1>
        <Badge variant="secondary">{products.length}</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : products.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No pre-order products found.</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {products.map((p) => {
              const isAuto = !p.is_preorder && p.stock > 0 && p.stock < AUTO_PREORDER_THRESHOLD;
              return (
                <div key={p.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-12 w-12 rounded object-cover bg-muted shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-lg shrink-0">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{formatPrice(p.price)}</span>
                        <span className={`text-xs ${p.stock <= 0 ? "text-destructive font-semibold" : p.stock < AUTO_PREORDER_THRESHOLD ? "text-yellow-600 font-semibold" : "text-muted-foreground"}`}>
                          Stock: {p.stock}
                        </span>
                        {isAuto ? (
                          <Badge variant="outline" className="text-[10px] gap-0.5 text-yellow-700 border-yellow-400">
                            <AlertTriangle className="h-2.5 w-2.5" /> Auto
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] bg-accent text-accent-foreground">Manual</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-primary">{p.preorder_count || 0}</p>
                      <p className="text-[10px] text-muted-foreground">pre-orders</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="rounded-lg border bg-card hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Pre-Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const isAuto = !p.is_preorder && p.stock > 0 && p.stock < AUTO_PREORDER_THRESHOLD;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded object-cover bg-muted" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-lg">📦</div>
                          )}
                          <span className="font-medium line-clamp-1">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatPrice(p.price)}</TableCell>
                      <TableCell>
                        <span className={p.stock <= 0 ? "text-destructive font-semibold" : p.stock < AUTO_PREORDER_THRESHOLD ? "text-yellow-600 font-semibold" : ""}>
                          {p.stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isAuto ? (
                          <Badge variant="outline" className="gap-1 text-yellow-700 border-yellow-400">
                            <AlertTriangle className="h-3 w-3" /> Auto
                          </Badge>
                        ) : (
                          <Badge className="bg-accent text-accent-foreground">Manual</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary text-lg">
                        {p.preorder_count || 0}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default VendorPreOrders;
