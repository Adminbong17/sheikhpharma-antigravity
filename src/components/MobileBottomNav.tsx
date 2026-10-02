import { Home, LayoutGrid, Heart, ShoppingCart, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2 } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { items, totalItems, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const { formatPrice } = useCurrency();
  const { t, b, formatNumber } = useLanguage();
  const [cartOpen, setCartOpen] = useState(false);

  const navItems = [
    { label: b("ক্যাটাগরি", "Categories"), icon: LayoutGrid, path: "/categories" },
    { label: b("কার্ট", "Cart"), icon: ShoppingCart, path: "cart" },
    { label: b("হোম", "Home"), icon: Home, path: "/", isCenter: true },
    { label: b("উইশলিস্ট", "Wishlist"), icon: Heart, path: "/dashboard/wishlist" },
    { label: b("একাউন্ট", "Account"), icon: User, path: "/dashboard" },
  ];

  const isActive = (path: string) => {
    if (path === "cart") return false;
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleClick = (path: string) => {
    if (path === "cart") {
      setCartOpen(true);
    } else {
      navigate(path);
    }
  };

  // Hide on admin/vendor pages
  if (location.pathname.startsWith("/admin") || location.pathname.startsWith("/vendor") || location.pathname.startsWith("/pay")) return null;

  return (
    <>
      <nav className="fixed bottom-2 left-2 right-2 z-50 flex md:hidden items-end justify-around rounded-xl border-2 border-primary bg-[hsl(200,80%,95%)] shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
        style={{ height: 60 }}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const isCart = item.path === "cart";
          const isCenter = !!(item as any).isCenter;

          if (isCenter) {
            return (
              <button
                key={item.path}
                onClick={() => handleClick(item.path)}
                className="relative -top-1 flex items-center justify-center"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-card shadow-lg ${active ? "bg-primary text-primary-foreground" : "bg-[hsl(200,80%,92%)] text-primary"}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => handleClick(item.path)}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <span className="relative">
                <Icon className="h-[22px] w-[22px]" />
                {isCart && totalItems > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                    {formatNumber(totalItems)}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle>{t("cart.title")} ({formatNumber(totalItems)})</SheetTitle>
          </SheetHeader>
          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-muted-foreground">{t("cart.empty")}</p>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto py-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 rounded-lg border p-3">
                    <img src={item.image_url || "/placeholder.svg"} alt={item.name} className="h-16 w-16 rounded-md object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-2">{item.name}</p>
                      <p className="text-sm font-bold text-primary">{formatPrice(item.price)}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="rounded border p-0.5 hover:bg-muted"><Minus className="h-3 w-3" /></button>
                        <span className="text-sm font-medium">{formatNumber(item.quantity)}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="rounded border p-0.5 hover:bg-muted"><Plus className="h-3 w-3" /></button>
                        <button onClick={() => removeItem(item.id)} className="ml-auto text-destructive hover:opacity-70"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>{t("cart.total")}</span>
                  <span className="text-primary">{formatPrice(totalPrice)}</span>
                </div>
                <Button className="w-full" size="lg" onClick={() => { setCartOpen(false); navigate("/checkout"); }}>
                  {t("cart.checkout")}
                </Button>
                <Button variant="outline" className="w-full" onClick={clearCart}>
                  {t("cart.clear")}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MobileBottomNav;
