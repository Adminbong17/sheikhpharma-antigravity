import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { SlidersHorizontal, X, ShoppingCart, Zap, Star } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import TrustBadges from "@/components/TrustBadges";

type SortOption = "default" | "price_asc" | "price_desc" | "newest" | "best_selling";

const SectionPage = () => {
  const { sectionId } = useParams();
  const { convertPrice, current: selectedCurrency } = useCurrency();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();

  const [sortBy, setSortBy] = useState<SortOption>("best_selling");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  const { data: section } = useQuery({
    queryKey: ["section", sectionId],
    queryFn: async () => {
      const { data } = await supabase.from("homepage_sections").select("*").eq("id", sectionId).single();
      return data;
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["section-products", sectionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("homepage_section_products")
        .select("*, products(id, name, slug, image_url, price, original_price, rating, sold_count, category, created_at, is_qmall_verified)")
        .eq("section_id", sectionId!)
        .order("sort_order", { ascending: true });
      return (data || []).map((sp: any) => sp.products).filter(Boolean);
    },
  });

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category filter
    if (selectedCategory && selectedCategory !== "all") {
      result = result.filter((p: any) => p.category === selectedCategory);
    }

    // Price range filter
    const min = minPrice ? parseFloat(minPrice) : null;
    const max = maxPrice ? parseFloat(maxPrice) : null;
    if (min !== null) result = result.filter((p: any) => p.price >= min);
    if (max !== null) result = result.filter((p: any) => p.price <= max);

    // Sort
    switch (sortBy) {
      case "price_asc":
        result.sort((a: any, b: any) => a.price - b.price);
        break;
      case "price_desc":
        result.sort((a: any, b: any) => b.price - a.price);
        break;
      case "newest":
        result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "best_selling":
        result.sort((a: any, b: any) => (b.sold_count || 0) - (a.sold_count || 0));
        break;
    }

    return result;
  }, [products, selectedCategory, minPrice, maxPrice, sortBy]);

  const clearFilters = () => {
    setSortBy("default");
    setSelectedCategory("all");
    setMinPrice("");
    setMaxPrice("");
  };

  const hasActiveFilters = sortBy !== "default" || selectedCategory !== "all" || minPrice || maxPrice;

  // Get unique categories from products
  const productCategories = useMemo(() => {
    const cats = new Set(products.map((p: any) => p.category).filter(Boolean));
    return categories.filter((c) => cats.has(c.slug) || cats.has(c.name));
  }, [products, categories]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-3"><BackButton /></div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">{section?.title || "Products"}</h1>
            {section?.subtitle && <p className="text-muted-foreground">{section.subtitle}</p>}
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 rounded-lg border bg-card p-4 space-y-4">
            <div className="flex flex-wrap gap-4">
              {/* Sort By */}
              <div className="w-full sm:w-auto sm:min-w-[180px]">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Sort By</Label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="h-9 border-2 border-teal-500">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="best_selling">Best Selling</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              {productCategories.length > 0 && (
                <div className="w-full sm:w-auto sm:min-w-[180px]">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-9 border-2 border-teal-500">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {productCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Price Range */}
              <div className="flex items-end gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Min Price</Label>
                  <Input
                    type="number"
                    placeholder="০"
                    className="h-9 w-24 border-2 border-teal-500"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                </div>
                <span className="pb-2 text-muted-foreground">—</span>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Max Price</Label>
                  <Input
                    type="number"
                    placeholder="∞"
                    className="h-9 w-24 border-2 border-teal-500"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Active filter info + clear */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} found
              </span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" /> Clear Filters
                </Button>
              )}
            </div>
          </div>
        )}

        <TrustBadges />

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-lg font-medium">No products found</p>
            {hasActiveFilters && <p className="text-sm mt-1">Try adjusting your filters</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredProducts.map((p: any) => {
              const discount = p.original_price && p.original_price > p.price
                ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0;
              return (
                <div key={p.id}
                  className="group relative flex flex-col overflow-hidden rounded-xl border-2 border-primary bg-card transition hover:shadow-md animate-float">
                  <Link to={`/product/${p.slug || p.id}`}>
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <img src={p.image_url || "/placeholder.svg"} alt={p.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                      {discount > 0 && (
                        <Badge className="absolute left-1.5 top-1.5 bg-destructive text-destructive-foreground text-[10px] px-1.5">-{discount}%</Badge>
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-1 flex-col justify-between p-2.5">
                    <Link to={`/product/${p.slug || p.id}`}>
                      <h3 className="line-clamp-2 text-xs font-medium text-foreground md:text-sm">{p.name}</h3>
                    </Link>
                    <div className="mt-auto pt-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">{selectedCurrency?.symbol}{convertPrice(p.price)}</span>
                        {p.price_unit && (
                          <span className="rounded bg-accent px-1 py-0.5 text-[9px] font-semibold text-accent-foreground">{p.price_unit}</span>
                        )}
                        {p.original_price && p.original_price > p.price && (
                          <span className="text-xs text-muted-foreground line-through">{selectedCurrency?.symbol}{convertPrice(p.original_price)}</span>
                        )}
                      </div>
                      {p.is_qmall_verified && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <svg className="h-3 w-3 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                          <span className="text-[9px] font-semibold text-primary">Verified by SKP</span>
                        </div>
                      )}
                      {p.sold_count > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">{p.sold_count} sold</p>}
                      {p.rating > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-[10px] font-medium text-foreground">{Number(p.rating).toFixed(1)}</span>
                        </div>
                      )}
                      <div className="mt-2 flex gap-1">
                        <Button
                          size="sm"
                          className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full"
                          onClick={() => { addItem({ id: p.id, name: p.name, price: p.price, image_url: p.image_url }); toast.success("কার্টে যোগ হয়েছে!"); }}
                        >
                          <ShoppingCart className="h-3 w-3 shrink-0" /> <span className="truncate">Cart</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full border-2 border-primary"
                          onClick={() => { addItem({ id: p.id, name: p.name, price: p.price, image_url: p.image_url }); navigate("/checkout"); }}
                        >
                          <Zap className="h-3 w-3 shrink-0" /> <span className="truncate">Buy</span>
                        </Button>
                      </div>
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

export default SectionPage;
