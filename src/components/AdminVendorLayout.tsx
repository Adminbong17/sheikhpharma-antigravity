import { Outlet, Link, useLocation, useParams } from "react-router-dom";
import { AdminVendorProvider, useVendor } from "@/contexts/VendorContext";
import {
  LayoutDashboard, Package, ShoppingCart, ChevronLeft, ChevronRight, Store, Settings, Download, ArrowLeft, Shield, Tag, Activity, PackageCheck, Star, MessageCircle, ExternalLink, CreditCard, Wallet, Menu,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { title: "Overview", subpath: "", icon: LayoutDashboard },
  { title: "Products", subpath: "products", icon: Package },
  { title: "Orders", subpath: "orders", icon: ShoppingCart },
  { title: "Messages", subpath: "messages", icon: MessageCircle },
  { title: "Reviews", subpath: "reviews", icon: Star },
  { title: "Settings", subpath: "settings", icon: Settings },
  { title: "Grab Product", subpath: "grab-product", icon: Download },
  { title: "Brands", subpath: "brands", icon: Tag },
  { title: "Payment Methods", subpath: "payment-methods", icon: CreditCard },
  { title: "Payouts", subpath: "payouts", icon: Wallet },
  { title: "Activity Log", subpath: "activity-log", icon: Activity },
  { title: "Pre-Orders", subpath: "pre-orders", icon: PackageCheck },
];

const AdminVendorLayoutInner = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const { vendor } = useVendor();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const basePath = `/admin/vendor-dashboard/${vendorId}`;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const mobileTabItems = [
    { title: "Overview", subpath: "", icon: LayoutDashboard },
    { title: "Products", subpath: "products", icon: Package },
    { title: "Orders", subpath: "orders", icon: ShoppingCart },
    { title: "Settings", subpath: "settings", icon: Settings },
  ];

  const isMobileTabActive = (subpath: string) => {
    const itemPath = subpath ? `${basePath}/${subpath}` : basePath;
    if (!subpath) return location.pathname === basePath;
    return location.pathname.startsWith(itemPath);
  };

  const isMoreActive = !mobileTabItems.some(item => isMobileTabActive(item.subpath));

  const sidebarNavContent = (
    <>
      {/* Admin badge */}
      {(!collapsed || isMobile) && (
        <div className="mx-2 mt-2 flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">Admin Mode</span>
        </div>
      )}

      <nav className="flex-1 space-y-1 p-2 mt-1 overflow-y-auto">
        {navItems.map((item) => {
          const itemPath = item.subpath ? `${basePath}/${item.subpath}` : basePath;
          const active = item.subpath
            ? location.pathname.startsWith(itemPath)
            : location.pathname === basePath;
          return (
            <Link
              key={item.subpath}
              to={itemPath}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {(!collapsed || isMobile) && <span>{item.title}</span>}
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
        <Link to="/admin/vendors">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
            <ArrowLeft className="h-5 w-5 shrink-0" />
            {(!collapsed || isMobile) && <span>Back to Admin</span>}
          </Button>
        </Link>
      </div>
    </>
  );

  // Mobile layout with bottom tab bar
  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1 overflow-auto pb-16">
          <Outlet />
        </main>

        {/* Bottom Tab Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t bg-card/95 backdrop-blur-sm">
          {mobileTabItems.map((item) => {
            const active = isMobileTabActive(item.subpath);
            const itemPath = item.subpath ? `${basePath}/${item.subpath}` : basePath;
            return (
              <Link
                key={item.subpath}
                to={itemPath}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", active && "text-primary")} />
                <span>{item.title}</span>
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
              <SheetTitle className="text-base font-bold text-primary">{vendor?.store_name || "Vendor"}</SheetTitle>
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
            <div className="flex items-center gap-2 min-w-0">
              <Store className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-bold text-primary truncate">{vendor?.store_name || "Vendor"}</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="ml-auto shrink-0">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        {sidebarNavContent}
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

const AdminVendorLayout = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  if (!vendorId) return null;

  return (
    <AdminVendorProvider vendorId={vendorId}>
      <AdminVendorLayoutInner />
    </AdminVendorProvider>
  );
};

export default AdminVendorLayout;
