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

// Map deprecated/duplicate brand IDs to real brand IDs with active products
const DUPLICATE_BRAND_REDIRECTS: Record<string, string> = {
  "3936e4c6-df34-443e-ae41-3d34a63b5866": "1b028d29-e3e1-4c1c-8317-66c459a24214", // SQUARE -> Square Pharmaceuticals PLC
  "66a050ea-d952-40a3-a68f-20f9b79e9444": "dad52299-a1ae-4de4-ac43-c26e713ae598", // Incepta Pharmacuticals Ltd.
  "0e1b5b60-0146-41ab-bd68-2cd05b56213d": "154261be-cba3-438a-8ba2-7c3cdee6b0fa", // Aristophrma Ltd.
  "0970ecb0-f6e4-42f8-bbe1-5417403ea077": "a26fc38a-98ab-4639-8160-0012ccdd5ccd", // Renata Pharmacuticals Ltd.
  "1e430944-12ac-46e5-9232-3f97f66e0b1d": "a3a57132-1c7e-430b-b61a-4cd4f3f5411c", // ACI Pharmacuticals Ltd.
  "7f32f9a2-8c70-46c8-a997-901c9a8dd84a": "ee0630bc-f5bc-468b-a013-04dc688c04c8", // Genarel Pharmaceuticals Ltd.
  "49acd704-eb29-48ac-ac61-1244e9a0a5c9": "dcb26393-28a2-4a5a-a8d7-9a09d7a6cb5f", // Opsonin Pharma Limited
  "a738118e-d4bf-4397-9b97-0507b7ea5ed0": "cf1ea801-a166-46a6-bfc3-519d1059eb45", // Navana Pharmacuticals Ltd.
  "7fc19220-f667-455a-ab4d-cf3009d03d2f": "ddbd2d3b-5b59-43f7-ac66-f879cd31d4fc", // Popular Pharmacuticals Ltd.
  "a4b2ebef-e094-4a19-9655-9b892d277382": "ddbd2d3b-5b59-43f7-ac66-f879cd31d4fc", // Popular Pharmaceuticals PLC
  "21db0eec-906a-4058-bb3d-e1b8bc36c97c": "c5eadf80-bf4a-4ce9-a5a1-2b2ead61e496", // SK+F Pharmacuticals Ltd.
  "b8bfda0c-cae3-44fe-ab6f-926e8fb997c9": "e20f2129-b3e6-432e-8659-94416109420c", // Beacon Pharmaceuticals Plc.
  "d1a3a700-82aa-4bb6-ad82-60073749a712": "e9117c9c-d9ec-493f-bd46-93dd567a2583", // Radiant Pharmaceuticals Limited
  "062c294e-f748-4c9f-acf6-8194e2328722": "3b3aff37-860c-4de5-b94a-0096e9c7c116", // The Ibn Sina Pharmaceutical Ltd.
  "3a19d60c-4d2a-404c-b2b7-52c41e5ef7fe": "c6401011-a0ad-4521-9ee2-68ca53a06750", // SMC Wellness
  "0afb0adb-dc86-4830-bfba-147350835ba4": "67a0bf9e-ff79-4dec-94c9-a276565506c5", // Delta Pharma Limited.
  "c44e977a-a4d9-4ee9-8fa0-68774f8187cf": "67a0bf9e-ff79-4dec-94c9-a276565506c5", // Delta Pharma PLC.
  "e2230373-f24e-4d85-a11f-78c75fde86d6": "8b2f72fb-d210-4bf7-8b3a-b4e8e2d90708", // OSL Pharma Limited.
  "5a3faa25-21d8-4c03-bf06-7cd021f27f80": "0ddcbb92-40d6-4022-b1d8-063f0e6aad92", // Jayson Pharmaceuticals Ltd.
  "4f3d7ee8-0376-4941-b2d4-179057b20fef": "dfc62a9b-97b1-4008-ab96-667344075a6b", // Labaid Pharmacuticals Ltd.
  "dc791a54-70b3-493d-a3f0-9990271adb6b": "d1788eb9-f7d1-440e-9e42-e775a7df2973", // Sun Pharmacutical Ltd.
  "7457b54e-d475-4b45-8eb0-81e71b629b00": "5ad4fb78-bd13-468f-a1f3-bba170685bff", // Unimed Uniheath Pharmaceuticals Ltd.
  "1b99aaf8-da57-4321-bdea-ec444c0c5f92": "3c9d87b0-81c1-46de-9891-3ad334e6970e", // Nipro Jmi Pharma Limited.
  "ac1d5c02-fd80-49ab-bf88-cd09fa4c4460": "7213c050-758b-4f6a-a0fa-9351c7c3e46f", // Hamdard Laboratories.
  "5c4ac41c-1d7d-49c5-b559-16ea315f35d4": "f2755b46-cef1-44f0-95ea-3b1f5567acb8", // Getwell
};

const BrandPage = () => {
  const { id } = useParams<{ id: string }>();
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const effectiveId = (id && DUPLICATE_BRAND_REDIRECTS[id]) || id;

  // Immediate redirect for known duplicate IDs
  if (id && DUPLICATE_BRAND_REDIRECTS[id]) {
    navigate(`/brand/${DUPLICATE_BRAND_REDIRECTS[id]}`, { replace: true });
  }

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

  const { data: brand } = useQuery({
    queryKey: ["brand", effectiveId],
    queryFn: async () => {
      const { data } = await supabase.from("brands").select("*").eq("id", effectiveId!).single();
      return data;
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["brand-products", effectiveId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("brand_id", effectiveId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Dynamic fallback: if a brand has 0 products, try finding active brand with matching name root
  const { data: fallbackBrandId } = useQuery({
    queryKey: ["brand-fallback", brand?.name],
    enabled: Boolean(brand && products.length === 0 && !isLoading),
    queryFn: async () => {
      if (!brand?.name) return null;
      const firstWord = brand.name.replace(/[^a-zA-Z0-9]/g, " ").trim().split(" ")[0];
      if (!firstWord || firstWord.length < 3) return null;
      const { data } = await supabase
        .from("brands")
        .select("id")
        .ilike("name", `%${firstWord}%`)
        .eq("is_active", true)
        .neq("id", effectiveId!)
        .limit(1);
      return data?.[0]?.id || null;
    },
  });

  if (fallbackBrandId && fallbackBrandId !== effectiveId) {
    navigate(`/brand/${fallbackBrandId}`, { replace: true });
  }

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
