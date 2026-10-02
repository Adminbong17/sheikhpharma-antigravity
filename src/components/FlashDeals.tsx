import { Zap, ShoppingCart, Star, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Link } from "react-router-dom";
import { isEffectivePreorder } from "@/lib/preorder";
import { toast } from "sonner";

const FlashDeals = () => {
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["flash-deals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .not("original_price", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);
      return (data || []).filter((p) => p.original_price && p.original_price > p.price);
    },
  });

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-6 w-6 fill-primary text-primary" />
          <h2 className="text-xl font-bold">Flash Sale</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-lg" />)}
        </div>
      </section>
    );
  }

  if (deals.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Zap className="h-6 w-6 fill-primary text-primary" />
        <h2 className="text-xl font-bold">Flash Sale</h2>
        <span className="ml-2 rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">LIVE</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {deals.map((deal) => {
          const discount = deal.original_price ? Math.round((1 - deal.price / deal.original_price) * 100) : 0;
          return (
            <div key={deal.id} className="group flex flex-col cursor-pointer overflow-hidden rounded-xl border-2 border-primary bg-card shadow-sm transition hover:shadow-md animate-float">
              {/* Image — square */}
              <Link to={`/product/${deal.slug || deal.id}`}>
                <div className="relative w-full aspect-square bg-muted overflow-hidden">
                  {isEffectivePreorder(deal) && (
                    <div className="absolute top-1 left-1 z-10">
                      <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground shadow">Pre-Order</span>
                    </div>
                  )}
                  {deal.image_url ? (
                    <img
                      src={deal.image_url}
                      alt={deal.name}
                      className={`h-full w-full object-cover transition group-hover:scale-105 ${deal.stock <= 0 && !isEffectivePreorder(deal) ? "opacity-50 grayscale" : ""}`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-4xl text-muted-foreground">🏷️</span>
                    </div>
                  )}
                  {deal.stock <= 0 && !isEffectivePreorder(deal) && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-destructive text-destructive-foreground text-[10px] font-bold px-4 py-0.5 rotate-[-35deg] shadow-lg">Out of Stock</div>
                    </div>
                  )}
                </div>
              </Link>

              {/* Info */}
              <div className="flex flex-1 flex-col p-2">
                <Link to={`/product/${deal.slug || deal.id}`}>
                  {/* Full name — 2 lines */}
                  <p className="text-sm font-medium text-card-foreground leading-snug line-clamp-2 min-h-[2.5rem]">{deal.name}</p>

                  {/* MRP */}
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-medium">MRP:</span>
                    <span className="text-xs text-muted-foreground line-through">{formatPrice(deal.original_price!)}</span>
                  </div>

                  {/* Flash Sale Price */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-destructive font-semibold">Flash Sale:</span>
                    <p className="text-base font-bold text-primary">{formatPrice(deal.price)}</p>
                    {(deal as any).price_unit && (
                      <span className="rounded bg-accent px-1 py-0.5 text-[9px] font-semibold text-accent-foreground">{(deal as any).price_unit}</span>
                    )}
                  </div>

                  {/* Discount */}
                  <div className="mt-0.5">
                    <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">-{discount}% OFF</span>
                  </div>

                  {/* SKP Badge */}
                  {(deal as any).is_qmall_verified && (
                    <div className="mt-1 flex items-center gap-1">
                      <BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20" />
                      <span className="text-[10px] font-semibold text-primary">Verified by SKP</span>
                    </div>
                  )}

                  {/* Rating */}
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span>{deal.rating ?? 0}</span>
                    {deal.sold_count ? <span>· {deal.sold_count} sold</span> : null}
                  </div>
                </Link>

                {/* Action buttons */}
                <div className="mt-2 flex gap-1">
                  {isEffectivePreorder(deal) ? (
                    <Button
                      size="sm"
                      className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => { addItem({ id: deal.id, name: deal.name, price: deal.price, image_url: deal.image_url }); toast.success("Pre-Order সফল হয়েছে!"); }}
                    >
                      <ShoppingCart className="h-3 w-3 shrink-0" /> <span className="truncate">Pre-Order</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full"
                        onClick={() => { addItem({ id: deal.id, name: deal.name, price: deal.price, image_url: deal.image_url }); toast.success("কার্টে যোগ হয়েছে!"); }}
                      >
                        <ShoppingCart className="h-3 w-3 shrink-0" /> <span className="truncate">Cart</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full border-2 border-primary"
                        onClick={() => { addItem({ id: deal.id, name: deal.name, price: deal.price, image_url: deal.image_url }); navigate("/checkout"); }}
                      >
                        <Zap className="h-3 w-3 shrink-0" /> <span className="truncate">Buy</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FlashDeals;
