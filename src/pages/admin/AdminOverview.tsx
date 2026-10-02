import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, Users, DollarSign } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import NotificationPanel from "@/components/NotificationPanel";
import BackButton from "@/components/BackButton";

const AdminOverview = () => {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ products: 0, orders: 0, users: 0, revenue: 0, creditBalance: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [products, orders, users, vendors, payouts] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("vendors").select("id, commission_rate"),
        (supabase as any).from("vendor_payouts").select("vendor_id, amount, status"),
      ]);
      const revenue = (orders.data || []).reduce((sum, o) => sum + Number(o.total), 0);
      
      const vendorList = vendors.data || [];
      const paidByVendor: Record<string, number> = {};
      (payouts.data || []).filter((p: any) => p.status === "done").forEach((p: any) => {
        paidByVendor[p.vendor_id] = (paidByVendor[p.vendor_id] || 0) + Number(p.amount);
      });
      
      const { data: allItems } = await supabase.from("order_items").select("price, quantity, products!inner(vendor_id)");
      const revenueByVendor: Record<string, number> = {};
      (allItems || []).forEach((i: any) => {
        const vid = i.products?.vendor_id;
        if (vid) revenueByVendor[vid] = (revenueByVendor[vid] || 0) + i.price * i.quantity;
      });
      
      let creditBalance = 0;
      vendorList.forEach((v: any) => {
        const vRevenue = revenueByVendor[v.id] || 0;
        const vCommission = vRevenue * (v.commission_rate / 100);
        const vPaid = paidByVendor[v.id] || 0;
        creditBalance += Math.max(vRevenue - vCommission - vPaid, 0);
      });

      setStats({
        products: products.count || 0,
        orders: orders.data?.length || 0,
        users: users.count || 0,
        revenue,
        creditBalance,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Total Products", value: stats.products, icon: Package, color: "text-blue-600", path: "/admin/products" },
    { title: "Total Orders", value: stats.orders, icon: ShoppingCart, color: "text-green-600", path: "/admin/orders" },
    { title: "Total Users", value: stats.users, icon: Users, color: "text-purple-600", path: "/admin/users" },
    { title: "Revenue", value: formatPrice(stats.revenue), icon: DollarSign, color: "text-primary", path: "/admin/orders" },
    { title: "Credit Balance", value: formatPrice(stats.creditBalance), icon: DollarSign, color: "text-orange-600", path: "/admin/payouts" },
  ];

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <h1 className="text-xl sm:text-2xl font-bold">Dashboard Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Card
            key={card.title}
            className="cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
            onClick={() => navigate(card.path)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <NotificationPanel role="admin" title="Admin Notifications" />
    </div>
  );
};

export default AdminOverview;
