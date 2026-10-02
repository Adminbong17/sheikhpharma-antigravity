import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, ShoppingCart, Zap, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Link, useNavigate } from "react-router-dom";
import { isEffectivePreorder } from "@/lib/preorder";
import { toast } from "sonner";
import WishlistButton from "./WishlistButton";

interface RelatedProductsProps {
  productId: string;
  category?: string | null;
  subcategory?: string | null;
}

const RelatedProducts = ({ productId, category, subcategory }: RelatedProductsProps) => {
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const { data: products = [] } = useQuery({
    queryKey: ["related-products", productId, category, subcategory],
    queryFn: async () => {
      // Try subcategory first, then category
      let query = supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .neq("id", productId)
        .order("sold_count", { ascending: false, nullsFirst: false })
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(12);

      if (subcategory) {
        query = query.eq("subcategory", subcategory);
      } else if (category) {
        query = query.eq("category", category);
      }

      const { data } = await query;

      // If subcategory gave few results, fill with category
      if ((data || []).length < 6 && subcategory && category) {
        const existingIds = (data || []).map((p: any) => p.id);
        const { data: more } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .eq("category", category)
          .not("id", "in", `(${[productId, ...existingIds].join(",")})`)
          .order("sold_count", { ascending: false, nullsFirst: false })
          .order("rating", { ascending: false, nullsFirst: false })
          .limit(12 - (data || []).length);
        return [...(data || []), ...(more || [])];
      }

      return data || [];
    },
    enabled: !!(category || subcategory),
  });

  if (products.length === 0) return null;

  return (
    <section className="mt-8 border-t pt-6">
      <h2 className="mb-4 text-xl font-bold">You May Also Like</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {products.map((product: any) => (
          <div key={product.id} className="group flex flex-col cursor-pointer overflow-hidden rounded-xl border-2 border-primary bg-card shadow-sm transition hover:shadow-md">
            <Link to={`/product/${product.slug || product.id}`}>
              <div className="relative w-full aspect-square bg-muted overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className={`h-full w-full object-cover transition group-hover:scale-105 ${product.stock <= 0 ? "opacity-50 grayscale" : ""}`} loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><span className="text-4xl text-muted-foreground">📦</span></div>
                )}
                <div className="absolute top-1 right-1 z-10">
                  <WishlistButton productId={product.id} />
                </div>
                {isEffectivePreorder(product) && (
                  <div className="absolute top-1 left-1"><span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground shadow">Pre-Order</span></div>
                )}
              </div>
            </Link>
            <div className="flex flex-1 flex-col justify-between p-2">
              <Link to={`/product/${product.slug || product.id}`}>
                <p className="text-sm font-medium text-card-foreground leading-snug line-clamp-2 min-h-[2.5rem]">{product.name}</p>
                <div className="mt-1 flex items-center gap-1">
                  <p className="text-base font-bold text-primary">{formatPrice(product.price)}</p>
                  {product.price_unit && (
                    <span className="rounded bg-accent px-1 py-0.5 text-[9px] font-semibold text-accent-foreground">{product.price_unit}</span>
                  )}
                </div>
                {product.original_price && product.original_price > product.price && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                    <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-bold text-primary">-{Math.round((1 - product.price / product.original_price) * 100)}%</span>
                  </div>
                )}
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  <span>{product.rating ?? 0}</span>
                  {product.sold_count ? <span>· {product.sold_count} sold</span> : null}
                </div>
              </Link>
              <div className="mt-2 flex gap-1">
                {isEffectivePreorder(product) ? (
                  <Button size="sm" className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.stopPropagation(); addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url }); toast.success("Pre-Order সফল!"); }}>
                    <ShoppingCart className="h-3 w-3 shrink-0" /> <span className="truncate">Pre-Order</span>
                  </Button>
                ) : (
                  <>
                    <Button size="sm" className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full" onClick={(e) => { e.stopPropagation(); addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url }); toast.success("কার্টে যোগ হয়েছে!"); }}>
                      <ShoppingCart className="h-3 w-3 shrink-0" /> <span className="truncate">Cart</span>
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full border-2 border-primary" onClick={(e) => { e.stopPropagation(); addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url }); navigate("/checkout"); }}>
                      <Zap className="h-3 w-3 shrink-0" /> <span className="truncate">Buy</span>
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

export default RelatedProducts;
