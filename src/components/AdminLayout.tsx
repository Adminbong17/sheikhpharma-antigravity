import LogoutConfirm from "@/components/LogoutConfirm";
import PrintPageButton from "@/components/PrintPageButton";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ChevronLeft, ChevronRight, ChevronDown, Store, Menu, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { adminNavGroups, ADMIN_NAV_COUNT } from "@/config/adminNav";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type NavBadges = {
  orders?: number;
  support?: number;
  notifications?: number;
};

const AdminLayout = () => {
  const { signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { data: siteSettings } = useSiteSettings();
  const isMultivendor = siteSettings?.is_multivendor ?? false;
  const filteredNavGroups = isMultivendor ? adminNavGroups : adminNavGroups.filter(g => g.label !== "Vendors");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState<NavBadges>({});

  // Track which groups are open - default open the group containing current path
  const getDefaultOpen = () => {
    const openSet = new Set<string>();
    adminNavGroups.forEach((group) => {
      if (group.items.some((item) => location.pathname === item.path)) {
        openSet.add(group.label);
      }
    });
    // Always open Dashboard
    openSet.add("Dashboard");
    return openSet;
  };

  const [openGroups, setOpenGroups] = useState<Set<string>>(getDefaultOpen);

  // Update open groups when route changes
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      adminNavGroups.forEach((group) => {
        if (group.items.some((item) => location.pathname === item.path)) {
          next.add(group.label);
        }
      });
      return next;
    });
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const fetchBadges = useCallback(async () => {
    const [notif, orders, support] = await Promise.all([
      (supabase.from("notifications" as any) as any)
        .select("id", { count: "exact", head: true })
        .eq("target_role", "admin")
        .eq("is_read", false),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      (supabase.from("support_tickets" as any) as any).select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);
    setBadges({
      notifications: notif.count || 0,
      orders: orders.count || 0,
      support: support.count || 0,
    });
  }, []);

  useEffect(() => {
    fetchBadges();

    const notifChannel = supabase
      .channel("admin-notif-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, fetchBadges)
      .subscribe();

    const ordersChannel = supabase
      .channel("admin-orders-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchBadges)
      .subscribe();

    const supportChannel = supabase
      .channel("admin-support-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, fetchBadges)
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(supportChannel);
    };
  }, [fetchBadges]);

  const getBadge = (path: string) => {
    if (path === "/admin") return badges.notifications;
    if (path === "/admin/orders") return badges.orders;
    if (path === "/admin/support-tickets") return badges.support;
    return 0;
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const sidebarContent = (
    <>
      <nav className="flex-1 overflow-y-auto p-2 pb-6">
        {filteredNavGroups.map((group) => {
          const isOpen = openGroups.has(group.label);
          const hasActiveItem = group.items.some((item) => location.pathname === item.path);

          if (collapsed && !isMobile) {
            return (
              <div key={group.label} className="mb-1">
                {group.items.map((item) => {
                  const active = location.pathname === item.path;
                  const badge = getBadge(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={item.title}
                      className={cn(
                        "relative flex items-center justify-center rounded-md p-2 transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {!!badge && badge > 0 && !active && (
                        <Badge className="absolute -top-1 -right-1 text-[9px] px-1 h-4 bg-destructive text-destructive-foreground">
                          {badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          }

          return (
            <Collapsible
              key={group.label}
              open={isOpen}
              onOpenChange={() => toggleGroup(group.label)}
              className="mb-1"
            >
              <CollapsibleTrigger className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                hasActiveItem
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}>
                <group.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                  isOpen ? "rotate-0" : "-rotate-90"
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-3 border-l border-border pl-2 space-y-0.5 mt-0.5">
                  {group.items.map((item) => {
                    const active = location.pathname === item.path;
                    const badge = getBadge(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {!!badge && badge > 0 && !active && (
                          <Badge className="text-[10px] px-1.5 h-4 bg-destructive text-destructive-foreground">
                            {badge}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>

      <div className="border-t p-2 shrink-0">
        {(!collapsed || isMobile) && (
          <p className="text-[10px] text-muted-foreground text-center mb-1">Menu: {ADMIN_NAV_COUNT} items</p>
        )}
        <LogoutConfirm>
          {(ask) => (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={ask}
            >
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

  // Mobile tab bar items
  const mobileTabItems = [
    { title: "Overview", path: "/admin", icon: adminNavGroups[0]?.items[0]?.icon || Store },
    { title: "Orders", path: "/admin/orders", icon: adminNavGroups.flatMap(g => g.items).find(i => i.path === "/admin/orders")?.icon || Store },
    { title: "Products", path: "/admin/products", icon: adminNavGroups.flatMap(g => g.items).find(i => i.path === "/admin/products")?.icon || Store },
    { title: "Users", path: "/admin/users", icon: adminNavGroups.flatMap(g => g.items).find(i => i.path === "/admin/users")?.icon || Store },
  ];

  const isMobileTabActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  const isMoreActive = !mobileTabItems.some(item => isMobileTabActive(item.path));

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {/* Content */}
        <main className="print-area flex-1 overflow-auto pb-16 animate-fade-in-up">
          <Outlet />
        </main>
        <PrintPageButton />

        {/* Bottom Tab Bar */}
        <nav className="no-print fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t bg-card/95 backdrop-blur-sm">
          {mobileTabItems.map((item) => {
            const active = isMobileTabActive(item.path);
            const badge = getBadge(item.path);
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
          {/* More button */}
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
              <SheetTitle className="text-base font-bold text-primary">Admin Menu</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              {sidebarContent}
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
          "no-print sticky top-0 flex h-screen flex-col border-r border-border bg-card shadow-soft transition-all duration-200",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4 shrink-0">
          {!collapsed && (
            <Link to="/admin" className="flex items-center gap-2 text-lg font-bold text-primary">
              <Store className="h-5 w-5" /> Admin
            </Link>
          )}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="ml-auto">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        {sidebarContent}
      </aside>

      <main className="print-area flex-1 overflow-auto animate-fade-in-up">
        <Outlet />
      </main>
      <PrintPageButton />
    </div>
  );
};

export default AdminLayout;
