import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, ShoppingCart, Zap, Star, BadgeCheck, Search, SlidersHorizontal } from "lucide-react";
import { isEffectivePreorder } from "@/lib/preorder";
import { toast } from "sonner";

const FlashDealsPage = () => {
  const { convertPrice, current: selectedCurrency } = useCurrency();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const { data: activeDeal } = useQuery({
    queryKey: ["active-flash-deal"],
    queryFn: async () => {
      const { data } = await (supabase
        .from("flash_deals" as any)
        .select("*")
        .eq("is_active", true)
        .gt("end_time", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single() as any);
      return data;
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["flash-deal-products", activeDeal?.id],
    enabled: !!activeDeal?.id,
    queryFn: async () => {
      const { data } = await (supabase
        .from("flash_deal_products" as any)
        .select("*, products(id, name, slug, image_url, price, price_unit, original_price, rating, sold_count, is_qmall_verified, stock, is_preorder, preorder_count)")
        .eq("deal_id", activeDeal!.id)
        .order("sort_order", { ascending: true }) as any);
      return (data || []).map((dp: any) => {
        const p = dp.products;
        if (!p) return null;
        // If deal_price is set, use it as the price and product's price as original
        if (dp.deal_price != null) {
          return { ...p, original_price: p.price, price: dp.deal_price };
        }
        return p;
      }).filter(Boolean);
    },
  });

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.trim()) list = list.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (priceMin) list = list.filter((p: any) => p.price >= Number(priceMin));
    if (priceMax) list = list.filter((p: any) => p.price <= Number(priceMax));
    if (inStockOnly) list = list.filter((p: any) => p.stock > 0);
    switch (sortBy) {
      case "price_asc": list.sort((a: any, b: any) => a.price - b.price); break;
      case "price_desc": list.sort((a: any, b: any) => b.price - a.price); break;
      case "rating": list.sort((a: any, b: any) => (b.rating ?? 0) - (a.rating ?? 0)); break;
      case "popular": list.sort((a: any, b: any) => (b.sold_count ?? 0) - (a.sold_count ?? 0)); break;
      default: break;
    }
    return list;
  }, [products, search, sortBy, priceMin, priceMax, inStockOnly]);

  useEffect(() => {
    if (!activeDeal) return;
    const calc = () => {
      const diff = new Date(activeDeal.end_time).getTime() - Date.now();
      if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 };
      return {
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      };
    };
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [activeDeal]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-3"><BackButton /></div>
        {/* Timer header */}
        {activeDeal && (
          <div className="rounded-2xl bg-gradient-to-r from-destructive/10 via-destructive/5 to-primary/10 border border-destructive/20 p-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-destructive/15 p-3">
                <Clock className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{activeDeal.title}</h1>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-sm text-muted-foreground">Ends in:</span>
                  <div className="flex items-center gap-1">
                    {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((v, i) => (
                      <span key={i} className="contents">
                        {i > 0 && <span className="font-bold text-destructive">:</span>}
                        <span className="inline-flex items-center justify-center bg-destructive text-destructive-foreground font-bold text-lg rounded-md px-2.5 py-1 min-w-[2.5rem]">
                          {pad(v)}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!activeDeal && !isLoading && (
          <div className="text-center py-20">
            <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground">বর্তমানে কোনো Flash Deal চলছে না</h2>
            <p className="text-muted-foreground mt-2">শীঘ্রই নতুন অফার আসবে!</p>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-72 rounded-lg" />)}
          </div>
        )}

        {/* Filters Bar */}
        {products.length > 0 && (
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
              In Stock
            </Button>
          </div>
        )}

        {/* Products grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((p: any) => {
            const discount = p.original_price && p.original_price > p.price
              ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
              : 0;
            return (
              <div key={p.id} className="group relative flex flex-col overflow-hidden rounded-xl border-2 border-primary bg-card transition hover:shadow-md animate-float">
                <Link to={`/product/${p.slug || p.id}`}>
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img src={p.image_url || "/placeholder.svg"} alt={p.name} className={`h-full w-full object-cover transition-transform group-hover:scale-105 ${p.stock <= 0 && !isEffectivePreorder(p) ? "opacity-50 grayscale" : ""}`} loading="lazy" />
                    {discount > 0 && <Badge className="absolute left-1.5 top-1.5 bg-destructive text-destructive-foreground text-[10px] px-1.5">-{discount}%</Badge>}
                    {isEffectivePreorder(p) && <div className="absolute top-1 right-1"><span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground shadow">Pre-Order</span></div>}
                    {p.stock <= 0 && !isEffectivePreorder(p) && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="bg-destructive text-destructive-foreground text-[10px] font-bold px-4 py-0.5 rotate-[-35deg] shadow-lg">Out of Stock</div></div>}
                  </div>
                </Link>
                <div className="flex flex-1 flex-col justify-between p-2.5">
                  <Link to={`/product/${p.slug || p.id}`}>
                    <h3 className="line-clamp-3 text-xs font-medium text-foreground md:text-sm min-h-[3.5rem]">{p.name}</h3>
                     <div className="mt-1 space-y-0.5">
                       {/* MRP */}
                       {p.original_price && p.original_price > p.price && (
                         <div className="flex items-center gap-1">
                           <span className="text-[10px] text-muted-foreground font-medium">MRP:</span>
                           <span className="text-xs text-muted-foreground line-through">{selectedCurrency?.symbol}{convertPrice(p.original_price)}</span>
                         </div>
                       )}
                       {/* Flash Sale Price */}
                       <div className="flex items-center gap-1">
                         <span className="text-[10px] text-destructive font-semibold">Flash Sale:</span>
                         <span className="text-sm font-bold text-primary">{selectedCurrency?.symbol}{convertPrice(p.price)}</span>
                         {p.price_unit && <span className="rounded bg-accent px-1 py-0.5 text-[9px] font-semibold text-accent-foreground">{p.price_unit}</span>}
                       </div>
                       {/* Discount */}
                       {discount > 0 && (
                         <div>
                           <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">-{discount}% OFF</span>
                         </div>
                       )}
                       {p.is_qmall_verified && <div className="flex items-center gap-1 mt-0.5"><BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20" /><span className="text-[9px] font-semibold text-primary">Verified by SKP</span></div>}
                       <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                         <Star className="h-3 w-3 fill-primary text-primary" />
                         <span>{p.rating ?? 0}</span>
                         {p.sold_count > 0 && <span>· {p.sold_count} sold</span>}
                       </div>
                     </div>
                  </Link>
                  <div className="mt-2 flex gap-1">
                    {isEffectivePreorder(p) ? (
                      <Button size="sm" className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.stopPropagation(); addItem({ id: p.id, name: p.name, price: p.price, image_url: p.image_url }); toast.success("Pre-Order সফল হয়েছে!"); }}>
                        <ShoppingCart className="h-3 w-3 shrink-0" /> <span className="truncate">Pre-Order</span>
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full" onClick={(e) => { e.stopPropagation(); addItem({ id: p.id, name: p.name, price: p.price, image_url: p.image_url }); toast.success("কার্টে যোগ হয়েছে!"); }}>
                          <ShoppingCart className="h-3 w-3 shrink-0" /> <span className="truncate">Cart</span>
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full border-2 border-primary" onClick={(e) => { e.stopPropagation(); addItem({ id: p.id, name: p.name, price: p.price, image_url: p.image_url }); navigate("/checkout"); }}>
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
      </main>
      <Footer />
    </div>
  );
};

export default FlashDealsPage;
