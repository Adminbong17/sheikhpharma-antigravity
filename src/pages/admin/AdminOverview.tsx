import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package, ShoppingCart, Users, DollarSign, ScanLine, Store, FileText,
  Microscope, Landmark, Tag, TrendingUp, AlertTriangle, ArrowRight,
  Clock, CheckCircle2, RefreshCw, Eye, Sparkles, Receipt, Ticket, Stethoscope,
  Pill, Activity, Layers, ArrowUpRight
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import NotificationPanel from "@/components/NotificationPanel";
import BackButton from "@/components/BackButton";
import { Skeleton } from "@/components/ui/skeleton";

interface LowStockItem {
  id: string;
  name: string;
  generic_name: string | null;
  stock: number;
  price: number;
  price_unit?: string | null;
}

interface RecentOrder {
  id: string;
  order_number?: number;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  status: string;
  is_pos_sale?: boolean | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300",
  processing: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300",
  shipped: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300",
  refunded: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
};

const AdminOverview = () => {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    products: 0,
    inStockCount: 0,
    orders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    processingOrders: 0,
    cancelledOrders: 0,
    posOrdersCount: 0,
    onlineOrdersCount: 0,
    users: 0,
    revenue: 0,
    posRevenue: 0,
    onlineRevenue: 0,
    creditBalance: 0,
    cashBalance: 0,
    vendorCount: 0,
    doctorCount: 0,
    labBookingsCount: 0,
  });

  const [lowStockProducts, setLowStockProducts] = useState<LowStockItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [
        productsRes,
        lowStockRes,
        ordersRes,
        usersRes,
        vendorsRes,
        payoutsRes,
        cashTxRes,
        doctorsRes,
        recentOrdersRes
      ] = await Promise.all([
        supabase.from("products").select("id, stock", { count: "exact" }),
        supabase
          .from("products")
          .select("id, name, generic_name, stock, price, price_unit")
          .lte("stock", 15)
          .order("stock", { ascending: true })
          .limit(6),
        supabase.from("orders").select("id, total, status, is_pos_sale"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("vendors").select("id, commission_rate"),
        (supabase as any).from("vendor_payouts").select("vendor_id, amount, status"),
        (supabase as any).from("cash_transactions").select("type, amount"),
        supabase.from("doctors").select("id", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("id, order_number, customer_name, customer_phone, total, status, is_pos_sale, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const allOrders = ordersRes.data || [];
      const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      
      const posOrders = allOrders.filter(o => o.is_pos_sale);
      const onlineOrders = allOrders.filter(o => !o.is_pos_sale);
      const posRevenue = posOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const onlineRevenue = onlineOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

      const pendingOrders = allOrders.filter(o => o.status === "pending").length;
      const deliveredOrders = allOrders.filter(o => o.status === "delivered").length;
      const processingOrders = allOrders.filter(o => o.status === "processing").length;
      const cancelledOrders = allOrders.filter(o => ["cancelled", "refunded"].includes(o.status)).length;

      // Products breakdown
      const productList = productsRes.data || [];
      const inStockCount = productList.filter((p: any) => Number(p.stock) > 0).length;

      // Cash Balance from cash_transactions
      const cashList = cashTxRes.data || [];
      const cashIn = cashList.filter((c: any) => c.type === "cash_in").reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      const cashOut = cashList.filter((c: any) => c.type === "cash_out").reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      const cashBalance = cashIn - cashOut;

      // Vendor Credit Balance Calculation
      const vendorList = vendorsRes.data || [];
      const paidByVendor: Record<string, number> = {};
      (payoutsRes.data || []).filter((p: any) => p.status === "done").forEach((p: any) => {
        paidByVendor[p.vendor_id] = (paidByVendor[p.vendor_id] || 0) + Number(p.amount);
      });

      const { data: allItems } = await supabase
        .from("order_items")
        .select("price, quantity, products!inner(vendor_id)");
      const revenueByVendor: Record<string, number> = {};
      (allItems || []).forEach((i: any) => {
        const vid = i.products?.vendor_id;
        if (vid) revenueByVendor[vid] = (revenueByVendor[vid] || 0) + i.price * i.quantity;
      });

      let creditBalance = 0;
      vendorList.forEach((v: any) => {
        const vRevenue = revenueByVendor[v.id] || 0;
        const vCommission = vRevenue * ((v.commission_rate || 0) / 100);
        const vPaid = paidByVendor[v.id] || 0;
        creditBalance += Math.max(vRevenue - vCommission - vPaid, 0);
      });

      setStats({
        products: productsRes.count || productList.length,
        inStockCount,
        orders: allOrders.length,
        pendingOrders,
        deliveredOrders,
        processingOrders,
        cancelledOrders,
        posOrdersCount: posOrders.length,
        onlineOrdersCount: onlineOrders.length,
        users: usersRes.count || 0,
        revenue: totalRevenue,
        posRevenue,
        onlineRevenue,
        creditBalance,
        cashBalance,
        vendorCount: vendorList.length,
        doctorCount: doctorsRes.count || 0,
        labBookingsCount: 0,
      });

      setLowStockProducts((lowStockRes.data as LowStockItem[]) || []);
      setRecentOrders((recentOrdersRes.data as RecentOrder[]) || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Top 5 vibrant metric cards
  const metricCards = [
    {
      title: "সর্বমোট রাজস্ব (Total Revenue)",
      value: formatPrice(stats.revenue),
      subtext: `অনলাইন: ${formatPrice(stats.onlineRevenue)} | POS: ${formatPrice(stats.posRevenue)}`,
      badge: "বিক্রয় আয়",
      badgeColor: "bg-emerald-400/20 text-emerald-100 border-emerald-300/30",
      gradient: "from-emerald-600 via-teal-600 to-emerald-700",
      icon: DollarSign,
      path: "/admin/orders",
    },
    {
      title: "মোট অর্ডার (Total Orders)",
      value: `${stats.orders} টি`,
      subtext: `অপেক্ষমান: ${stats.pendingOrders} | ডেলিভার্ড: ${stats.deliveredOrders}`,
      badge: stats.pendingOrders > 0 ? `${stats.pendingOrders} নতুন` : "আপডেট",
      badgeColor: "bg-blue-400/20 text-blue-100 border-blue-300/30",
      gradient: "from-blue-600 via-indigo-600 to-blue-700",
      icon: ShoppingCart,
      path: "/admin/orders",
    },
    {
      title: "ঔষধ ও ক্যাটালগ (Inventory)",
      value: `${stats.products} টি`,
      subtext: `ইন-স্টক: ${stats.inStockCount} | লো-স্টক: ${lowStockProducts.length}`,
      badge: lowStockProducts.length > 0 ? `${lowStockProducts.length} লো-স্টক` : "পর্যাপ্ত",
      badgeColor: lowStockProducts.length > 0 ? "bg-amber-400/30 text-amber-100 border-amber-300/40" : "bg-purple-400/20 text-purple-100 border-purple-300/30",
      gradient: "from-violet-600 via-purple-600 to-indigo-700",
      icon: Package,
      path: "/admin/products",
    },
    {
      title: "গ্রাহক ও অংশীদার (Accounts)",
      value: `${stats.users} জন`,
      subtext: `ভেন্ডর: ${stats.vendorCount} | চিকিৎসক: ${stats.doctorCount}`,
      badge: "কাস্টমার বেইজ",
      badgeColor: "bg-amber-400/20 text-amber-100 border-amber-300/30",
      gradient: "from-amber-600 via-orange-600 to-amber-700",
      icon: Users,
      path: "/admin/users",
    },
    {
      title: "ক্যাশ ও ব্যালেন্স (Cash Balance)",
      value: formatPrice(stats.cashBalance),
      subtext: `ভেন্ডর দায়: ${formatPrice(stats.creditBalance)}`,
      badge: "ক্যাশ ইন হ্যান্ড",
      badgeColor: "bg-rose-400/20 text-rose-100 border-rose-300/30",
      gradient: "from-rose-600 via-pink-600 to-rose-700",
      icon: Landmark,
      path: "/admin/cash-book",
    },
  ];

  // Core Operations & Modules Grid
  const operationsModules = [
    {
      title: "POS কাউন্টার সেল",
      desc: "দ্রুত বারকোড স্ক্যান, প্রিন্ট রিসিট ও ক্যাশ ড্রয়ার",
      icon: ScanLine,
      path: "/admin/pos",
      badge: "কাউন্টার",
      bgClass: "bg-emerald-50/80 dark:bg-emerald-950/30 hover:bg-emerald-100/80 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      tagColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/50",
    },
    {
      title: "ঔষধ ও ক্যাটালগ",
      desc: "স্টক আপডেট, ব্র্যান্ড ও জেনেরিক মেডিসিন তালিকা",
      icon: Package,
      path: "/admin/products",
      badge: `${stats.products} প্রোডাক্ট`,
      bgClass: "bg-blue-50/80 dark:bg-blue-950/30 hover:bg-blue-100/80 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100",
      iconColor: "text-blue-600 dark:text-blue-400",
      tagColor: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300/50",
    },
    {
      title: "অর্ডার ও কুরিয়ার",
      desc: "অনলাইন ডেলিভারি, স্টিডফাস্ট ও পাঠাও ট্র্যাকিং",
      icon: ShoppingCart,
      path: "/admin/orders",
      badge: `${stats.pendingOrders} অপেক্ষমান`,
      bgClass: "bg-indigo-50/80 dark:bg-indigo-950/30 hover:bg-indigo-100/80 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      tagColor: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-300/50",
    },
    {
      title: "প্রেসক্রিপশন আপলোড",
      desc: "গ্রাহকদের প্রেসক্রিপশন পর্যালোচনা ও মেডিসিন অর্ডার",
      icon: Pill,
      path: "/admin/prescriptions",
      badge: "Rx",
      bgClass: "bg-teal-50/80 dark:bg-teal-950/30 hover:bg-teal-100/80 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-100",
      iconColor: "text-teal-600 dark:text-teal-400",
      tagColor: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-300/50",
    },
    {
      title: "ক্যাশবুক ও হিসাব",
      desc: "দৈনিক আয়-ব্যয়, ক্যাশ ভাউচার ও পুঁজিপত্র",
      icon: Landmark,
      path: "/admin/cash-book",
      badge: "হিসাব",
      bgClass: "bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100/80 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100",
      iconColor: "text-amber-600 dark:text-amber-400",
      tagColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/50",
    },
    {
      title: "ল্যাব টেস্ট ও বুকিং",
      desc: "ডায়াগনস্টিক টেস্ট প্যাকেজ ও রক্তদাতা নেটওয়ার্ক",
      icon: Microscope,
      path: "/admin/lab-tests",
      badge: "স্বাস্থ্যসেবা",
      bgClass: "bg-rose-50/80 dark:bg-rose-950/30 hover:bg-rose-100/80 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100",
      iconColor: "text-rose-600 dark:text-rose-400",
      tagColor: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300/50",
    },
    {
      title: "ভেন্ডর ও পার্টনার",
      desc: "ফার্মেসি অংশীদার, ব্যালেন্স ও পেআউট অনুরোধ",
      icon: Store,
      path: "/admin/vendors",
      badge: `${stats.vendorCount} ভেন্ডর`,
      bgClass: "bg-purple-50/80 dark:bg-purple-950/30 hover:bg-purple-100/80 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-100",
      iconColor: "text-purple-600 dark:text-purple-400",
      tagColor: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/50",
    },
    {
      title: "মার্কেটিং ও অফার",
      desc: "ডিসকাউন্ট কুপন, ব্যানার ও ফ্ল্যাশ ডিল ক্যাম্পেইন",
      icon: Ticket,
      path: "/admin/coupons",
      badge: "প্রমোশন",
      bgClass: "bg-orange-50/80 dark:bg-orange-950/30 hover:bg-orange-100/80 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100",
      iconColor: "text-orange-600 dark:text-orange-400",
      tagColor: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-300/50",
    },
  ];

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-[1600px] mx-auto min-w-0">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-emerald-700 to-teal-800 text-white p-5 sm:p-7 shadow-lg">
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-teal-400/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-[11px] backdrop-blur-xs font-medium">
                <Sparkles className="h-3 w-3 mr-1 text-emerald-300" /> শেখ ফার্মা মডেল ফার্মেসি কন্ট্রোল প্যানেল
              </Badge>
              <span className="text-white/70 text-xs hidden sm:inline">•</span>
              <span className="text-xs text-white/80 font-medium hidden sm:inline">
                {new Date().toLocaleDateString("bn-BD", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              অ্যাডমিন ড্যাশবোর্ড ওভারভিউ
            </h1>
            <p className="text-white/80 text-xs sm:text-sm max-w-2xl leading-relaxed">
              অনলাইন ফার্মেসি, কাউন্টার POS সেলস, ল্যাব বুকিং এবং ক্যাশবুক ট্র্যাকিংয়ের সমন্বিত সার্বিক পর্যবেক্ষণ।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white/15 hover:bg-white/25 text-white border-white/30 text-xs h-9 gap-1.5 backdrop-blur-xs shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              রিফ্রেশ
            </Button>
            <Link to="/admin/pos">
              <Button
                size="sm"
                className="bg-white hover:bg-white/90 text-emerald-800 font-bold text-xs h-9 gap-1.5 shadow-md hover:shadow-lg transition-all"
              >
                <ScanLine className="h-4 w-4 text-emerald-600" />
                নতুন POS সেল
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Top 5 High-Impact Colourful Gradient Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metricCards.map((card, idx) => (
          <Card
            key={idx}
            onClick={() => navigate(card.path)}
            className={`cursor-pointer overflow-hidden border-0 text-white shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br ${card.gradient}`}
          >
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-white/85 line-clamp-1">{card.title}</span>
                <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs shrink-0 shadow-inner">
                  <card.icon className="h-4 w-4 text-white" />
                </div>
              </div>

              <div>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-xs">
                  {card.value}
                </p>
                <p className="text-[11px] text-white/80 mt-1 line-clamp-1 font-medium">
                  {card.subtext}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/15 text-[10px]">
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold backdrop-blur-xs ${card.badgeColor}`}>
                  {card.badge}
                </span>
                <span className="flex items-center gap-0.5 text-white/80 hover:text-white font-medium">
                  বিস্তারিত <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Operations Hub (All Sections) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-primary" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              অপারেশনাল মডিউল ও অপশনসমূহ (Quick Management Hub)
            </h2>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            সরাসরি দ্রুত কাজের জন্য মডিউল নির্বাচন করুন
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {operationsModules.map((item, idx) => (
            <Card
              key={idx}
              onClick={() => navigate(item.path)}
              className={`cursor-pointer border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${item.bgClass}`}
            >
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-background/80 shadow-xs border border-border/50">
                    <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-semibold ${item.tagColor}`}>
                    {item.badge}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {item.desc}
                  </p>
                </div>
                <div className="flex items-center justify-end text-xs font-semibold pt-1 border-t border-border/30">
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    প্রবেশ করুন <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Two Column Grid: Order Status Distribution + Low Stock Alert */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Order Analytics & Distribution (7 Cols) */}
        <Card className="lg:col-span-7 border shadow-xs bg-card">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-bold">লাইভ অর্ডার স্ট্যাটাস ও চ্যানেল অনুপাত</CardTitle>
            </div>
            <Link to="/admin/orders">
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary hover:text-primary">
                সকল অর্ডার <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-5">
            {/* Multi-segmented Visual Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>অর্ডার স্ট্যাটাস বিতরণ (মোট {stats.orders} টি)</span>
                <span>{stats.deliveredOrders} টি সফল ডেলিভারি</span>
              </div>
              <div className="h-3.5 w-full rounded-full bg-muted/60 overflow-hidden flex shadow-inner">
                {stats.orders > 0 ? (
                  <>
                    <div
                      style={{ width: `${(stats.deliveredOrders / stats.orders) * 100}%` }}
                      className="bg-emerald-500 h-full transition-all"
                      title={`Delivered: ${stats.deliveredOrders}`}
                    />
                    <div
                      style={{ width: `${(stats.processingOrders / stats.orders) * 100}%` }}
                      className="bg-blue-500 h-full transition-all"
                      title={`Processing: ${stats.processingOrders}`}
                    />
                    <div
                      style={{ width: `${(stats.pendingOrders / stats.orders) * 100}%` }}
                      className="bg-amber-500 h-full transition-all"
                      title={`Pending: ${stats.pendingOrders}`}
                    />
                    <div
                      style={{ width: `${(stats.cancelledOrders / stats.orders) * 100}%` }}
                      className="bg-rose-500 h-full transition-all"
                      title={`Cancelled: ${stats.cancelledOrders}`}
                    />
                  </>
                ) : (
                  <div className="w-full h-full bg-muted text-center text-[10px] text-muted-foreground flex items-center justify-center">
                    কোনো অর্ডার নেই
                  </div>
                )}
              </div>
            </div>

            {/* Status Pills Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  অপেক্ষমান (Pending)
                </div>
                <p className="text-xl font-extrabold text-amber-900 dark:text-amber-100">{stats.pendingOrders}</p>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  প্রসেসিং (Processing)
                </div>
                <p className="text-xl font-extrabold text-blue-900 dark:text-blue-100">{stats.processingOrders}</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  ডেলিভার্ড (Delivered)
                </div>
                <p className="text-xl font-extrabold text-emerald-900 dark:text-emerald-100">{stats.deliveredOrders}</p>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  বাতিল / রিফান্ড
                </div>
                <p className="text-xl font-extrabold text-rose-900 dark:text-rose-100">{stats.cancelledOrders}</p>
              </div>
            </div>

            {/* Sales Channel Ratio Bar */}
            <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-600 inline-block" />
                  🌐 অনলাইন সেলস: {formatPrice(stats.onlineRevenue)} ({stats.onlineOrdersCount} টি)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600 inline-block" />
                  🏪 POS কাউন্টার সেলস: {formatPrice(stats.posRevenue)} ({stats.posOrdersCount} টি)
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex shadow-2xs">
                <div
                  style={{ width: `${stats.orders > 0 ? (stats.onlineOrdersCount / stats.orders) * 100 : 50}%` }}
                  className="bg-blue-600 h-full transition-all"
                />
                <div
                  style={{ width: `${stats.orders > 0 ? (stats.posOrdersCount / stats.orders) * 100 : 50}%` }}
                  className="bg-emerald-600 h-full transition-all"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Low Stock / Reorder Watchlist (5 Cols) */}
        <Card className="lg:col-span-5 border shadow-xs bg-card">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base font-bold">স্টক সতর্কতা (Low Stock Alert)</CardTitle>
            </div>
            <Link to="/admin/products">
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary hover:text-primary">
                ইনভেন্টরি <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-foreground">সকল ঔষধের পর্যাপ্ত স্টক রয়েছে</p>
                <p className="text-xs text-muted-foreground">বর্তমানে কোনো ঔষধের স্টক ঘাটতি নেই।</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/admin/products?search=${encodeURIComponent(p.name)}`)}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.generic_name || "N/A"}</p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary">{formatPrice(p.price)}</span>
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-bold ${p.stock <= 5 ? "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/50" : "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50"}`}>
                        স্টক: {p.stock}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Live Table */}
      <Card className="border shadow-xs bg-card overflow-hidden">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-bold">সাম্প্রতিক অর্ডারসমূহ (Recent Orders)</CardTitle>
          </div>
          <Link to="/admin/orders">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1 font-semibold">
              সকল অর্ডার দেখুন <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                <tr>
                  <th className="py-3 px-4">অর্ডার আইডি</th>
                  <th className="py-3 px-4">চ্যানেল</th>
                  <th className="py-3 px-4">কাস্টমার</th>
                  <th className="py-3 px-4">তারিখ</th>
                  <th className="py-3 px-4">মোট টাকা</th>
                  <th className="py-3 px-4">স্ট্যাটাস</th>
                  <th className="py-3 px-4 text-right">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      কোনো সাম্প্রতিক অর্ডার পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        #{String(o.order_number ?? 0).padStart(11, "0")}
                      </td>
                      <td className="py-3 px-4">
                        {o.is_pos_sale ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] px-1.5 py-0 font-medium">
                            🏪 POS সেল
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-[10px] px-1.5 py-0 font-medium">
                            🌐 অনলাইন
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground truncate max-w-[150px]">
                          {o.customer_name || "Walk-in Customer"}
                        </div>
                        {o.customer_phone && (
                          <div className="text-[11px] text-muted-foreground">{o.customer_phone}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("bn-BD")}
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground">
                        {formatPrice(o.total)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`${statusColors[o.status] || "bg-muted text-muted-foreground"} border text-[10px] px-2 py-0.5 capitalize shadow-2xs`}>
                          {o.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link to="/admin/orders">
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary hover:text-primary">
                            <Eye className="h-3.5 w-3.5" /> দেখুন
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Panel */}
      <div className="rounded-2xl border bg-card p-4 sm:p-6 shadow-xs">
        <NotificationPanel role="admin" title="অ্যাডমিন সিস্টেম নোটিফিকেশন" />
      </div>
    </div>
  );
};

export default AdminOverview;
