import LogoutConfirm from "@/components/LogoutConfirm";
import PrintPageButton from "@/components/PrintPageButton";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ChevronLeft, ChevronRight, ChevronDown, Store, Menu, X, ExternalLink, Bell, ScanLine, Sparkles } from "lucide-react";
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

  const GROUP_COLORS: Record<string, { iconBg: string; iconColor: string }> = {
    "Dashboard": { iconBg: "bg-emerald-500/10 text-emerald-600 border-emerald-300/60 dark:text-emerald-400", iconColor: "text-emerald-600 dark:text-emerald-400" },
    "Catalog": { iconBg: "bg-blue-500/10 text-blue-600 border-blue-300/60 dark:text-blue-400", iconColor: "text-blue-600 dark:text-blue-400" },
    "Orders & Sales": { iconBg: "bg-indigo-500/10 text-indigo-600 border-indigo-300/60 dark:text-indigo-400", iconColor: "text-indigo-600 dark:text-indigo-400" },
    "Lab Test": { iconBg: "bg-rose-500/10 text-rose-600 border-rose-300/60 dark:text-rose-400", iconColor: "text-rose-600 dark:text-rose-400" },
    "Finance": { iconBg: "bg-amber-500/10 text-amber-600 border-amber-300/60 dark:text-amber-400", iconColor: "text-amber-600 dark:text-amber-400" },
    "Vendors": { iconBg: "bg-purple-500/10 text-purple-600 border-purple-300/60 dark:text-purple-400", iconColor: "text-purple-600 dark:text-purple-400" },
    "Users & Staff": { iconBg: "bg-cyan-500/10 text-cyan-600 border-cyan-300/60 dark:text-cyan-400", iconColor: "text-cyan-600 dark:text-cyan-400" },
    "Marketing": { iconBg: "bg-orange-500/10 text-orange-600 border-orange-300/60 dark:text-orange-400", iconColor: "text-orange-600 dark:text-orange-400" },
    "Support": { iconBg: "bg-violet-500/10 text-violet-600 border-violet-300/60 dark:text-violet-400", iconColor: "text-violet-600 dark:text-violet-400" },
    "Settings": { iconBg: "bg-slate-500/10 text-slate-700 border-slate-300/60 dark:text-slate-300", iconColor: "text-slate-700 dark:text-slate-300" },
  };

  const currentGroup = filteredNavGroups.find(g => g.items.some(i => i.path === location.pathname));
  const currentItem = currentGroup?.items.find(i => i.path === location.pathname);

  const sidebarContent = (
    <>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {filteredNavGroups.map((group) => {
          const isOpen = openGroups.has(group.label);
          const hasActiveItem = group.items.some((item) => location.pathname === item.path);
          const color = GROUP_COLORS[group.label] || { iconBg: "bg-muted text-foreground", iconColor: "text-foreground" };

          if (collapsed && !isMobile) {
            return (
              <div key={group.label} className="mb-2 flex flex-col items-center gap-1">
                {group.items.map((item) => {
                  const active = location.pathname === item.path;
                  const badge = getBadge(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={item.title}
                      className={cn(
                        "relative flex h-9 w-9 items-center justify-center rounded-lg transition-all",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : cn("text-muted-foreground hover:text-foreground hover:bg-muted/80")
                      )}
                    >
                      <item.icon className="h-4 w-4" />
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
                "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all",
                hasActiveItem
                  ? "bg-primary/5 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}>
                <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs shadow-2xs transition-transform group-hover:scale-105", color.iconBg)}>
                  <group.icon className="h-3.5 w-3.5" />
                </div>
                <span className="flex-1 text-left font-medium tracking-normal text-xs">{group.label}</span>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-transform duration-200 text-muted-foreground",
                  isOpen ? "rotate-0" : "-rotate-90"
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-3 border-l-2 border-border/60 pl-2 space-y-0.5 mt-1">
                  {group.items.map((item) => {
                    const active = location.pathname === item.path;
                    const badge = getBadge(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          "group/item flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-all",
                          active
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:translate-x-0.5"
                        )}
                      >
                        <item.icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover/item:scale-110", active ? "text-primary-foreground" : "text-muted-foreground")} />
                        <span className="flex-1 truncate">{item.title}</span>
                        {!!badge && badge > 0 && (
                          <Badge className={cn("text-[10px] px-1.5 h-4", active ? "bg-white text-primary" : "bg-destructive text-destructive-foreground")}>
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

      <div className="border-t p-2 shrink-0 bg-card/60 backdrop-blur-xs space-y-1">
        {(!collapsed || isMobile) && (
          <div className="flex items-center justify-between px-2 text-[10px] text-muted-foreground mb-1">
            <span>Control Panel</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0">{ADMIN_NAV_COUNT} Items</Badge>
          </div>
        )}
        <LogoutConfirm>
          {(ask) => (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs"
              onClick={ask}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {(!collapsed || isMobile) && <span>Sign Out</span>}
            </Button>
          )}
        </LogoutConfirm>

        <Link to="/">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 text-xs">
            <Store className="h-4 w-4 shrink-0" />
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
        {/* Mobile Top Bar */}
        <header className="no-print h-12 border-b border-border bg-card/95 backdrop-blur-md px-3 flex items-center justify-between shrink-0 sticky top-0 z-40 shadow-2xs">
          <Link to="/admin" className="flex items-center gap-2 text-sm font-bold text-primary">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Store className="h-4 w-4" />
            </div>
            <span className="font-extrabold bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">Sheikh Pharma</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <Link to="/admin/pos">
              <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-300">
                <ScanLine className="h-3 w-3 text-emerald-600" />
                POS
              </Button>
            </Link>
            <Link to="/">
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-muted-foreground">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Content with generous pb-28 so mobile navbar never cuts off page bottom */}
        <main className="print-area flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden pb-28 pt-1 animate-fade-in-up">
          <Outlet />
        </main>
        <PrintPageButton />

        {/* Bottom Tab Bar */}
        <nav className="no-print fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t bg-card/95 backdrop-blur-md shadow-lg">
          {mobileTabItems.map((item) => {
            const active = isMobileTabActive(item.path);
            const badge = getBadge(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors",
                  active ? "text-primary font-bold" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 transition-transform", active && "text-primary scale-110")} />
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
              isMoreActive ? "text-primary font-bold" : "text-muted-foreground"
            )}
          >
            <Menu className="h-5 w-5" />
            <span>More</span>
          </button>
        </nav>

        {/* More drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl p-0 flex flex-col">
            <SheetHeader className="h-12 flex-row items-center gap-2 border-b px-4 space-y-0 shrink-0">
              <Store className="h-4 w-4 text-primary" />
              <SheetTitle className="text-base font-bold text-primary">All Admin Sections</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              {sidebarContent}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop layout with Top Header & min-w-0 to prevent margin clipping
  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "no-print sticky top-0 flex h-screen flex-col border-r border-border bg-card shadow-soft transition-all duration-200 shrink-0 z-30",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-3.5 shrink-0 bg-card">
          {!collapsed && (
            <Link to="/admin" className="flex items-center gap-2 text-base font-bold tracking-tight">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-2xs">
                <Store className="h-4 w-4" />
              </div>
              <span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent font-extrabold text-sm">Sheikh Pharma</span>
            </Link>
          )}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="ml-auto h-8 w-8 text-muted-foreground hover:text-foreground">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        {sidebarContent}
      </aside>

      {/* Main Content Area with Header */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        {/* Top Navbar Header */}
        <header className="no-print h-14 border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground truncate">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Store className="h-4 w-4 text-primary" />
                Sheikh Pharma
              </span>
              <span>/</span>
              <span className="font-medium text-foreground truncate">
                {currentGroup?.label || "Admin"}
              </span>
              {currentItem && (
                <>
                  <span>/</span>
                  <span className="text-primary font-semibold truncate">{currentItem.title}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/admin/pos">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 shadow-xs">
                <ScanLine className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">POS কাউন্টার</span>
              </Button>
            </Link>
            <Link to="/" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden md:inline">View Store</span>
              </Button>
            </Link>
            <Link to="/admin">
              <Button size="icon" variant="ghost" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
                <Bell className="h-4 w-4" />
                {!!badges.notifications && badges.notifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </header>

        {/* Content Container - with min-w-0 w-full to guarantee margins and no clipping */}
        <main className="print-area flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden bg-slate-50/60 dark:bg-background/80 animate-fade-in-up">
          <Outlet />
        </main>
      </div>

      <PrintPageButton />
    </div>
  );
};

export default AdminLayout;
