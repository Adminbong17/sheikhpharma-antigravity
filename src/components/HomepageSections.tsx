import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
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

export const DEFAULT_HOMEPAGE_SECTIONS = [
  {
    id: "sec-popular",
    title: "জনপ্রিয় ও প্রয়োজনীয় ওষুধ",
    subtitle: "দৈনন্দিন স্বাস্থ্য সুরক্ষায় বিশ্বস্ত ব্র্যান্ডের আসল মেডিসিন",
    icon: "💊",
    section_type: "grid",
    sort_order: 1,
    is_active: true,
  },
  {
    id: "sec-gastric",
    title: "গ্যাস্ট্রিক ও এসিডিটি কেয়ার",
    subtitle: "গ্যাস্ট্রিক ও বুক জ্বালাপোড়ায় দ্রুত স্বস্তিদায়ক ওষুধসমূহ",
    icon: "🩺",
    section_type: "grid",
    sort_order: 2,
    is_active: true,
  },
];

export const DEFAULT_SECTION_PRODUCTS: Record<string, any[]> = {
  "sec-popular": [
    {
      section_id: "sec-popular",
      product_id: "prod-1",
      sort_order: 1,
      products: {
        id: "prod-1",
        name: "Tab Napa 500 mg (Paracetamol)",
        slug: "tab-napa-500-mg",
        image_url: "/placeholder.svg",
        price: 1.2,
        price_unit: "প্রতি পিস",
        original_price: 1.5,
        rating: 4.9,
        sold_count: 2450,
        is_qmall_verified: true,
        stock: 500,
        is_preorder: false,
        preorder_count: 0,
      },
    },
    {
      section_id: "sec-popular",
      product_id: "prod-2",
      sort_order: 2,
      products: {
        id: "prod-2",
        name: "Tab Napa Extra (Paracetamol + Caffeine)",
        slug: "tab-napa-extra",
        image_url: "/placeholder.svg",
        price: 3.0,
        price_unit: "প্রতি পিস",
        original_price: 3.5,
        rating: 4.9,
        sold_count: 1890,
        is_qmall_verified: true,
        stock: 350,
        is_preorder: false,
        preorder_count: 0,
      },
    },
    {
      section_id: "sec-popular",
      product_id: "prod-3",
      sort_order: 3,
      products: {
        id: "prod-3",
        name: "Cap Seclo 20 mg (Omeprazole)",
        slug: "cap-seclo-20-mg",
        image_url: "/placeholder.svg",
        price: 7.0,
        price_unit: "প্রতি পিস",
        original_price: 8.0,
        rating: 4.8,
        sold_count: 3200,
        is_qmall_verified: true,
        stock: 600,
        is_preorder: false,
        preorder_count: 0,
      },
    },
    {
      section_id: "sec-popular",
      product_id: "prod-4",
      sort_order: 4,
      products: {
        id: "prod-4",
        name: "Cap Sergel 20 mg (Esomeprazole)",
        slug: "cap-sergel-20-mg",
        image_url: "/placeholder.svg",
        price: 7.0,
        price_unit: "প্রতি পিস",
        original_price: 8.0,
        rating: 4.9,
        sold_count: 2750,
        is_qmall_verified: true,
        stock: 450,
        is_preorder: false,
        preorder_count: 0,
      },
    },
    {
      section_id: "sec-popular",
      product_id: "prod-5",
      sort_order: 5,
      products: {
        id: "prod-5",
        name: "Tab Ceevit 250 mg (Vitamin C)",
        slug: "tab-ceevit-250-mg",
        image_url: "/placeholder.svg",
        price: 2.5,
        price_unit: "প্রতি পিস",
        original_price: 3.0,
        rating: 4.8,
        sold_count: 1540,
        is_qmall_verified: true,
        stock: 400,
        is_preorder: false,
        preorder_count: 0,
      },
    },
    {
      section_id: "sec-popular",
      product_id: "prod-6",
      sort_order: 6,
      products: {
        id: "prod-6",
        name: "Tab Alatrol 10 mg (Cetirizine)",
        slug: "tab-alatrol-10-mg",
        image_url: "/placeholder.svg",
        price: 3.5,
        price_unit: "প্রতি পিস",
        original_price: 4.0,
        rating: 4.7,
        sold_count: 1220,
        is_qmall_verified: true,
        stock: 300,
        is_preorder: false,
        preorder_count: 0,
      },
    },
    {
      section_id: "sec-popular",
      product_id: "prod-7",
      sort_order: 7,
      products: {
        id: "prod-7",
        name: "Tab Calbo D (Calcium + Vit D3)",
        slug: "tab-calbo-d",
        image_url: "/placeholder.svg",
        price: 8.0,
        price_unit: "প্রতি পিস",
        original_price: 9.0,
        rating: 4.9,
        sold_count: 980,
        is_qmall_verified: true,
        stock: 250,
        is_preorder: false,
        preorder_count: 0,
      },
    },
    {
      section_id: "sec-popular",
      product_id: "prod-8",
      sort_order: 8,
      products: {
        id: "prod-8",
        name: "Tab Fexo 120 mg (Fexofenadine)",
        slug: "tab-fexo-120-mg",
        image_url: "/placeholder.svg",
        price: 9.0,
        price_unit: "প্রতি পিস",
        original_price: 10.0,
        rating: 4.8,
        sold_count: 850,
        is_qmall_verified: true,
        stock: 200,
        is_preorder: false,
        preorder_count: 0,
      },
    },
    {
      section_id: "sec-popular",
      product_id: "prod-9",
      sort_order: 9,
      products: {
        id: "prod-9",
        name: "Tab Ace 500 mg (Paracetamol)",
        slug: "tab-ace-500-mg",
        image_url: "/placeholder.svg",
        price: 1.2,
        price_unit: "প্রতি পিস",
        original_price: 1.5,
        rating: 4.7,
        sold_count: 1600,
        is_qmall_verified: true,
        stock: 450,
        is_preorder: false,
        preorder_count: 0,
      },
    },
    {
      section_id: "sec-popular",
      product_id: "prod-10",
      sort_order: 10,
      products: {
        id: "prod-10",
        name: "Tab Monas 10 mg (Montelukast)",
        slug: "tab-monas-10-mg",
        image_url: "/placeholder.svg",
        price: 16.0,
        price_unit: "প্রতি পিস",
        original_price: 18.0,
        rating: 4.9,
        sold_count: 730,
        is_qmall_verified: true,
        stock: 180,
        is_preorder: false,
        preorder_count: 0,
      },
    },
  ],
  "sec-gastric": [
    {
      section_id: "sec-gastric",
      product_id: "prod-3",
      sort_order: 1,
      products: {
        id: "prod-3",
        name: "Cap Seclo 20 mg (Omeprazole)",
        slug: "cap-seclo-20-mg",
        image_url: "/placeholder.svg",
        price: 7.0,
        price_unit: "প্রতি পিস",
        original_price: 8.0,
        rating: 4.8,
        sold_count: 3200,
        is_qmall_verified: true,
        stock: 600,
        is_preorder: false,
        preorder_count: 0,
      },
    },
    {
      section_id: "sec-gastric",
      product_id: "prod-4",
      sort_order: 2,
      products: {
        id: "prod-4",
        name: "Cap Sergel 20 mg (Esomeprazole)",
        slug: "cap-sergel-20-mg",
        image_url: "/placeholder.svg",
        price: 7.0,
        price_unit: "প্রতি পিস",
        original_price: 8.0,
        rating: 4.9,
        sold_count: 2750,
        is_qmall_verified: true,
        stock: 450,
        is_preorder: false,
        preorder_count: 0,
      },
    },
    {
      section_id: "sec-gastric",
      product_id: "prod-11",
      sort_order: 3,
      products: {
        id: "prod-11",
        name: "Cap Losectil 20 mg (Omeprazole)",
        slug: "cap-losectil-20-mg",
        image_url: "/placeholder.svg",
        price: 7.0,
        price_unit: "প্রতি পিস",
        original_price: 8.0,
        rating: 4.8,
        sold_count: 1400,
        is_qmall_verified: true,
        stock: 300,
        is_preorder: false,
        preorder_count: 0,
      },
    },
    {
      section_id: "sec-gastric",
      product_id: "prod-12",
      sort_order: 4,
      products: {
        id: "prod-12",
        name: "Tab Maxpro 20 mg (Esomeprazole)",
        slug: "tab-maxpro-20-mg",
        image_url: "/placeholder.svg",
        price: 7.0,
        price_unit: "প্রতি পিস",
        original_price: 8.0,
        rating: 4.9,
        sold_count: 1980,
        is_qmall_verified: true,
        stock: 350,
        is_preorder: false,
        preorder_count: 0,
      },
    },
    {
      section_id: "sec-gastric",
      product_id: "prod-13",
      sort_order: 5,
      products: {
        id: "prod-13",
        name: "Susp Entacyd Plus (Antacid + Simethicone)",
        slug: "susp-entacyd-plus",
        image_url: "/placeholder.svg",
        price: 85.0,
        price_unit: "প্রতি বোতল",
        original_price: 90.0,
        rating: 4.7,
        sold_count: 650,
        is_qmall_verified: true,
        stock: 120,
        is_preorder: false,
        preorder_count: 0,
      },
    },
  ],
};

const SECTIONS_STORAGE_KEY = "sheikhpharma_sections";
const SECTION_PRODUCTS_STORAGE_KEY = "sheikhpharma_section_products";

const getStoredSections = () => {
  if (typeof window === "undefined") return DEFAULT_HOMEPAGE_SECTIONS;
  try {
    const raw = localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_HOMEPAGE_SECTIONS;
};

const getStoredSectionProducts = () => {
  if (typeof window === "undefined") return DEFAULT_SECTION_PRODUCTS;
  try {
    const raw = localStorage.getItem(SECTION_PRODUCTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_SECTION_PRODUCTS;
};

const HomepageSections = () => {
  const { convertPrice, current: selectedCurrency } = useCurrency();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { b, formatNumber } = useLanguage();

  const { data: sections = DEFAULT_HOMEPAGE_SECTIONS } = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("homepage_sections")
          .select("id, title, subtitle, icon, section_type, sort_order, is_active")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error || !data || data.length === 0) {
          return getStoredSections();
        }

        try {
          localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(data));
        } catch {}
        return data;
      } catch {
        return getStoredSections();
      }
    },
    initialData: getStoredSections,
    staleTime: 1000 * 60 * 15,
  });

  const { data: sectionProducts = DEFAULT_SECTION_PRODUCTS } = useQuery({
    queryKey: ["homepage-section-products"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("homepage_section_products")
          .select(
            "section_id, product_id, sort_order, products(id, name, slug, image_url, price, price_unit, original_price, rating, sold_count, is_qmall_verified, stock, is_preorder, preorder_count)"
          )
          .order("sort_order", { ascending: true });

        if (error || !data || data.length === 0) {
          return getStoredSectionProducts();
        }

        const grouped: Record<string, any[]> = {};
        data.forEach((sp: any) => {
          if (sp.products) {
            if (!grouped[sp.section_id]) grouped[sp.section_id] = [];
            grouped[sp.section_id].push(sp);
          }
        });

        if (Object.keys(grouped).length > 0) {
          try {
            localStorage.setItem(SECTION_PRODUCTS_STORAGE_KEY, JSON.stringify(grouped));
          } catch {}
          return grouped;
        }

        return getStoredSectionProducts();
      } catch {
        return getStoredSectionProducts();
      }
    },
    initialData: getStoredSectionProducts,
    staleTime: 1000 * 60 * 15,
  });

  const { data: sectionBanners = {} } = useQuery({
    queryKey: ["section-banners"],
    queryFn: async () => {
      try {
        const { data } = await (supabase
          .from("section_banners" as any)
          .select("id, image_url, link_url, after_section_id, is_active")
          .eq("is_active", true) as any);
        const grouped: Record<string, any[]> = {};
        (data || []).forEach((b: any) => {
          if (!grouped[b.after_section_id]) grouped[b.after_section_id] = [];
          grouped[b.after_section_id].push(b);
        });
        return grouped;
      } catch {
        return {};
      }
    },
    staleTime: 1000 * 60 * 15,
  });

  if (sections.length === 0) return null;

  return (
    <>
      {sections.map((sec: any) => {
        const rawList = sectionProducts[sec.id] || DEFAULT_SECTION_PRODUCTS[sec.id] || [];
        const allProducts = rawList
          .sort((a: any, b: any) => {
            const aO = a.sort_order || 0;
            const bO = b.sort_order || 0;
            if (aO > 0 && bO > 0) return aO - bO;
            if (aO > 0) return -1;
            if (bO > 0) return 1;
            return 0;
          })
          .map((sp: any) => sp.products)
          .filter(Boolean);

        if (allProducts.length === 0) return null;

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
                      className={`group relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card transition hover:shadow-lg hover:border-primary/50 ${
                        sec.section_type === "carousel" ? "w-44 flex-shrink-0 md:w-52" : ""
                      }`}
                    >
                      <Link to={`/product/${p.slug || p.id}`}>
                        <div className="relative aspect-square overflow-hidden bg-muted/40">
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
                          <h3 className="line-clamp-2 text-xs font-semibold text-foreground md:text-sm min-h-[2.5rem] group-hover:text-primary transition-colors">
                            {p.name}
                          </h3>
                          <div className="mt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-primary">
                                {selectedCurrency?.symbol}{convertPrice(p.price)}
                              </span>
                              {p.price_unit && (
                                <span className="rounded bg-accent/20 px-1 py-0.5 text-[9px] font-semibold text-accent-foreground">
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
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
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
                                className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
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
                                className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
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
