import LogoutConfirm from "@/components/LogoutConfirm";
import PrintPageButton from "@/components/PrintPageButton";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ChevronLeft, ChevronRight, ChevronDown, Store, Menu, X, ExternalLink, Bell, ScanLine, Sparkles, Search, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [navSearch, setNavSearch] = useState("");

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

  const GROUP_THEMES: Record<string, {
    nameBn: string;
    iconBg: string;
    iconColor: string;
    activeTrigger: string;
    borderLeft: string;
    activeItem: string;
    hoverItem: string;
    countBadge: string;
    tagBg: string;
  }> = {
    "Dashboard": {
      nameBn: "ড্যাশবোর্ড",
      iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300/50",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      activeTrigger: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 font-bold",
      borderLeft: "border-emerald-400/80",
      activeItem: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-xs",
      hoverItem: "hover:bg-emerald-50/80 hover:text-emerald-800 dark:hover:bg-emerald-950/40",
      countBadge: "bg-emerald-100/80 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
      tagBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/40",
    },
    "Catalog": {
      nameBn: "ওষুধ ও ক্যাটালগ",
      iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-300/50",
      iconColor: "text-sky-600 dark:text-sky-400",
      activeTrigger: "bg-sky-500/10 text-sky-800 dark:text-sky-200 font-bold",
      borderLeft: "border-sky-400/80",
      activeItem: "bg-gradient-to-r from-sky-600 to-blue-600 text-white font-semibold shadow-xs",
      hoverItem: "hover:bg-sky-50/80 hover:text-sky-800 dark:hover:bg-sky-950/40",
      countBadge: "bg-sky-100/80 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300",
      tagBg: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300/40",
    },
    "Orders & Sales": {
      nameBn: "অর্ডার ও সেলস",
      iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-300/50",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      activeTrigger: "bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 font-bold",
      borderLeft: "border-indigo-400/80",
      activeItem: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-xs",
      hoverItem: "hover:bg-indigo-50/80 hover:text-indigo-800 dark:hover:bg-indigo-950/40",
      countBadge: "bg-indigo-100/80 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300",
      tagBg: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-300/40",
    },
    "Lab Test": {
      nameBn: "ল্যাব ও টেস্ট",
      iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-300/50",
      iconColor: "text-rose-600 dark:text-rose-400",
      activeTrigger: "bg-rose-500/10 text-rose-800 dark:text-rose-200 font-bold",
      borderLeft: "border-rose-400/80",
      activeItem: "bg-gradient-to-r from-rose-600 to-pink-600 text-white font-semibold shadow-xs",
      hoverItem: "hover:bg-rose-50/80 hover:text-rose-800 dark:hover:bg-rose-950/40",
      countBadge: "bg-rose-100/80 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300",
      tagBg: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300/40",
    },
    "Finance": {
      nameBn: "হিসাব ও অর্থায়ন",
      iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300/50",
      iconColor: "text-amber-600 dark:text-amber-400",
      activeTrigger: "bg-amber-500/10 text-amber-800 dark:text-amber-200 font-bold",
      borderLeft: "border-amber-400/80",
      activeItem: "bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold shadow-xs",
      hoverItem: "hover:bg-amber-50/80 hover:text-amber-800 dark:hover:bg-amber-950/40",
      countBadge: "bg-amber-100/80 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
      tagBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/40",
    },
    "Vendors": {
      nameBn: "ভেন্ডর ও পার্টনার",
      iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-300/50",
      iconColor: "text-purple-600 dark:text-purple-400",
      activeTrigger: "bg-purple-500/10 text-purple-800 dark:text-purple-200 font-bold",
      borderLeft: "border-purple-400/80",
      activeItem: "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold shadow-xs",
      hoverItem: "hover:bg-purple-50/80 hover:text-purple-800 dark:hover:bg-purple-950/40",
      countBadge: "bg-purple-100/80 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300",
      tagBg: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/40",
    },
    "Users & Staff": {
      nameBn: "গ্রাহক ও কর্মী",
      iconBg: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-300/50",
      iconColor: "text-teal-600 dark:text-teal-400",
      activeTrigger: "bg-teal-500/10 text-teal-800 dark:text-teal-200 font-bold",
      borderLeft: "border-teal-400/80",
      activeItem: "bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow-xs",
      hoverItem: "hover:bg-teal-50/80 hover:text-teal-800 dark:hover:bg-teal-950/40",
      countBadge: "bg-teal-100/80 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300",
      tagBg: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-300/40",
    },
    "Marketing": {
      nameBn: "মার্কেটিং ও অফার",
      iconBg: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-300/50",
      iconColor: "text-orange-600 dark:text-orange-400",
      activeTrigger: "bg-orange-500/10 text-orange-800 dark:text-orange-200 font-bold",
      borderLeft: "border-orange-400/80",
      activeItem: "bg-gradient-to-r from-orange-600 to-rose-600 text-white font-semibold shadow-xs",
      hoverItem: "hover:bg-orange-50/80 hover:text-orange-800 dark:hover:bg-orange-950/40",
      countBadge: "bg-orange-100/80 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300",
      tagBg: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-300/40",
    },
    "Support": {
      nameBn: "সাপোর্ট",
      iconBg: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-300/50",
      iconColor: "text-violet-600 dark:text-violet-400",
      activeTrigger: "bg-violet-500/10 text-violet-800 dark:text-violet-200 font-bold",
      borderLeft: "border-violet-400/80",
      activeItem: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold shadow-xs",
      hoverItem: "hover:bg-violet-50/80 hover:text-violet-800 dark:hover:bg-violet-950/40",
      countBadge: "bg-violet-100/80 text-violet-800 border-violet-300 dark:bg-violet-950 dark:text-violet-300",
      tagBg: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-300/40",
    },
    "Settings": {
      nameBn: "সেটিংস",
      iconBg: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300/50",
      iconColor: "text-slate-700 dark:text-slate-300",
      activeTrigger: "bg-slate-500/10 text-slate-800 dark:text-slate-200 font-bold",
      borderLeft: "border-slate-400/80",
      activeItem: "bg-gradient-to-r from-slate-700 to-zinc-800 text-white font-semibold shadow-xs",
      hoverItem: "hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800/60",
      countBadge: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
      tagBg: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/40",
    },
  };

  const currentGroup = filteredNavGroups.find(g => g.items.some(i => i.path === location.pathname));
  const currentItem = currentGroup?.items.find(i => i.path === location.pathname);

  // Search filter across all groups and items
  const allSearchableItems = filteredNavGroups.flatMap(group => 
    group.items.map(item => ({
      ...item,
      groupLabel: group.label,
      theme: GROUP_THEMES[group.label] || GROUP_THEMES["Settings"],
    }))
  );

  const searchResults = navSearch.trim() === "" ? [] : allSearchableItems.filter(item => {
    const q = navSearch.toLowerCase();
    return item.title.toLowerCase().includes(q) ||
           item.path.toLowerCase().includes(q) ||
           item.groupLabel.toLowerCase().includes(q) ||
           (item.theme?.nameBn && item.theme.nameBn.includes(q));
  });

  const sidebarContent = (
    <>
      {/* Quick Search Filter */}
      {(!collapsed || isMobile) && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
            <Input
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="অপশন খুঁজুন (Search 45+ options)..."
              className="h-8 pl-8 pr-7 text-xs bg-muted/40 border-border/70 focus-visible:bg-background rounded-lg placeholder:text-muted-foreground/60 transition-colors"
            />
            {navSearch && (
              <button
                onClick={() => setNavSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 custom-scrollbar">
        {navSearch.trim() !== "" ? (
          /* Search Results Display */
          <div className="space-y-1 py-1">
            <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-muted-foreground border-b border-border/40 pb-1.5 mb-1.5">
              <span>অনুসন্ধান ফলাফল</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{searchResults.length} পাওয়া গেছে</Badge>
            </div>
            {searchResults.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                <p>"{navSearch}" নামে কোনো অপশন নেই</p>
                <Button variant="link" size="sm" onClick={() => setNavSearch("")} className="text-xs mt-1 text-primary">
                  সবগুলো দেখুন
                </Button>
              </div>
            ) : (
              searchResults.map((item) => {
                const active = location.pathname === item.path;
                const badge = getBadge(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => { setNavSearch(""); if (isMobile) setMobileOpen(false); }}
                    className={cn(
                      "group/item flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all",
                      active
                        ? cn(item.theme.activeItem, "shadow-xs")
                        : cn("text-foreground hover:translate-x-0.5", item.theme.hoverItem)
                    )}
                  >
                    <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs shadow-2xs", item.theme.iconBg)}>
                      <item.icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold">{item.title}</p>
                      <p className="text-[10px] opacity-75 truncate">{item.groupLabel} ({item.theme.nameBn})</p>
                    </div>
                    {!!badge && badge > 0 && (
                      <Badge className={cn("text-[10px] px-1.5 h-4", active ? "bg-white text-primary" : "bg-destructive text-destructive-foreground")}>
                        {badge}
                      </Badge>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        ) : (
          /* Normal Group List with Rich Themes */
          filteredNavGroups.map((group) => {
            const isOpen = openGroups.has(group.label);
            const hasActiveItem = group.items.some((item) => location.pathname === item.path);
            const theme = GROUP_THEMES[group.label] || GROUP_THEMES["Settings"];

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
                        title={`${group.label}: ${item.title}`}
                        className={cn(
                          "relative flex h-9 w-9 items-center justify-center rounded-lg transition-all",
                          active
                            ? cn(theme.activeItem, "shadow-sm")
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                        )}
                      >
                        <item.icon className={cn("h-4 w-4", !active && theme.iconColor)} />
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
                  "group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold tracking-wide transition-all select-none",
                  hasActiveItem
                    ? theme.activeTrigger
                    : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                )}>
                  <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs shadow-2xs transition-transform group-hover:scale-105", theme.iconBg)}>
                    <group.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs tracking-tight truncate">{group.label}</span>
                      <span className="text-[10px] text-muted-foreground font-normal hidden xl:inline truncate">
                        • {theme.nameBn}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 font-mono shrink-0", theme.countBadge)}>
                    {group.items.length}
                  </Badge>
                  <ChevronDown className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform duration-200 text-muted-foreground",
                    isOpen ? "rotate-0" : "-rotate-90"
                  )} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className={cn("ml-3.5 border-l-2 pl-2 space-y-0.5 mt-1 transition-colors", theme.borderLeft)}>
                    {group.items.map((item) => {
                      const active = location.pathname === item.path;
                      const badge = getBadge(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "group/item flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                            active
                              ? cn(theme.activeItem, "shadow-xs")
                              : cn("text-muted-foreground hover:translate-x-0.5", theme.hoverItem)
                          )}
                        >
                          <item.icon className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-transform group-hover/item:scale-110",
                            active ? "text-white" : cn(theme.iconColor, "opacity-75 group-hover/item:opacity-100")
                          )} />
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
          })
        )}
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
        <header className="no-print h-14 border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground truncate">
              <Link to="/admin" className="font-semibold text-foreground flex items-center gap-1.5 hover:text-primary transition-colors">
                <Store className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">Sheikh Pharma</span>
              </Link>
              <span>/</span>
              {currentGroup && (
                <span className={cn("px-2 py-0.5 rounded-md border text-[11px] font-semibold truncate", GROUP_THEMES[currentGroup.label]?.tagBg || "bg-muted text-foreground")}>
                  {currentGroup.label}
                </span>
              )}
              {currentItem && (
                <>
                  <span>/</span>
                  <span className="text-foreground font-semibold truncate">{currentItem.title}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>মডেল ফার্মেসি লাইভ</span>
            </div>
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
