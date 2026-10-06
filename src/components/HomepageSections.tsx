import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Star, ShoppingCart, Zap, BadgeCheck } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { isEffectivePreorder } from "@/lib/preorder";
import { toast } from "sonner";
import ScrollReveal from "@/components/ScrollReveal";
import BannerCarousel from "@/components/BannerCarousel";
import { useLanguage } from "@/contexts/LanguageContext";

// Desktop: 5 cols × 2 rows = 10, Mobile: 2 cols × 3 rows = 6
const DESKTOP_LIMIT = 10;
const MOBILE_LIMIT = 6;

const HomepageSections = () => {
  const { convertPrice, current: selectedCurrency } = useCurrency();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { b, formatNumber } = useLanguage();

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("homepage_sections")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const { data: sectionProducts = {} } = useQuery({
    queryKey: ["homepage-section-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_section_products")
        .select(
          "*, products(id, name, slug, image_url, price, price_unit, original_price, rating, sold_count, is_qmall_verified, stock, is_preorder, preorder_count)"
        )
        .order("sort_order", { ascending: true });
      const grouped: Record<string, any[]> = {};
      (data || []).forEach((sp: any) => {
        if (sp.products) {
          if (!grouped[sp.section_id]) grouped[sp.section_id] = [];
          grouped[sp.section_id].push(sp);
        }
      });
      return grouped;
    },
  });

  const { data: sectionBanners = {} } = useQuery({
    queryKey: ["section-banners"],
    queryFn: async () => {
      const { data } = await (supabase
        .from("section_banners" as any)
        .select("*")
        .eq("is_active", true) as any);
      const grouped: Record<string, any[]> = {};
      (data || []).forEach((b: any) => {
        if (!grouped[b.after_section_id]) grouped[b.after_section_id] = [];
        grouped[b.after_section_id].push(b);
      });
      return grouped;
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 space-y-8">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              {[1, 2, 3, 4, 5].map((j) => <Skeleton key={j} className="h-64 rounded-lg" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sections.length === 0) return null;

  return (
    <>
      {sections.map((sec: any) => {
        const allProducts = (sectionProducts[sec.id] || [])
          .sort((a: any, b: any) => {
            const aO = a.sort_order || 0;
            const bO = b.sort_order || 0;
            if (aO > 0 && bO > 0) return aO - bO;
            if (aO > 0) return -1;
            if (bO > 0) return 1;
            return 0;
          })
          .map((sp: any) => sp.products);

        const limit = isMobile ? MOBILE_LIMIT : DESKTOP_LIMIT;
        const visibleProducts = allProducts.slice(0, limit);

        return (
          <ScrollReveal key={sec.id}>
            <section className="container mx-auto px-4 py-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {sec.icon && <span className="text-xl md:text-2xl">{sec.icon}</span>}
                    <h2 className="text-xl font-bold text-foreground md:text-2xl">{sec.title}</h2>
                  </div>
                  {sec.subtitle && <p className="text-sm text-muted-foreground">{sec.subtitle}</p>}
                </div>
                <Link to={`/section/${sec.id}`}>
                  <Button variant="outline" size="sm" className="gap-1">
                    {b("সব দেখুন", "See All")} <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div
                className={
                  sec.section_type === "carousel"
                    ? "flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                    : "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                }
              >
                {visibleProducts.map((p: any) => {
                  const discount =
                    p.original_price && p.original_price > p.price
                      ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
                      : 0;
                  return (
                    <div
                      key={p.id}
                      className={`group relative flex flex-col overflow-hidden rounded-xl border-2 border-primary bg-card transition hover:shadow-md animate-float ${
                        sec.section_type === "carousel" ? "w-44 flex-shrink-0 md:w-52" : ""
                      }`}
                    >
                      <Link to={`/product/${p.slug || p.id}`}>
                        <div className="relative aspect-square overflow-hidden bg-muted">
                          <img
                            src={p.image_url || "/placeholder.svg"}
                            alt={p.name}
                            className={`h-full w-full object-cover transition-transform group-hover:scale-105 ${
                              p.stock <= 0 && !isEffectivePreorder(p) ? "opacity-50 grayscale" : ""
                            }`}
                            loading="lazy"
                          />
                          {discount > 0 && (
                            <Badge className="absolute left-1.5 top-1.5 bg-destructive text-destructive-foreground text-[10px] px-1.5">
                              -{discount}%
                            </Badge>
                          )}
                          {isEffectivePreorder(p) && (
                            <div className="absolute top-1 right-1">
                              <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground shadow">
                                {b("অগ্রিম অর্ডার", "Pre-Order")}
                              </span>
                            </div>
                          )}
                          {p.stock <= 0 && !isEffectivePreorder(p) && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="bg-destructive text-destructive-foreground text-[10px] font-bold px-4 py-0.5 rotate-[-35deg] shadow-lg">
                                {b("স্টক শেষ", "Out of Stock")}
                              </div>
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="flex flex-1 flex-col justify-between p-2.5">
                        <Link to={`/product/${p.slug || p.id}`}>
                          <h3 className="line-clamp-3 text-xs font-medium text-foreground md:text-sm min-h-[3.5rem]">
                            {p.name}
                          </h3>
                          <div className="mt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-primary">
                                {selectedCurrency?.symbol}{convertPrice(p.price)}
                              </span>
                              {p.price_unit && (
                                <span className="rounded bg-accent px-1 py-0.5 text-[9px] font-semibold text-accent-foreground">
                                  {p.price_unit}
                                </span>
                              )}
                              {p.original_price && p.original_price > p.price && (
                                <span className="text-xs text-muted-foreground line-through">
                                  {selectedCurrency?.symbol}{convertPrice(p.original_price)}
                                </span>
                              )}
                            </div>
                            {p.is_qmall_verified && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20" />
                                <span className="text-[9px] font-semibold text-primary">
                                  {b("এসকেপি ভেরিফাইড", "Verified by SKP")}
                                </span>
                              </div>
                            )}
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="h-3 w-3 fill-primary text-primary" />
                              <span>{p.rating ?? 0}</span>
                              {p.sold_count > 0 && (
                                <span>· {formatNumber(p.sold_count)} {b("বিক্রি হয়েছে", "sold")}</span>
                              )}
                            </div>
                          </div>
                        </Link>
                        <div className="mt-2 flex gap-1">
                          {isEffectivePreorder(p) ? (
                            <Button
                              size="sm"
                              className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={(e) => {
                                e.stopPropagation();
                                addItem({ id: p.id, name: p.name, price: p.price, image_url: p.image_url });
                                toast.success(b("Pre-Order সফল হয়েছে!", "Pre-Order added successfully!"));
                              }}
                            >
                              <ShoppingCart className="h-3 w-3 shrink-0" />{" "}
                              <span className="truncate">{b("অগ্রিম অর্ডার", "Pre-Order")}</span>
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addItem({ id: p.id, name: p.name, price: p.price, image_url: p.image_url });
                                  toast.success(b("কার্টে যোগ হয়েছে!", "Added to Cart!"));
                                }}
                              >
                                <ShoppingCart className="h-3 w-3 shrink-0" />{" "}
                                <span className="truncate">{b("কার্ট", "Cart")}</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full border-2 border-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addItem({ id: p.id, name: p.name, price: p.price, image_url: p.image_url });
                                  navigate("/checkout");
                                }}
                              >
                                <Zap className="h-3 w-3 shrink-0" />{" "}
                                <span className="truncate">{b("কিনুন", "Buy")}</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Banners after this section */}
              {(sectionBanners[sec.id] || []).length > 0 && (
                <div className="mt-6 w-full">
                  <BannerCarousel banners={sectionBanners[sec.id]} />
                </div>
              )}
            </section>
          </ScrollReveal>
        );
      })}
    </>
  );
};

export default HomepageSections;
