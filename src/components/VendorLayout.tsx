import LogoutConfirm from "@/components/LogoutConfirm";
import PrintPageButton from "@/components/PrintPageButton";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { VendorProvider, useVendor } from "@/contexts/VendorContext";
import {
  LayoutDashboard, Package, ShoppingCart, LogOut, ChevronLeft, ChevronRight, Store, Settings, Download, Tag, Activity, PackageCheck, Star, MessageCircle, ExternalLink, Wallet, CreditCard, FileText, Menu, ScanLine, RotateCcw, BarChart3, Truck, Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { title: "Overview", path: "/vendor", icon: LayoutDashboard },
  { title: "Activity Log", path: "/vendor/activity-log", icon: Activity },
  { title: "Brands", path: "/vendor/brands", icon: Tag },
  { title: "Grab Product", path: "/vendor/grab-product", icon: Download },
  { title: "Invoices", path: "/vendor/invoices", icon: FileText },
  { title: "Messages", path: "/vendor/messages", icon: MessageCircle },
  { title: "Orders", path: "/vendor/orders", icon: ShoppingCart },
  { title: "POS Register", path: "/vendor/pos", icon: ScanLine },
  { title: "POS Sessions", path: "/vendor/pos/sessions", icon: Activity },
  { title: "Sales Returns", path: "/vendor/pos/returns", icon: RotateCcw },
  { title: "Stock Transfers", path: "/vendor/pos/transfers", icon: Truck },
  { title: "POS Reports", path: "/vendor/pos/reports", icon: BarChart3 },
  { title: "Staff Commissions", path: "/vendor/pos/commissions", icon: Users },
  { title: "Payment Methods", path: "/vendor/payment-methods", icon: CreditCard },
  { title: "Payouts", path: "/vendor/payouts", icon: Wallet },
  { title: "Pre-Orders", path: "/vendor/pre-orders", icon: PackageCheck },
  { title: "Products", path: "/vendor/products", icon: Package },
  { title: "Reviews", path: "/vendor/reviews", icon: Star },
  { title: "Settings", path: "/vendor/settings", icon: Settings },
];

const VendorLayout = () => {
  const { signOut } = useAuth();
  const { vendorId } = useVendor();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState<{ messages?: number; orders?: number; reviews?: number; notifications?: number }>({});

  useEffect(() => {
    if (!vendorId) return;
    const fetchBadges = async () => {
      const [msgs, orders, reviews, notifs] = await Promise.all([
        supabase.from("messages").select("id", { count: "exact", head: true })
          .eq("vendor_id", vendorId).eq("is_read", false).is("parent_id", null),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("product_reviews").select("id", { count: "exact", head: true })
          .is("vendor_reply", null)
          .in("product_id", (await supabase.from("products").select("id").eq("vendor_id", vendorId)).data?.map(p => p.id) || []),
        (supabase.from("notifications" as any) as any)
          .select("id", { count: "exact", head: true })
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .eq("target_role", "vendor")
          .eq("is_read", false),
      ]);
      setBadges({
        messages: msgs.count || 0,
        orders: orders.count || 0,
        reviews: reviews.count || 0,
        notifications: notifs.count || 0,
      });
    };
    fetchBadges();
  }, [vendorId, location.pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const mobileTabItems = [
    { title: "Overview", path: "/vendor", icon: LayoutDashboard },
    { title: "Products", path: "/vendor/products", icon: Package },
    { title: "Orders", path: "/vendor/orders", icon: ShoppingCart },
    { title: "Messages", path: "/vendor/messages", icon: MessageCircle },
  ];

  const isMobileTabActive = (path: string) => {
    if (path === "/vendor") return location.pathname === "/vendor";
    return location.pathname.startsWith(path);
  };

  const isMoreActive = !mobileTabItems.some(item => isMobileTabActive(item.path));

  const getNavBadge = (path: string) => {
    if (path === "/vendor") return badges.notifications;
    if (path === "/vendor/messages") return badges.messages;
    if (path === "/vendor/orders") return badges.orders;
    if (path === "/vendor/reviews") return badges.reviews;
    return 0;
  };

  const sidebarNavContent = (
    <>
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navItems.map((item, index) => {
          const active = location.pathname === item.path;
          const badge = getNavBadge(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {!collapsed && !isMobile && (
                <span className="w-5 text-xs text-center shrink-0 opacity-60">{String(index + 1).padStart(2, '0')}</span>
              )}
              <item.icon className="h-5 w-5 shrink-0" />
              {(!collapsed || isMobile) && <span className="flex-1">{item.title}</span>}
              {!!badge && badge > 0 && (
                <Badge className="text-[10px] px-1.5 h-4 bg-destructive text-destructive-foreground">
                  {badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2 shrink-0">
        {vendorId && (
          <Link to={`/store/${vendorId}`} target="_blank">
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
              <ExternalLink className="h-5 w-5 shrink-0" />
              {(!collapsed || isMobile) && <span>Go to Website</span>}
            </Button>
          </Link>
        )}
        <LogoutConfirm>
          {(ask) => (
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive" onClick={ask}>
              <LogOut className="h-5 w-5 shrink-0" />
              {(!collapsed || isMobile) && <span>Sign Out</span>}
            </Button>
          )}
        </LogoutConfirm>

        <Link to="/">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
            <Store className="h-5 w-5 shrink-0" />
            {(!collapsed || isMobile) && <span>Back to Store</span>}
          </Button>
        </Link>
      </div>
    </>
  );

  // Mobile layout with bottom tab bar
  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="print-area flex-1 overflow-auto pb-16 animate-fade-in-up">
          <Outlet />
        </main>
        <PrintPageButton />

        {/* Bottom Tab Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t bg-card/95 backdrop-blur-sm">
          {mobileTabItems.map((item) => {
            const active = isMobileTabActive(item.path);
            const badge = getNavBadge(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", active && "text-primary")} />
                <span>{item.title}</span>
                {!!badge && badge > 0 && (
                  <Badge className="absolute top-0.5 right-1/4 text-[8px] px-1 h-3.5 bg-destructive text-destructive-foreground">
                    {badge}
                  </Badge>
                )}
              </Link>
            );
          })}
          <button
            onClick={() => setMobileOpen(true)}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors",
              isMoreActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Menu className="h-5 w-5" />
            <span>More</span>
          </button>
        </nav>

        {/* More drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl p-0 flex flex-col">
            <SheetHeader className="h-12 flex-row items-center gap-2 border-b px-4 space-y-0">
              <Store className="h-4 w-4 text-primary" />
              <SheetTitle className="text-base font-bold text-primary">Vendor Menu</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              {sidebarNavContent}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 flex h-screen flex-col border-r bg-card transition-all duration-200",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          {!collapsed && (
            <Link to="/vendor" className="flex items-center gap-2 text-lg font-bold text-primary">
              <Store className="h-5 w-5" /> Vendor
            </Link>
          )}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="ml-auto">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        {sidebarNavContent}
      </aside>

      <main className="print-area flex-1 overflow-auto animate-fade-in-up">
        <Outlet />
      </main>
      <PrintPageButton />
    </div>
  );
};

const VendorLayoutWithProvider = () => (
  <VendorProvider>
    <VendorLayout />
  </VendorProvider>
);

export default VendorLayoutWithProvider;
