import { useParams } from "react-router-dom";
import { useCustomer } from "@/contexts/CustomerContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User, CreditCard, Truck, PackageCheck, MessageSquare, RotateCcw, Heart, Store, Ticket, ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const orderStatuses = [
  { key: "pending", slug: "unpaid", label: "Unpaid", icon: CreditCard },
  { key: "processing", slug: "to-ship", label: "To Ship", icon: Truck },
  { key: "shipped", slug: "to-receive", label: "To Receive", icon: PackageCheck },
  { key: "delivered", slug: "review", label: "Review", icon: MessageSquare },
  { key: "cancelled", slug: "return-cancel", label: "Return &\nCancel", icon: RotateCcw },
];

const AdminCustomerOverview = () => {
  const { userId } = useParams<{ userId: string }>();
  const { customer } = useCustomer();
  const { formatPrice } = useCurrency();
  const basePath = `/admin/customer-dashboard/${userId}`;

  const displayName = customer?.username || customer?.email?.split("@")[0] || "Customer";

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-customer-orders", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const orderCountByStatus = (status: string) =>
    orders.filter((o) => o.status === status).length;

  const statusBadgeColor = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-600",
      processing: "bg-blue-500/10 text-blue-600",
      shipped: "bg-purple-500/10 text-purple-600",
      delivered: "bg-green-500/10 text-green-600",
      cancelled: "bg-red-500/10 text-red-600",
      refunded: "bg-muted text-muted-foreground",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80">
        <div className="px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20 text-2xl font-bold text-primary-foreground ring-2 ring-primary-foreground/30">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold text-primary-foreground">{displayName}</h1>
              <p className="text-xs text-primary-foreground/70 truncate">{customer?.email}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-primary-foreground/20 px-3 py-1.5">
              <User className="h-3.5 w-3.5 text-primary-foreground" />
              <span className="text-xs font-medium text-primary-foreground">Admin View</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{orders.length}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{orders.filter(o => o.status === "delivered").length}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold">{formatPrice(orders.reduce((sum, o) => sum + Number(o.total), 0))}</p>
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders by status */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-base font-bold">Orders</h2>
            <Link to={`${basePath}/orders`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <CardContent className="pb-4">
            <div className="grid grid-cols-5 gap-1">
              {orderStatuses.map((s) => {
                const count = orderCountByStatus(s.key);
                return (
                  <Link
                    key={s.key}
                    to={`${basePath}/orders/${s.slug}`}
                    className="group relative flex flex-col items-center gap-1 rounded-lg p-2 transition-colors hover:bg-muted"
                  >
                    <div className="relative">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                        <s.icon className="h-4 w-4" />
                      </div>
                      {count > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                          {count}
                        </span>
                      )}
                    </div>
                    <span className="text-center text-[10px] text-muted-foreground whitespace-pre-line leading-tight">
                      {s.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-base font-bold">Recent Orders</h2>
          </div>
          <CardContent>
            {orders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <PackageCheck className="h-10 w-10 opacity-30" />
                <p className="text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          #{String(order.order_number ?? 0).padStart(11, "0")}
                        </span>
                        <Badge variant="secondary" className={statusBadgeColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <p className="text-sm font-bold ml-2 shrink-0">{formatPrice(order.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Nav */}
        <Card>
          <CardContent className="p-2">
            <Link to={`${basePath}/wishlist`} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-muted">
              <Heart className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium">Wishlist</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to={`${basePath}/followed`} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-muted">
              <Store className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium">Followed Stores</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to={`${basePath}/settings`} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium">Profile Settings</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCustomerOverview;
