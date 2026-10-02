import { Star, ShoppingCart, Zap, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Link } from "react-router-dom";
import { isEffectivePreorder } from "@/lib/preorder";
import { getMedicinePricing, applyDiscount } from "@/lib/medicinePricing";
import { toast } from "sonner";
import WishlistButton from "./WishlistButton";
import { useLanguage } from "@/contexts/LanguageContext";

const ProductGrid = () => {
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const { b, formatNumber } = useLanguage();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["homepage-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(12);
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-6">
        <h2 className="mb-4 text-xl font-bold">{b("আপনার জন্য সেরা পণ্য", "Just For You")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-lg" />)}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="container mx-auto px-4 py-6">
        <h2 className="mb-4 text-xl font-bold">{b("আপনার জন্য সেরা পণ্য", "Just For You")}</h2>
        <p className="text-center text-muted-foreground py-8">
          {b("কোনো পণ্য পাওয়া যায়নি।", "No products available yet.")}
        </p>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-6">
      <h2 className="mb-4 text-xl font-bold">{b("আপনার জন্য সেরা পণ্য", "Just For You")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {products.map((product) => (
          <div key={product.id} className="group flex flex-col cursor-pointer overflow-hidden rounded-xl border-2 border-primary bg-card shadow-sm transition hover:shadow-md animate-float">
            {/* Image — square, full cover */}
            <Link to={`/product/${product.slug || product.id}`}>
              <div className="relative w-full aspect-square bg-muted overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className={`h-full w-full object-cover transition group-hover:scale-105 ${product.stock <= 0 ? "opacity-50 grayscale" : ""}`}
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-4xl text-muted-foreground">📦</span>
                  </div>
                )}
                <div className="absolute top-1 right-1 z-10">
                  <WishlistButton productId={product.id} />
                </div>
                {isEffectivePreorder(product) && (
                  <div className="absolute top-1 left-1">
                    <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground shadow">
                      {b("অগ্রিম অর্ডার", "Pre-Order")}
                    </span>
                  </div>
                )}
                {product.stock <= 0 && !isEffectivePreorder(product) && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-destructive text-destructive-foreground text-xs font-bold px-6 py-1 rotate-[-35deg] shadow-lg">
                      {b("স্টক শেষ", "Out of Stock")}
                    </div>
                  </div>
                )}
              </div>
            </Link>

            {/* Info */}
            <div className="flex flex-1 flex-col justify-between p-2">
              <Link to={`/product/${product.slug || product.id}`}>
                {/* Full name — 2 lines */}
                <p className="text-sm font-medium text-card-foreground leading-snug line-clamp-2 min-h-[2.5rem]">{product.name}</p>

                {/* Price */}
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <p className="text-base font-bold text-primary">{formatPrice(applyDiscount(product.price, 10))}</p>
                  <span className="text-[11px] text-muted-foreground line-through">{formatPrice(product.price)}</span>
                  {(product as any).price_unit && (
                    <span className="rounded bg-accent px-1 py-0.5 text-[9px] font-semibold text-accent-foreground">{(product as any).price_unit}</span>
                  )}
                  {getMedicinePricing(product as any)?.pcsPerStrip && (
                    <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-semibold text-primary">
                      {getMedicinePricing(product as any)!.pcsPerStrip} pcs/strip
                    </span>
                  )}
                </div>

                {/* Original price + discount */}
                {product.original_price && product.original_price > product.price && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                    <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-bold text-primary">
                      -{Math.round((1 - product.price / product.original_price) * 100)}%
                    </span>
                  </div>
                )}

                {/* SKP Verified Badge */}
                {(product as any).is_qmall_verified && (
                  <div className="mt-1 flex items-center gap-1">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20" />
                    <span className="text-[10px] font-semibold text-primary">
                      {b("এসকেপি ভেরিফাইড", "Verified by SKP")}
                    </span>
                  </div>
                )}

                {/* Rating */}
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  <span>{product.rating ?? 0}</span>
                  {product.sold_count ? (
                    <span>· {formatNumber(product.sold_count)} {b("বিক্রি হয়েছে", "sold")}</span>
                  ) : null}
                </div>
              </Link>

              {/* Action buttons */}
              <div className="mt-2 flex gap-1">
                {isEffectivePreorder(product) ? (
                  <Button
                    size="sm"
                    className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      addItem({ id: product.id, name: product.name, price: applyDiscount(product.price, 10), image_url: product.image_url });
                      toast.success(b("Pre-Order সফল হয়েছে!", "Pre-Order added successfully!"));
                    }}
                  >
                    <ShoppingCart className="h-3 w-3 shrink-0" /> <span className="truncate">{b("অগ্রিম অর্ডার", "Pre-Order")}</span>
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem({ id: product.id, name: product.name, price: applyDiscount(product.price, 10), image_url: product.image_url });
                        toast.success(b("কার্টে যোগ হয়েছে!", "Added to Cart!"));
                      }}
                    >
                      <ShoppingCart className="h-3 w-3 shrink-0" /> <span className="truncate">{b("কার্ট", "Cart")}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full border-2 border-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem({ id: product.id, name: product.name, price: applyDiscount(product.price, 10), image_url: product.image_url });
                        navigate("/checkout");
                      }}
                    >
                      <Zap className="h-3 w-3 shrink-0" /> <span className="truncate">{b("কিনুন", "Buy")}</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductGrid;
