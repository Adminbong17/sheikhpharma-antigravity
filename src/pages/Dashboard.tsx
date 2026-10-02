import LogoutConfirm from "@/components/LogoutConfirm";
import PrintPageButton from "@/components/PrintPageButton";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  User, LogOut, Settings, CreditCard, Truck, PackageCheck,
  MessageSquare, RotateCcw, ChevronRight, Heart, Store, Ticket, Headphones, Inbox, Wallet, FlaskConical,
} from "lucide-react";
import NotificationPanel from "@/components/NotificationPanel";

const orderStatuses = [
  { key: "pending", slug: "unpaid", label: "Unpaid", icon: CreditCard },
  { key: "processing", slug: "to-ship", label: "To Ship", icon: Truck },
  { key: "shipped", slug: "to-receive", label: "To Receive", icon: PackageCheck },
  { key: "delivered", slug: "review", label: "Review", icon: MessageSquare },
  { key: "cancelled", slug: "return-cancel", label: "Return &\nCancel", icon: RotateCcw },
];

const Dashboard = () => {
  const { user, isVendor, signOut } = useAuth();
  const { formatPrice } = useCurrency();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: inboxUnread = 0 } = useQuery({
    queryKey: ["inbox-unread", user?.id],
    queryFn: async () => {
      // Count vendor replies (messages where sender is NOT the user) that are unread
      const { data: threads } = await supabase
        .from("messages")
        .select("id")
        .eq("sender_id", user!.id)
        .is("parent_id", null);
      if (!threads?.length) return 0;
      const threadIds = threads.map(t => t.id);
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("parent_id", threadIds)
        .eq("is_read", false)
        .neq("sender_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: supportUnread = 0 } = useQuery({
    queryKey: ["support-unread", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("status", "open");
      return count || 0;
    },
    enabled: !!user,
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

  const displayName = profile?.username || user?.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />

      {/* Profile Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20 text-2xl font-bold text-primary-foreground ring-2 ring-primary-foreground/30">
              {displayName.charAt(0).toUpperCase()}
            </div>

            {/* Name + stats */}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold text-primary-foreground">
                {displayName}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-primary-foreground/80">
                <Link to="/dashboard/wishlist" className="flex items-center gap-1 hover:text-primary-foreground transition-colors">
                  <Heart className="h-3 w-3" />
                  <span>0 Wishlist</span>
                </Link>
                <span className="text-primary-foreground/40">•</span>
                <Link to="/dashboard/followed" className="flex items-center gap-1 hover:text-primary-foreground transition-colors">
                  <Store className="h-3 w-3" />
                  <span>0 Followed</span>
                </Link>
                <span className="text-primary-foreground/40">•</span>
                <Link to="/dashboard/vouchers" className="flex items-center gap-1 hover:text-primary-foreground transition-colors">
                  <Ticket className="h-3 w-3" />
                  <span>0 Vouchers</span>
                </Link>
              </div>
            </div>

            {/* Settings icon */}
            <Link to="/dashboard/settings">
              <Button variant="ghost" size="icon" className="shrink-0 text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* My Orders Section */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-base font-bold">My Orders</h2>
            <Link to="/dashboard/orders" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
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
                    to={`/dashboard/orders/${s.slug}`}
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

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          {isVendor && (
            <Link to="/vendor" className="col-span-2">
              <Card className="cursor-pointer border-primary/20 bg-primary/5 transition-colors hover:bg-primary/10">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Store className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Vendor Panel</p>
                    <p className="text-xs text-muted-foreground">Manage your store</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          )}
          {!isVendor && (
            <Link to="/vendor/apply" className="col-span-2">
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                    <Store className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Become a Seller</p>
                    <p className="text-xs text-muted-foreground">Open your store and earn</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {/* Recent Orders */}
        <Card>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-base font-bold">Recent Orders</h2>
          </div>
          <CardContent>
            {orders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <PackageCheck className="h-10 w-10 opacity-30" />
                <p className="text-sm">You have no orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          #{order.id.slice(0, 8)}
                        </span>
                        <Badge variant="secondary" className={statusBadgeColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="text-sm font-bold ml-2 shrink-0">{formatPrice(order.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardContent className="p-2">
            <Link to="/dashboard/settings" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium">Profile Settings</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/dashboard/inbox" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-muted">
              <Inbox className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium">Seller Messages</span>
              {inboxUnread > 0 && <Badge className="h-4 px-1.5 text-[10px] bg-destructive text-destructive-foreground">{inboxUnread}</Badge>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/dashboard/wishlist" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-muted">
              <Heart className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium">My Wishlist</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/dashboard/vouchers" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-muted">
              <Ticket className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium">My Vouchers</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/dashboard/followed" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-muted">
              <Store className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium">Followed Stores</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/dashboard/lab-tests" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-muted">
              <FlaskConical className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium">My Lab Tests</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/dashboard/credits" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-muted">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium">My Credits & Refunds</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/dashboard/support" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-muted">
              <Headphones className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium">Support Tickets</span>
              {supportUnread > 0 && <Badge className="h-4 px-1.5 text-[10px] bg-destructive text-destructive-foreground">{supportUnread}</Badge>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <LogoutConfirm>
              {(ask) => (
                <button
                  onClick={ask}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-destructive transition-colors hover:bg-destructive/5"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="flex-1 text-left font-medium">Log Out</span>
                </button>
              )}
            </LogoutConfirm>

          </CardContent>
        </Card>
        {/* Customer Notifications */}
        <NotificationPanel role="user" title="আমার নোটিফিকেশন" />
      </div>
      <PrintPageButton />
    </div>
  );
};

export default Dashboard;
