import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Zap, Star, BadgeCheck, SlidersHorizontal } from "lucide-react";
import BackButton from "@/components/BackButton";
import { Skeleton } from "@/components/ui/skeleton";
import { isEffectivePreorder } from "@/lib/preorder";
import { toast } from "sonner";
import TrustBadges from "@/components/TrustBadges";

const BrandPage = () => {
  const { id } = useParams<{ id: string }>();
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

  const { data: brand } = useQuery({
    queryKey: ["brand", id],
    queryFn: async () => {
      const { data } = await supabase.from("brands").select("*").eq("id", id!).single();
      return data;
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["brand-products", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("brand_id", id!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.trim()) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (priceMin) list = list.filter((p) => p.price >= Number(priceMin));
    if (priceMax) list = list.filter((p) => p.price <= Number(priceMax));
    if (inStockOnly) list = list.filter((p) => p.stock > 0);
    switch (sortBy) {
      case "price_asc": list.sort((a, b) => a.price - b.price); break;
      case "price_desc": list.sort((a, b) => b.price - a.price); break;
      case "rating": list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
      case "popular": list.sort((a, b) => (b.sold_count ?? 0) - (a.sold_count ?? 0)); break;
      default: break; // newest already
    }
    return list;
  }, [products, search, sortBy, priceMin, priceMax, inStockOnly]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-4"><BackButton /></div>

        {/* Brand Header */}
        {brand && (
          <div className="flex items-center gap-4 mb-6 p-4 rounded-xl border bg-card">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={brand.name} className="h-16 w-16 rounded-xl object-contain border" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {brand.name[0]}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{brand.name}</h1>
              <p className="text-sm text-muted-foreground">{products.length} products</p>
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-wrap gap-2 mb-5 p-3 rounded-xl border bg-card">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Min ৳" className="h-9 w-24" type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
          <Input placeholder="Max ৳" className="h-9 w-24" type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
          <Button
            variant={inStockOnly ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1"
            onClick={() => setInStockOnly((v) => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            In Stock Only
          </Button>
          <span className="flex items-center text-xs text-muted-foreground ml-auto self-center">{filtered.length} results</span>
        </div>

        <TrustBadges />

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-72 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No products found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((p: any) => {
              const discount = p.original_price && p.original_price > p.price
                ? Math.round((1 - p.price / p.original_price) * 100) : 0;
              return (
                <div key={p.id} className="group flex flex-col overflow-hidden rounded-xl bg-card border-2 border-primary shadow-sm transition hover:shadow-md animate-float">
                  <Link to={`/product/${p.slug || p.id}`}>
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <img
                        src={p.image_url || "/placeholder.svg"}
                        alt={p.name}
                        className={`h-full w-full object-cover transition group-hover:scale-105 ${p.stock <= 0 && !isEffectivePreorder(p) ? "opacity-50 grayscale" : ""}`}
                        loading="lazy"
                      />
                      {discount > 0 && (
                        <Badge className="absolute left-1.5 top-1.5 bg-destructive text-destructive-foreground text-[10px] px-1.5">-{discount}%</Badge>
                      )}
                      {isEffectivePreorder(p) && (
                        <div className="absolute top-1 right-1">
                          <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground shadow">Pre-Order</span>
                        </div>
                      )}
                      {p.stock <= 0 && !isEffectivePreorder(p) && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-destructive text-destructive-foreground text-[10px] font-bold px-4 py-0.5 rotate-[-35deg] shadow-lg">Out of Stock</div>
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-1 flex-col justify-between p-2.5">
                    <Link to={`/product/${p.slug || p.id}`}>
                      <p className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{p.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <p className="text-base font-bold text-primary">{formatPrice(p.price)}</p>
                        {p.price_unit && (
                          <span className="rounded bg-accent px-1 py-0.5 text-[9px] font-semibold text-accent-foreground">{p.price_unit}</span>
                        )}
                      </div>
                      {p.original_price && p.original_price > p.price && (
                        <span className="text-xs text-muted-foreground line-through">{formatPrice(p.original_price)}</span>
                      )}
                      {p.is_qmall_verified && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20" />
                          <span className="text-[9px] font-semibold text-primary">Verified by SKP</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        <span>{p.rating ?? 0}</span>
                        {p.sold_count ? <span>· {p.sold_count} sold</span> : null}
                      </div>
                    </Link>
                    <div className="mt-2 flex gap-1">
                      {isEffectivePreorder(p) ? (
                        <Button size="sm" className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={(e) => { e.stopPropagation(); addItem({ id: p.id, name: p.name, price: p.price, image_url: p.image_url }); toast.success("Pre-Order সফল!"); }}>
                          <ShoppingCart className="h-3 w-3 shrink-0" /> <span className="truncate">Pre-Order</span>
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full"
                            onClick={(e) => { e.stopPropagation(); addItem({ id: p.id, name: p.name, price: p.price, image_url: p.image_url }); toast.success("কার্টে যোগ হয়েছে!"); }}>
                            <ShoppingCart className="h-3 w-3 shrink-0" /> <span className="truncate">Cart</span>
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full border-2 border-primary"
                            onClick={(e) => { e.stopPropagation(); addItem({ id: p.id, name: p.name, price: p.price, image_url: p.image_url }); navigate("/checkout"); }}>
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
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BrandPage;
