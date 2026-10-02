import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCategories, useSubcategories } from "@/hooks/useCategories";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star, ChevronRight, BadgeCheck, Zap } from "lucide-react";
import BackButton from "@/components/BackButton";
import CategoryIcon from "@/components/CategoryIcon";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Skeleton } from "@/components/ui/skeleton";
import TrustBadges from "@/components/TrustBadges";
import { isEffectivePreorder } from "@/lib/preorder";
import { toast } from "sonner";

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const { data: categories = [], isLoading: catLoading } = useCategories();
  const { data: allSubs = [] } = useSubcategories();
  const [activeSub, setActiveSub] = useState<string | null>(null);

  const category = categories.find((c) => c.slug === slug);
  const subcategories = allSubs.filter((s) => s.category_id === category?.id);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-by-category", slug, activeSub],
    queryFn: async () => {
      if (activeSub) {
        const selectedSubcategory = subcategories.find((sub) => sub.slug === activeSub);
        const subcategoryValues = [activeSub, selectedSubcategory?.name].filter(
          (value): value is string => Boolean(value),
        );
        const { data } = await supabase
          .from("products")
          .select("*")
          .in("category", subcategoryValues)
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        return data || [];
      }
      // Imported products may store either a category slug or its display name.
      const categoryValues = [
        slug,
        category?.name,
        ...subcategories.flatMap((sub) => [sub.slug, sub.name]),
      ].filter((value): value is string => Boolean(value));
      const { data } = await supabase
        .from("products")
        .select("*")
        .in("category", categoryValues)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!category,
  });

  if (catLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Category not found</h1>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${category?.name || "Medicines"} — Buy Online in Bangladesh | Sheikh Pharma`}
        description={`Browse ${products.length}+ ${category?.name || "medicine"} products at Sheikh Pharma. Genuine medicines & healthcare items with fast home delivery across Bangladesh.`}
        path={`/category/${slug}`}
      />
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-4"><BackButton /></div>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
            <CategoryIcon iconUrl={category.icon_url} name={category.name} className="h-8 w-8" iconClassName="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{category.name}</h1>
            <p className="text-sm text-muted-foreground">{products.length} products</p>
          </div>
        </div>

        {subcategories.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">Subcategories</h2>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={activeSub === null ? "default" : "outline"}
                className="cursor-pointer px-4 py-2 text-sm transition-colors"
                onClick={() => setActiveSub(null)}
              >
                All
              </Badge>
              {subcategories.map((sub) => (
                <Badge
                  key={sub.slug}
                  variant={activeSub === sub.slug ? "default" : "outline"}
                  className="cursor-pointer px-4 py-2 text-sm transition-colors"
                  onClick={() => setActiveSub(activeSub === sub.slug ? null : sub.slug)}
                >
                  {sub.name}
                </Badge>
              ))}
            </div>
          </section>
        )}

        <TrustBadges />

        <section>
          <h2 className="mb-4 text-lg font-semibold">Products</h2>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No products in this category yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {products.map((product) => (
                <div key={product.id} className="group flex flex-col cursor-pointer overflow-hidden rounded-xl border-2 border-primary bg-card shadow-sm transition hover:shadow-md animate-float">
                  <Link to={`/product/${product.slug || product.id}`}>
                    <div className="relative w-full aspect-square bg-muted overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className={`h-full w-full object-cover transition group-hover:scale-105 ${product.stock <= 0 ? "opacity-50 grayscale" : ""}`} loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center"><span className="text-4xl text-muted-foreground">📦</span></div>
                      )}
                      {isEffectivePreorder(product) && (
                        <div className="absolute top-1 left-1">
                          <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground shadow">Pre-Order</span>
                        </div>
                      )}
                      {product.stock <= 0 && !isEffectivePreorder(product) && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-destructive text-destructive-foreground text-xs font-bold px-6 py-1 rotate-[-35deg] shadow-lg">Out of Stock</div>
                        </div>
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
                      {product.is_qmall_verified && (
                        <div className="mt-1 flex items-center gap-1">
                          <BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20" />
                          <span className="text-[10px] font-semibold text-primary">Verified by SKP</span>
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
                        <Button size="sm" className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.stopPropagation(); addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url }); toast.success("Pre-Order সফল হয়েছে!"); }}>
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
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CategoryPage;
