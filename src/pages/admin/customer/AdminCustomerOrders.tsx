import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PackageCheck } from "lucide-react";

const statusConfig: Record<string, { label: string; dbStatus: string; color: string }> = {
  unpaid: { label: "Unpaid", dbStatus: "pending", color: "bg-yellow-500/10 text-yellow-600" },
  "to-ship": { label: "To Ship", dbStatus: "processing", color: "bg-blue-500/10 text-blue-600" },
  "to-receive": { label: "To Receive", dbStatus: "shipped", color: "bg-purple-500/10 text-purple-600" },
  review: { label: "Review", dbStatus: "delivered", color: "bg-green-500/10 text-green-600" },
  "return-cancel": { label: "Return & Cancel", dbStatus: "cancelled", color: "bg-red-500/10 text-red-600" },
};

const AdminCustomerOrders = () => {
  const { userId, status } = useParams<{ userId: string; status: string }>();
  const { formatPrice } = useCurrency();

  const config = status ? statusConfig[status] : null;
  const pageTitle = config ? config.label : "All Orders";

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-customer-orders-filtered", userId, config?.dbStatus],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, order_items(*, products(name, image_url))")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });

      if (config?.dbStatus) {
        query = query.eq("status", config.dbStatus as any);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!userId,
  });

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-bold">{pageTitle} Orders</h1>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <PackageCheck className="h-14 w-14 opacity-20" />
          <p className="font-medium">No {pageTitle.toLowerCase()} orders</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <Card key={order.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b px-4 py-2.5 bg-muted/30">
                  <span className="font-mono text-xs text-muted-foreground">
                    #{String(order.order_number ?? 0).padStart(11, "0")}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={config?.color || "bg-muted text-muted-foreground"}>
                      {config?.label || order.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
                    {item.products?.image_url ? (
                      <img src={item.products.image_url} alt={item.products.name} className="h-14 w-14 rounded-lg object-cover border" />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
                        <PackageCheck className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.products?.name || item.product_name || "Product"}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold shrink-0">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}

                <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                  <span className="text-xs text-muted-foreground">
                    Payment: <span className="font-medium">{order.payment_method?.toUpperCase()}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Total:</span>
                    <span className="text-sm font-bold text-primary">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCustomerOrders;
