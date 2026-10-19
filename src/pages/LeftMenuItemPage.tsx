import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import { Package, ShoppingCart, Zap, Search, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { DEFAULT_MENU_ITEMS } from "@/components/HomepageLeftMenu";

const KEYWORD_MAP: Record<string, string[]> = {
  "c71c7d0f-765e-4586-8d06-16c191c4cdea": ["folic", "folison", "fevit", "iron", "calcium", "lacta", "mom"],
  "11111111-2222-3333-4444-555555555501": ["metformin", "gliclazide", "glimepiride", "insulin", "diab", "comprid", "gluconor"],
  "11111111-2222-3333-4444-555555555502": ["pediatric", "baby", "lacto", "cerelac", "diaper", "drops", "infant"],
  "11111111-2222-3333-4444-555555555503": ["calbo", "bextram", "filwel", "bicozin", "vitamin", "neuro", "ceevit", "zinc"],
  "11111111-2222-3333-4444-555555555504": ["pad", "whisper", "senora", "freedom", "joya", "wash", "hygiene", "femina"],
  "11111111-2222-3333-4444-555555555505": ["device", "nebulizer", "thermometer", "monitor", "strip", "syringe", "cannula", "gauze"],
};

const getKeywordsFor = (id?: string, name?: string): string[] => {
  if (id && KEYWORD_MAP[id]) return KEYWORD_MAP[id];
  const n = (name || "").toLowerCase();
  if (n.includes("pregnan") || n.includes("গর্ভ")) {
    return ["folic", "folison", "fevit", "iron", "calcium", "lacta", "mom"];
  }
  if (n.includes("diabet") || n.includes("ডায়াবেটিস")) {
    return ["metformin", "gliclazide", "glimepiride", "insulin", "diab", "comprid", "gluconor"];
  }
  if (n.includes("baby") || n.includes("শিশু") || n.includes("বেবি")) {
    return ["pediatric", "baby", "lacto", "cerelac", "diaper", "drops", "infant"];
  }
  if (n.includes("vitamin") || n.includes("ভিটামিন") || n.includes("supplement") || n.includes("সাপ্লিমেন্ট")) {
    return ["calbo", "bextram", "filwel", "bicozin", "vitamin", "neuro", "ceevit", "zinc"];
  }
  if (n.includes("hygiene") || n.includes("হাইজিন") || n.includes("women") || n.includes("ওমেন")) {
    return ["pad", "whisper", "senora", "freedom", "joya", "wash", "hygiene", "femina"];
  }
  if (n.includes("device") || n.includes("ডিভাইস")) {
    return ["device", "nebulizer", "thermometer", "monitor", "strip", "syringe", "cannula", "gauze"];
  }
  return [];
};

const LeftMenuItemPage = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { convertPrice, current: selectedCurrency } = useCurrency();
  const { addItem } = useCart();
  const { b } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");

  const defaultItem = useMemo(() => {
    return DEFAULT_MENU_ITEMS.find((m) => m.id === itemId);
  }, [itemId]);

  const { data: item = defaultItem } = useQuery({
    queryKey: ["left-menu-item", itemId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("homepage_left_menu_items")
          .select("*")
          .eq("id", itemId!)
          .maybeSingle();
        if (error) return defaultItem;
        return data || defaultItem;
      } catch {
        return defaultItem;
      }
    },
    initialData: defaultItem,
    enabled: !!itemId,
    staleTime: 1000 * 60 * 15,
  });

  // External link handling
  useEffect(() => {
    if (item?.use_link && item?.link_url) {
      if (/^https?:\/\//i.test(item.link_url)) {
        window.location.replace(item.link_url);
      } else {
        navigate(item.link_url, { replace: true });
      }
    }
  }, [item, navigate]);

  // Query assigned products
  const { data: assignedProducts = [], isLoading: isAssignedLoading } = useQuery({
    queryKey: ["left-menu-item-products", itemId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("homepage_left_menu_products")
          .select("id, sort_order, products(id, name, slug, image_url, price, price_unit, original_price, rating, sold_count, stock)")
          .eq("menu_item_id", itemId!)
          .order("sort_order", { ascending: true });
        if (error || !data) return [];
        return data.map((sp: any) => sp.products).filter(Boolean);
      } catch {
        return [];
      }
    },
    enabled: !!itemId,
    staleTime: 1000 * 60 * 10,
  });

  // Query smart fallback products if none assigned yet
  const keywords = useMemo(() => getKeywordsFor(itemId, item?.name), [itemId, item?.name]);
  const { data: fallbackProducts = [], isLoading: isFallbackLoading } = useQuery({
    queryKey: ["left-menu-fallback-products", itemId, item?.name],
    queryFn: async () => {
      if (keywords.length === 0) return [];
      try {
        const orFilter = keywords.map((k) => `name.ilike.%${k}%`).join(",");
        const { data, error } = await supabase
          .from("products")
          .select("id, name, slug, image_url, price, price_unit, original_price, rating, sold_count, stock")
          .or(orFilter)
          .limit(36);
        if (error || !data) return [];
        return data;
      } catch {
        return [];
      }
    },
    enabled: assignedProducts.length === 0 && keywords.length > 0,
    staleTime: 1000 * 60 * 15,
  });

  const displayProducts = assignedProducts.length > 0 ? assignedProducts : fallbackProducts;
  const isLoading = assignedProducts.length === 0 && keywords.length > 0 ? isFallbackLoading : isAssignedLoading;

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return displayProducts;
    const q = searchQuery.toLowerCase().trim();
    return displayProducts.filter((p: any) => p.name?.toLowerCase().includes(q));
  }, [displayProducts, searchQuery]);

  const handleAddToCart = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    toast.success(`${product.name} কার্টে যোগ করা হয়েছে`);
  };

  const handleBuyNow = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6">
        <BackButton className="mb-4" />

        {/* Header Banner */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 p-6 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden border shadow-sm shrink-0">
              {item?.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
              ) : item?.icon ? (
                <span className="text-3xl">{item.icon}</span>
              ) : (
                <Package className="h-7 w-7 text-primary" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {item?.name || "Products"}
                </h1>
                <Badge variant="secondary" className="text-xs">
                  {displayProducts.length} {b("টি পণ্য", "Items")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {b("সুলভ মূল্যে আসল ও বিশ্বস্ত ওষুধ সরাসরি আপনার দরজায়", "Genuine health products delivered to your door")}
              </p>
            </div>
          </div>

          {/* Quick search input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={b("এই ক্যাটাগরিতে খুঁজুন...", "Search in this category...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-muted animate-pulse border" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center max-w-lg mx-auto">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="text-lg font-semibold text-foreground">
              {searchQuery ? b("কোনো পণ্য খুঁজে পাওয়া যায়নি", "No matching products found") : b("শীঘ্রই নতুন পণ্য যুক্ত হচ্ছে", "Products coming soon")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {searchQuery
                ? b("অন্য কোনো নাম দিয়ে চেষ্টা করুন।", "Try searching with a different keyword.")
                : b("আমাদের ক্যাটালগে হাজারো ওষুধ রয়েছে, আপনি সরাসরি সার্চ করে নিতে পারেন।", "You can search from our catalog of medicines directly.")}
            </p>
            <Link to="/search">
              <Button variant="default" className="gap-2">
                <Search className="h-4 w-4" />
                {b("সব ওষুধ খুঁজুন", "Search All Medicines")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map((p: any) => {
              const to = `/product/${p.slug || p.id}`;
              const discount =
                p.original_price && p.original_price > p.price
                  ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
                  : 0;

              return (
                <div
                  key={p.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-xs hover:shadow-lg hover:border-primary/50 transition-all duration-300"
                >
                  <Link to={to} className="block overflow-hidden">
                    <div className="relative aspect-square bg-muted/40 overflow-hidden flex items-center justify-center">
                      <img
                        src={p.image_url || "/placeholder.svg"}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.endsWith("/placeholder.svg")) {
                            target.src = "/placeholder.svg";
                          }
                        }}
                      />
                      {discount > 0 && (
                        <Badge className="absolute left-2 top-2 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5">
                          -{discount}%
                        </Badge>
                      )}
                    </div>

                    <div className="p-3">
                      <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors min-h-[2.5rem]">
                        {p.name}
                      </h3>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-base font-bold text-primary">
                          {selectedCurrency?.symbol}{convertPrice(p.price)}
                        </span>
                        {p.price_unit && (
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {p.price_unit}
                          </span>
                        )}
                        {p.original_price && p.original_price > p.price && (
                          <span className="text-xs text-muted-foreground line-through">
                            {selectedCurrency?.symbol}{convertPrice(p.original_price)}
                          </span>
                        )}
                      </div>
                      {p.rating > 0 && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>{p.rating}</span>
                          {p.sold_count > 0 && <span>· {p.sold_count} বিক্রি</span>}
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-2 pt-0 grid grid-cols-2 gap-1.5 mt-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs px-2 gap-1"
                      onClick={(e) => handleAddToCart(e, p)}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {b("কার্ট", "Cart")}
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 text-xs px-2 gap-1"
                      onClick={(e) => handleBuyNow(e, p)}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {b("কিনুন", "Buy")}
                    </Button>
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

export default LeftMenuItemPage;
