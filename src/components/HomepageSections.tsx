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
    "id": "1d47c070-33b9-46c4-8151-562509649ed2",
    "title": "OTC Medicine",
    "subtitle": "",
    "icon": null,
    "section_type": "grid",
    "sort_order": 1,
    "is_active": true
  },
  {
    "id": "51b4d5a5-d8e4-4168-b48f-c85fac371b61",
    "title": "PPI",
    "subtitle": "",
    "icon": null,
    "section_type": "grid",
    "sort_order": 2,
    "is_active": true
  }
];

export const DEFAULT_SECTION_PRODUCTS: Record<string, any[]> = {
  "1d47c070-33b9-46c4-8151-562509649ed2": [
    {
      "section_id": "1d47c070-33b9-46c4-8151-562509649ed2",
      "product_id": "de9ab40b-05fa-4347-92b8-ef87839a294c",
      "sort_order": 1,
      "products": {
        "id": "de9ab40b-05fa-4347-92b8-ef87839a294c",
        "name": "3 Bion 100 mg+200 mg+200 mcg tablets",
        "slug": "3-bion-100-mg200-mg200-mcg-tablets",
        "price": 120,
        "stock": 99,
        "rating": 0,
        "image_url": "https://api.bongbangla.top/vault-api/share.php?t=c5ae4267d5c201b0027c7300fcf243da",
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 12,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "1d47c070-33b9-46c4-8151-562509649ed2",
      "product_id": "1ca6a63f-71cd-4f31-b249-996affea5237",
      "sort_order": 2,
      "products": {
        "id": "1ca6a63f-71cd-4f31-b249-996affea5237",
        "name": "3-C 100 mg/5 ml powder for suspension",
        "slug": "3-c-100-mg5-ml-powder-for-suspension",
        "price": 195,
        "stock": 99,
        "rating": 0,
        "image_url": null,
        "price_unit": "per bottle (1 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": null,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "1d47c070-33b9-46c4-8151-562509649ed2",
      "product_id": "9d9d25da-24e0-4055-9a6d-0c143b3f1048",
      "sort_order": 3,
      "products": {
        "id": "9d9d25da-24e0-4055-9a6d-0c143b3f1048",
        "name": "3-C 200 mg capsules",
        "slug": "3-c-200-mg-capsules",
        "price": 35,
        "stock": 99,
        "rating": 0,
        "image_url": null,
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 35,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "1d47c070-33b9-46c4-8151-562509649ed2",
      "product_id": "fa460d2b-b74d-4bf4-99ca-95b83a473e76",
      "sort_order": 4,
      "products": {
        "id": "fa460d2b-b74d-4bf4-99ca-95b83a473e76",
        "name": "3-C 400 mg capsules",
        "slug": "3-c-400-mg-capsules",
        "price": 48,
        "stock": 99,
        "rating": 0,
        "image_url": null,
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 48,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "1d47c070-33b9-46c4-8151-562509649ed2",
      "product_id": "f0c909fa-e0e5-4ca8-b676-2ff4ff0b94d3",
      "sort_order": 5,
      "products": {
        "id": "f0c909fa-e0e5-4ca8-b676-2ff4ff0b94d3",
        "name": "3-F 500 mg tablets",
        "slug": "3-f-500-mg-tablets",
        "price": 14,
        "stock": 99,
        "rating": 0,
        "image_url": null,
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 14,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "1d47c070-33b9-46c4-8151-562509649ed2",
      "product_id": "2ecc7db7-c551-4229-b997-9e2a7aa26bec",
      "sort_order": 6,
      "products": {
        "id": "2ecc7db7-c551-4229-b997-9e2a7aa26bec",
        "name": "3-Geocef 100 mg/5 ml powder for suspension",
        "slug": "3-geocef-100-mg5-ml-powder-for-suspension",
        "price": 175,
        "stock": 99,
        "rating": 0,
        "image_url": null,
        "price_unit": "per bottle (1 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": null,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "1d47c070-33b9-46c4-8151-562509649ed2",
      "product_id": "942f32f9-f64c-4686-bf49-fc380f6dab0f",
      "sort_order": 7,
      "products": {
        "id": "942f32f9-f64c-4686-bf49-fc380f6dab0f",
        "name": "3-Geocef 200 mg capsules",
        "slug": "3-geocef-200-mg-capsules",
        "price": 30,
        "stock": 99,
        "rating": 0,
        "image_url": null,
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 30,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "1d47c070-33b9-46c4-8151-562509649ed2",
      "product_id": "e7b308f1-be22-455b-8883-8d65204eb27b",
      "sort_order": 8,
      "products": {
        "id": "e7b308f1-be22-455b-8883-8d65204eb27b",
        "name": "3D 2000 IU tablets",
        "slug": "3d-2000-iu-tablets",
        "price": 25,
        "stock": 99,
        "rating": 0,
        "image_url": "https://api.bongbangla.top/vault-api/share.php?t=0b87225c27603a13ba36fbabd6e795e3",
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 2.5,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "1d47c070-33b9-46c4-8151-562509649ed2",
      "product_id": "a4764afd-012f-4aad-84f4-9b48d667f151",
      "sort_order": 9,
      "products": {
        "id": "a4764afd-012f-4aad-84f4-9b48d667f151",
        "name": "3D 20000 IU capsules",
        "slug": "3d-20000-iu-capsules",
        "price": 200,
        "stock": 100,
        "rating": 0,
        "image_url": "https://api.bongbangla.top/vault-api/share.php?t=8645f129b07f9b5172b91fe7d0303ed8",
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 20,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "1d47c070-33b9-46c4-8151-562509649ed2",
      "product_id": "7c60e026-e1ce-4334-af86-5c36e607fa03",
      "sort_order": 10,
      "products": {
        "id": "7c60e026-e1ce-4334-af86-5c36e607fa03",
        "name": "3D 40000 IU capsules",
        "slug": "3d-40000-iu-capsules",
        "price": 210,
        "stock": 100,
        "rating": 0,
        "image_url": "https://api.bongbangla.top/vault-api/share.php?t=4ddae60028dfdff64262ad50c0c18d04",
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 35,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    }
  ],
  "51b4d5a5-d8e4-4168-b48f-c85fac371b61": [
    {
      "section_id": "51b4d5a5-d8e4-4168-b48f-c85fac371b61",
      "product_id": "c8d71890-db64-4e3b-93ec-02d6a4121756",
      "sort_order": 1,
      "products": {
        "id": "c8d71890-db64-4e3b-93ec-02d6a4121756",
        "name": "Acifix 20 mg capsules (Enteric Coated)",
        "slug": "acifix-20-mg-capsules-enteric-coated",
        "price": 80,
        "stock": 100,
        "rating": 0,
        "image_url": null,
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 8,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "51b4d5a5-d8e4-4168-b48f-c85fac371b61",
      "product_id": "cbfd522e-c95c-4de9-bee6-2497fdbbfac6",
      "sort_order": 2,
      "products": {
        "id": "cbfd522e-c95c-4de9-bee6-2497fdbbfac6",
        "name": "Acifix 20 mg tablets (Enteric Coated)",
        "slug": "acifix-20-mg-tablets-enteric-coated",
        "price": 70,
        "stock": 100,
        "rating": 0,
        "image_url": null,
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 7,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "51b4d5a5-d8e4-4168-b48f-c85fac371b61",
      "product_id": "b8edd24d-ce1d-4ba8-8f08-3e35a8c462ae",
      "sort_order": 3,
      "products": {
        "id": "b8edd24d-ce1d-4ba8-8f08-3e35a8c462ae",
        "name": "Acipra 20 mg capsules (Enteric Coated)",
        "slug": "acipra-20-mg-capsules-enteric-coated",
        "price": 70,
        "stock": 100,
        "rating": 0,
        "image_url": null,
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 7,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "51b4d5a5-d8e4-4168-b48f-c85fac371b61",
      "product_id": "86a1cee7-1719-490d-9025-8b6827760ee8",
      "sort_order": 4,
      "products": {
        "id": "86a1cee7-1719-490d-9025-8b6827760ee8",
        "name": "Alton 20 mg tablets (Enteric Coated)",
        "slug": "alton-20-mg-tablets-enteric-coated",
        "price": 70,
        "stock": 100,
        "rating": 0,
        "image_url": null,
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 7,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "51b4d5a5-d8e4-4168-b48f-c85fac371b61",
      "product_id": "8fde4ca6-9a39-4f54-9bc3-24744cd1ff5c",
      "sort_order": 5,
      "products": {
        "id": "8fde4ca6-9a39-4f54-9bc3-24744cd1ff5c",
        "name": "Alton 40 mg tablets (Enteric Coated)",
        "slug": "alton-40-mg-tablets-enteric-coated",
        "price": 80.3,
        "stock": 100,
        "rating": 0,
        "image_url": null,
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 8.03,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "51b4d5a5-d8e4-4168-b48f-c85fac371b61",
      "product_id": "9b9f002e-bc25-440b-970d-659c1db4347a",
      "sort_order": 6,
      "products": {
        "id": "9b9f002e-bc25-440b-970d-659c1db4347a",
        "name": "Alton 40 mg/vial iv injection",
        "slug": "alton-40-mgvial-iv-injection",
        "price": 100,
        "stock": 100,
        "rating": 0,
        "image_url": null,
        "price_unit": "per vial (1 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": null,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "51b4d5a5-d8e4-4168-b48f-c85fac371b61",
      "product_id": "d0a1ea17-b40e-475e-9611-baf570083f34",
      "sort_order": 7,
      "products": {
        "id": "d0a1ea17-b40e-475e-9611-baf570083f34",
        "name": "Anaflex Max 375 mg+20 mg tablets (Delayed Release)",
        "slug": "anaflex-max-375-mg20-mg-tablets-delayed-release",
        "price": 170,
        "stock": 100,
        "rating": 0,
        "image_url": null,
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 17,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "51b4d5a5-d8e4-4168-b48f-c85fac371b61",
      "product_id": "9bc583f9-8ea4-41f9-9df6-64bfbc66ce06",
      "sort_order": 8,
      "products": {
        "id": "9bc583f9-8ea4-41f9-9df6-64bfbc66ce06",
        "name": "Anaflex Max 500 mg+20 mg tablets (Delayed Release)",
        "slug": "anaflex-max-500-mg20-mg-tablets-delayed-release",
        "price": 210,
        "stock": 100,
        "rating": 0,
        "image_url": null,
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 21,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "51b4d5a5-d8e4-4168-b48f-c85fac371b61",
      "product_id": "209f0270-9599-4139-b44a-bb823f98a7eb",
      "sort_order": 9,
      "products": {
        "id": "209f0270-9599-4139-b44a-bb823f98a7eb",
        "name": "Anaprox 500 mg+20 mg tablets (Delayed Release)",
        "slug": "anaprox-500-mg20-mg-tablets-delayed-release",
        "price": 100,
        "stock": 100,
        "rating": 0,
        "image_url": null,
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 10,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    },
    {
      "section_id": "51b4d5a5-d8e4-4168-b48f-c85fac371b61",
      "product_id": "de8b35d0-d5f6-43af-a5c2-3b6fa54c0501",
      "sort_order": 10,
      "products": {
        "id": "de8b35d0-d5f6-43af-a5c2-3b6fa54c0501",
        "name": "Anasec 20 mg capsules (Enteric Coated)",
        "slug": "anasec-20-mg-capsules-enteric-coated",
        "price": 5.02,
        "stock": 100,
        "rating": 0,
        "image_url": null,
        "price_unit": "per strip (10 pcs)",
        "sold_count": 0,
        "is_preorder": false,
        "original_price": 5.02,
        "preorder_count": 0,
        "is_qmall_verified": false
      }
    }
  ]
};

const SECTIONS_STORAGE_KEY = "sheikhpharma_sections";
const SECTION_PRODUCTS_STORAGE_KEY = "sheikhpharma_section_products";

const getStoredSections = () => {
  if (typeof window === "undefined") return DEFAULT_HOMEPAGE_SECTIONS;
  try {
    const raw = localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id !== "sec-popular") return parsed;
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
      if (parsed && typeof parsed === "object" && !parsed["sec-popular"] && Object.keys(parsed).length > 0) {
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
