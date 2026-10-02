import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Star, BadgeCheck, Search, ChevronRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCategories } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";
import TrustBadges from "@/components/TrustBadges";

const QmallProducts = () => {
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const { data: categories = [] } = useCategories();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState("all");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["qmall-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("is_qmall_verified", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const filtered = products
    .filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (priceRange === "0-500" && p.price > 500) return false;
      if (priceRange === "500-1000" && (p.price < 500 || p.price > 1000)) return false;
      if (priceRange === "1000-5000" && (p.price < 1000 || p.price > 5000)) return false;
      if (priceRange === "5000+" && p.price < 5000) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "best-selling") return (b.sold_count || 0) - (a.sold_count || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-3"><BackButton /></div>
        <div className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">SKP Verified</span>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <BadgeCheck className="h-6 w-6 text-primary fill-primary/20" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">SKP Verified Products</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} verified products</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="relative col-span-2 md:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-2 border-teal-500"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="border-2 border-teal-500"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="border-2 border-teal-500"><SelectValue placeholder="Price Range" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prices</SelectItem>
              <SelectItem value="0-500">৳0 - ৳500</SelectItem>
              <SelectItem value="500-1000">৳500 - ৳1,000</SelectItem>
              <SelectItem value="1000-5000">৳1,000 - ৳5,000</SelectItem>
              <SelectItem value="5000+">৳5,000+</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="border-2 border-teal-500"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="best-selling">Best Selling</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TrustBadges />

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No verified products found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {filtered.map((product) => (
              <Link key={product.id} to={`/product/${product.slug || product.id}`} className="block">
                <Card className="group flex flex-col overflow-hidden rounded-xl border-2 border-primary transition hover:shadow-lg h-full animate-float">
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img src={product.image_url || "/placeholder.svg"} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                  </div>
                  <CardContent className="flex flex-1 flex-col p-3 space-y-2">
                    <p className="text-sm font-medium line-clamp-2">{product.name}</p>
                    <div className="flex items-center gap-1">
                      {product.rating ? (
                        <span className="flex items-center gap-0.5 text-xs text-amber-500">
                          <Star className="h-3 w-3 fill-current" /> {product.rating}
                        </span>
                      ) : null}
                      {product.sold_count ? (
                        <span className="text-xs text-muted-foreground">({product.sold_count} sold)</span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20" />
                      <span className="text-[10px] font-semibold text-primary">Verified by SKP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
                      {(product as any).price_unit && (
                        <span className="rounded bg-accent px-1 py-0.5 text-[9px] font-semibold text-accent-foreground">{(product as any).price_unit}</span>
                      )}
                      {product.original_price && (
                        <span className="text-xs text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                      )}
                    </div>
                    <div className="mt-auto">
                      <Button size="sm" className="w-full gap-1 rounded-full" onClick={(e) => { e.preventDefault(); addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url }); }}>
                        <ShoppingCart className="h-3 w-3" /> Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default QmallProducts;
