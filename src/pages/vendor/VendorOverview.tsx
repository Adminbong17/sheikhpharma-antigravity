import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Package, ShoppingCart, DollarSign, Store, Users, Wallet } from "lucide-react";
import NotificationPanel from "@/components/NotificationPanel";
import BackButton from "@/components/BackButton";

const statusColor: Record<string, string> = {
  approved: "bg-green-500/10 text-green-600",
  pending: "bg-yellow-500/10 text-yellow-600",
  rejected: "bg-red-500/10 text-red-600",
};

const VendorOverview = () => {
  const { formatPrice } = useCurrency();
  const { vendorId, vendor, loading: vendorLoading } = useVendor();
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, commission: 0, paid: 0 });
  const [followers, setFollowers] = useState(0);

  useEffect(() => {
    if (!vendorId || !vendor) return;
    const load = async () => {
      try {
        const [prodRes, orderItemsRes, payoutsRes] = await Promise.all([
          supabase.from("products").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId),
          supabase.from("order_items").select("price, quantity, product_id, products!inner(vendor_id)").eq("products.vendor_id", vendorId),
          (supabase as any).from("vendor_payouts").select("amount").eq("vendor_id", vendorId).eq("status", "done"),
        ]);
        const revenue = (orderItemsRes.data || []).reduce((s: any, i: any) => s + i.price * i.quantity, 0);
        const commission = revenue * (vendor.commission_rate / 100);
        const paid = (payoutsRes.data || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
        setStats({ products: prodRes.count || 0, orders: (orderItemsRes.data || []).length, revenue, commission, paid });
      } catch (e) {
        console.error("VendorOverview stats error:", e);
      }
    };
    load();

    const fetchFollowers = async () => {
      const { count } = await (supabase as any)
        .from("vendor_follows")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendorId);
      setFollowers(count || 0);
    };
    fetchFollowers();
  }, [vendorId, vendor]);

  if (vendorLoading || !vendor) {
    return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading vendor profile...</div>;
  }

  return (
    <div className="p-3 sm:p-6">
      <BackButton className="mb-2" />
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{vendor.store_name}</h1>
        <Badge className={statusColor[vendor.status]}>{vendor.status}</Badge>
      </div>
      {vendor.status === "pending" && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50/80 p-4 text-sm text-yellow-800">
          Your application is under review. You can add products once approved by admin.
        </div>
      )}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Followers</CardTitle>
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </CardHeader>
          <CardContent><p className="text-xl sm:text-2xl font-bold">{followers}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Products</CardTitle>
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-xl sm:text-2xl font-bold">{stats.products}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Order Items</CardTitle>
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-xl sm:text-2xl font-bold">{stats.orders}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </CardHeader>
          <CardContent><p className="text-xl sm:text-2xl font-bold">{formatPrice(stats.revenue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Commission ({vendor.commission_rate}%)</CardTitle>
            <Store className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-xl sm:text-2xl font-bold">{formatPrice(stats.commission)}</p></CardContent>
        </Card>
        <Card className="border-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Balance</CardTitle>
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </CardHeader>
          <CardContent><p className="text-xl sm:text-2xl font-bold text-primary">{formatPrice(Math.max(stats.revenue - stats.commission - stats.paid, 0))}</p></CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <NotificationPanel role="vendor" title="Vendor Notifications" />
      </div>
    </div>
  );
};

export default VendorOverview;
