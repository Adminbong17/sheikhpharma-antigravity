import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const CartSheet = () => {
  const { items, totalItems, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const { formatPrice } = useCurrency();
  const { t, formatNumber } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative flex items-center justify-center rounded-full border border-white/25 bg-white/15 hover:bg-white/25 p-2 text-white shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95">
          <ShoppingCart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge className="absolute -right-1.5 -top-1.5 h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-500 text-white p-0 px-1 text-[10px] font-bold shadow-md ring-2 ring-white/30">
              {formatNumber(totalItems)}
            </Badge>
          )}
        </button>
      </SheetTrigger>
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
              {items.map((item, idx) => (
                <div key={`${item.id}-${item.variantKey || idx}`} className="flex gap-3 rounded-lg border p-3">
                  <img src={item.image_url || "/placeholder.svg"} alt={item.name} className="h-16 w-16 rounded-md object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-medium line-clamp-2">{item.name}</p>
                    {item.variantLabel && (
                      <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                    )}
                    <p className="text-sm font-bold text-primary">{formatPrice(item.price)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.variantKey)} className="rounded border p-0.5 hover:bg-muted"><Minus className="h-3 w-3" /></button>
                      <span className="text-sm font-medium">{formatNumber(item.quantity)}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.variantKey)} className="rounded border p-0.5 hover:bg-muted"><Plus className="h-3 w-3" /></button>
                      <button onClick={() => removeItem(item.id, item.variantKey)} className="ml-auto text-destructive hover:opacity-70"><Trash2 className="h-4 w-4" /></button>
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
              <Button className="w-full" size="lg" onClick={() => { setOpen(false); navigate("/checkout"); }}>
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
  );
};

export default CartSheet;
