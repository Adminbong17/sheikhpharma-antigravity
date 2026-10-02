import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Star, BadgeCheck, Zap, Search, FlaskConical } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import TrustBadges from "@/components/TrustBadges";
import { isEffectivePreorder } from "@/lib/preorder";
import { toast } from "sonner";
import { useState, useMemo } from "react";

const GenericPage = () => {
  const { name } = useParams<{ name: string }>();
  const genericName = decodeURIComponent(name || "");
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const [sortBy, setSortBy] = useState("newest");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [filterQuery, setFilterQuery] = useState("");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["generic-products", genericName],
    queryFn: async () => {
      // Paginate to get ALL matching products (bypass 1000 row limit)
      const all: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .ilike("generic_name", `%${genericName}%`)
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error || !data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
    enabled: genericName.trim().length > 0,
  });

  // Brand list from results
  const { data: brands = [] } = useQuery({
    queryKey: ["generic-brands", genericName, products.length],
    queryFn: async () => {
      const ids = [...new Set(products.map((p: any) => p.brand_id).filter(Boolean))];
      if (ids.length === 0) return [];
      const { data } = await supabase.from("brands").select("id, name").in("id", ids);
      return data || [];
    },
    enabled: products.length > 0,
  });

  const brandName = (id: string | null) => brands.find((b: any) => b.id === id)?.name || "";

  const filtered = useMemo(() => {
    let result = [...products];

    if (filterQuery.trim()) {
      result = result.filter((p) => p.name.toLowerCase().includes(filterQuery.toLowerCase()));
    }
    if (brandFilter !== "all") {
      result = result.filter((p) => p.brand_id === brandFilter);
    }
    if (priceMin) result = result.filter((p) => p.price >= Number(priceMin));
    if (priceMax) result = result.filter((p) => p.price <= Number(priceMax));
    if (stockFilter === "in_stock") result = result.filter((p) => p.stock > 0);
    if (stockFilter === "out_of_stock") result = result.filter((p) => p.stock <= 0);

    switch (sortBy) {
      case "price_low": result.sort((a, b) => a.price - b.price); break;
      case "price_high": result.sort((a, b) => b.price - a.price); break;
      case "rating": result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
      case "popular": result.sort((a, b) => (b.sold_count ?? 0) - (a.sold_count ?? 0)); break;
      default: break;
    }

    return result;
  }, [products, filterQuery, brandFilter, priceMin, priceMax, stockFilter, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${genericName} — All Brands & Prices in Bangladesh | Sheikh Pharma`}
        description={`Compare all ${genericName} medicines by brand and price at Sheikh Pharma. ${filtered.length} products available with fast home delivery in Bangladesh.`}
      />
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-3"><BackButton /></div>

        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Generic / Composition</p>
            <h1 className="text-xl font-bold text-foreground">{genericName}</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{filtered.length} products found</p>

        <TrustBadges />

        {/* Filters */}
        <div className="my-4 grid grid-cols-2 gap-2 md:grid-cols-6">
          <div className="relative col-span-2 md:col-span-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter results..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-8 border-2 border-primary"
            />
          </div>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="border-2 border-primary"><SelectValue placeholder="Brand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="border-2 border-primary"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price_low">Price: Low → High</SelectItem>
              <SelectItem value="price_high">Price: High → Low</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="border-2 border-primary"><SelectValue placeholder="Stock" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Min ৳" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="border-2 border-primary" />
          <Input type="number" placeholder="Max ৳" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="border-2 border-primary" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            No products found for this generic name.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {filtered.map((product) => {
              const discount = product.original_price && product.original_price > product.price
                ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
                : 0;
              const bName = brandName(product.brand_id);
              return (
                <div key={product.id} className="group flex flex-col cursor-pointer overflow-hidden rounded-xl border-2 border-primary bg-card shadow-sm transition hover:shadow-md animate-float">
                  <Link to={`/product/${product.slug || product.id}`}>
                    <div className="relative w-full aspect-square bg-muted overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className={`h-full w-full object-cover transition group-hover:scale-105 ${product.stock <= 0 && !isEffectivePreorder(product) ? "opacity-50 grayscale" : ""}`}
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="text-4xl text-muted-foreground">📦</span>
                        </div>
                      )}
                      {discount > 0 && (
                        <Badge className="absolute left-1.5 top-1.5 bg-destructive text-destructive-foreground text-[10px] px-1.5">
                          -{discount}%
                        </Badge>
                      )}
                      {isEffectivePreorder(product) && (
                        <div className="absolute top-1 right-1">
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
                      {bName && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{bName}</p>
                      )}
                      <div className="mt-1 flex items-center gap-1">
                        <p className="text-base font-bold text-primary">{formatPrice(product.price)}</p>
                        {(product as any).price_unit && (
                          <span className="rounded bg-accent px-1 py-0.5 text-[9px] font-semibold text-accent-foreground">{(product as any).price_unit}</span>
                        )}
                      </div>
                      {product.original_price && product.original_price > product.price && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                          <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-bold text-primary">-{discount}%</span>
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
                        <Button
                          size="sm"
                          className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={(e) => { e.stopPropagation(); addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url }); toast.success("Pre-Order সফল হয়েছে!"); }}
                        >
                          <ShoppingCart className="h-3 w-3 shrink-0" /> <span className="truncate">Pre-Order</span>
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full"
                            onClick={(e) => { e.stopPropagation(); addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url }); toast.success("কার্টে যোগ হয়েছে!"); }}
                          >
                            <ShoppingCart className="h-3 w-3 shrink-0" /> <span className="truncate">Cart</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full border-2 border-primary"
                            onClick={(e) => { e.stopPropagation(); addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url }); navigate("/checkout"); }}
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
        )}
      </main>
      <Footer />
    </div>
  );
};

export default GenericPage;
