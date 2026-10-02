import { Outlet, Link, useLocation, useParams } from "react-router-dom";
import { AdminCustomerProvider, useCustomer } from "@/contexts/CustomerContext";
import {
  LayoutDashboard, ShoppingCart, Heart, Store, Settings, ArrowLeft, Shield, User, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Overview", subpath: "", icon: LayoutDashboard },
  { title: "Orders", subpath: "orders", icon: ShoppingCart },
  { title: "Wishlist", subpath: "wishlist", icon: Heart },
  { title: "Followed Stores", subpath: "followed", icon: Store },
  { title: "Profile Settings", subpath: "settings", icon: Settings },
];

const AdminCustomerLayoutInner = () => {
  const { userId } = useParams<{ userId: string }>();
  const { customer } = useCustomer();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const basePath = `/admin/customer-dashboard/${userId}`;

  const displayName = customer?.username || customer?.email?.split("@")[0] || "Customer";

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
              <User className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-bold text-primary truncate">{displayName}</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="ml-auto shrink-0">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {!collapsed && (
          <div className="mx-2 mt-2 flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Admin Mode</span>
          </div>
        )}

        <nav className="flex-1 space-y-1 p-2 mt-1">
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
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-2">
          <Link to="/admin/users">
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
              <ArrowLeft className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Back to Admin</span>}
            </Button>
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

const AdminCustomerLayout = () => {
  const { userId } = useParams<{ userId: string }>();
  if (!userId) return null;

  return (
    <AdminCustomerProvider userId={userId}>
      <AdminCustomerLayoutInner />
    </AdminCustomerProvider>
  );
};

export default AdminCustomerLayout;
