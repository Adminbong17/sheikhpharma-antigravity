import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Seo, { SITE_URL } from "@/components/Seo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ShoppingCart, Star, ChevronRight, Minus, Plus, Zap, Store, MessageCircle, BadgeCheck, Truck, ShieldCheck, RotateCcw, FlaskConical } from "lucide-react";
import BackButton from "@/components/BackButton";
import WishlistButton from "@/components/WishlistButton";
import RelatedProducts from "@/components/RelatedProducts";
import { useState, useEffect, useCallback, useMemo } from "react";
import { isEffectivePreorder } from "@/lib/preorder";
import { getMedicinePricing, getStripDiscountPercent, applyDiscount } from "@/lib/medicinePricing";
import { toast } from "sonner";
import ProductDescriptionSections from "@/components/ProductDescriptionSections";
import ProductReviews from "@/components/ProductReviews";
import MessageVendorDialog from "@/components/MessageVendorDialog";
import { trackViewContent } from "@/lib/fbPixelEvents";
import { useMarketingSettings } from "@/hooks/useMarketingSettings";
import { useLanguage } from "@/contexts/LanguageContext";

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const { b, formatNumber } = useLanguage();
  const [qty, setQty] = useState(1);
  const [buyUnit, setBuyUnit] = useState<"strip" | "pcs">("strip");
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, { id: string; value: string; adjustment: number }>>({});
  const [msgOpen, setMsgOpen] = useState(false);
  const { data: marketingSettings } = useMarketingSettings();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setSelectedImage(0);
    setQty(1);
    setSelectedVariants({});
  }, [slug]);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      // Try slug first, then fall back to id
      const { data: bySlug } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (bySlug) return bySlug;
      const { data: byId } = await supabase
        .from("products")
        .select("*")
        .eq("id", slug!)
        .maybeSingle();
      return byId;
    },
    enabled: !!slug,
  });

  const { data: images = [] } = useQuery({
    queryKey: ["product-images", product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", product!.id)
        .order("sort_order");
      return data || [];
    },
    enabled: !!product?.id,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ["product-variants", product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", product!.id)
        .order("sort_order");
      return data || [];
    },
    enabled: !!product?.id,
  });

  // Fetch vendor info for display + reply functionality
  const { data: vendor } = useQuery({
    queryKey: ["product-vendor", product?.vendor_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendors")
        .select("id, user_id, store_name, logo_url")
        .eq("id", product!.vendor_id!)
        .maybeSingle();
      return data;
    },
    enabled: !!product?.vendor_id,
  });

  // Fetch brand info
  const { data: brand } = useQuery({
    queryKey: ["product-brand", product?.brand_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("brands")
        .select("id, name, logo_url")
        .eq("id", product!.brand_id!)
        .maybeSingle();
      return data;
    },
    enabled: !!product?.brand_id,
  });

  // Approved review stats — used for star ratings in Google results
  const { data: reviewStats } = useQuery({
    queryKey: ["product-review-stats", product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_reviews")
        .select("rating")
        .eq("product_id", product!.id);

      const rows = data || [];
      if (!rows.length) return null;
      const avg = rows.reduce((s, r: any) => s + (r.rating || 0), 0) / rows.length;
      return { count: rows.length, average: Math.round(avg * 10) / 10 };
    },
    enabled: !!product?.id,
  });


  // Combine main image with additional images
  const allImages = product?.image_url
    ? [{ image_url: product.image_url, id: "main" }, ...images]
    : images;

  // Auto-slide images
  useEffect(() => {
    if (allImages.length <= 1) return;
    const interval = setInterval(() => {
      setSelectedImage((prev) => (prev + 1) % allImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [allImages.length]);

  // Facebook Pixel: ViewContent
  useEffect(() => {
    if (product && marketingSettings?.pixel_enabled) {
      trackViewContent({
        content_name: product.name,
        content_ids: [product.id],
        value: product.price,
        currency: marketingSettings.default_currency || "BDT",
      });
    }
  }, [product?.id, marketingSettings?.pixel_enabled]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-8 md:grid-cols-2">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <Link to="/">
            <Button className="mt-4">Back to Home</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // If a variant is selected, use its price_adjustment as the actual price (not an addition)
  const hasSelectedVariant = Object.keys(selectedVariants).length > 0;
  const medPricing = getMedicinePricing(product);
  const canBuyPcs = !!(medPricing?.isTabletOrCapsule && medPricing.discountedUnitPrice && medPricing.stripPrice);
  const unitMode: "strip" | "pcs" = canBuyPcs ? buyUnit : "strip";
  const stripDiscountPct = getStripDiscountPercent(qty);
  const currentStripPrice = medPricing?.stripPrice || product.price;
  const unitBasePrice = canBuyPcs
    ? (unitMode === "pcs"
        ? medPricing!.discountedUnitPrice!
        : applyDiscount(currentStripPrice, stripDiscountPct))
    : applyDiscount(product.price, 10);
  const effectivePrice = hasSelectedVariant
    ? Object.values(selectedVariants).reduce((_, v) => v.adjustment, unitBasePrice)
    : unitBasePrice;
  const unitKey = canBuyPcs ? (unitMode === "pcs" ? "Unit:Piece" : "Unit:Strip") : undefined;
  const unitLabelText = canBuyPcs ? (unitMode === "pcs" ? "Unit: Piece" : `Unit: Strip (${medPricing?.pcsPerStrip} pcs)`) : undefined;

  const buildVariant = () => {
    const keys = [
      ...(hasSelectedVariant ? Object.entries(selectedVariants).map(([k, v]) => `${k}:${v.value}`) : []),
      ...(unitKey ? [unitKey] : []),
    ].sort();
    const labels = [
      ...(hasSelectedVariant ? Object.entries(selectedVariants).map(([k, v]) => `${k}: ${v.value}`) : []),
      ...(unitLabelText ? [unitLabelText] : []),
    ];
    return { variantKey: keys.length ? keys.join("|") : undefined, variantLabel: labels.length ? labels.join(", ") : undefined };
  };

  const discount = product.original_price
    ? Math.round((1 - effectivePrice / product.original_price) * 100)
    : 0;

  const productPath = `/product/${product.slug || product.id}`;
  // Bangladeshi shoppers search both "<brand> price in bangladesh" and "<brand> দাম"
  const seoTitle = `${product.name}${product.generic_name ? ` | ${product.generic_name}` : ""} — দাম ও Price in Bangladesh`.slice(0, 65) + " | Sheikh Pharma";
  const seoDescription = (
    product.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() ||
    `${product.name}${product.generic_name ? ` (${product.generic_name})` : ""} price ৳${effectivePrice} in Bangladesh. ${product.name} এর দাম, ব্যবহার ও ডেলিভারি — Sheikh Pharma থেকে অনলাইনে অর্ডার করুন।`
  ).slice(0, 155);


  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Seo
        title={seoTitle}
        description={seoDescription}
        path={productPath}
        image={product.image_url}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            ...(product.generic_name ? { alternateName: product.generic_name } : {}),
            description: seoDescription,
            ...(product.image_url ? { image: product.image_url } : {}),
            ...(product.sku ? { sku: product.sku } : {}),
            ...(brand?.name ? { brand: { "@type": "Brand", name: brand.name } } : {}),
            ...(product.category ? { category: product.category } : {}),
            ...(reviewStats
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: reviewStats.average,
                    reviewCount: reviewStats.count,
                    bestRating: 5,
                    worstRating: 1,
                  },
                }
              : {}),
            offers: {
              "@type": "Offer",
              url: `${SITE_URL}${productPath}`,
              price: effectivePrice,
              priceCurrency: "BDT",
              itemCondition: "https://schema.org/NewCondition",
              priceValidUntil: new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10),
              availability:
                product.stock > 0 || isEffectivePreorder(product)
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              seller: { "@type": "Organization", name: "Sheikh Pharma" },
              areaServed: { "@type": "Country", name: "Bangladesh" },
            },
          },

          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              ...(product.category
                ? [{ "@type": "ListItem", position: 2, name: product.category, item: `${SITE_URL}/category/${product.category}` }]
                : []),
              { "@type": "ListItem", position: product.category ? 3 : 2, name: product.name, item: `${SITE_URL}${productPath}` },
            ],
          },
        ]}
      />
      <Navbar />

      <main className="container mx-auto px-4 py-6 overflow-hidden">
        <div className="mb-4"><BackButton /></div>

        <div className="grid gap-8 md:grid-cols-2 min-w-0">
          {/* Images */}
          <div className="min-w-0 overflow-hidden">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
              {allImages.length > 0 ? (
                <img
                  src={allImages[selectedImage]?.image_url}
                  alt={product.name}
                  className={`h-full w-full object-contain transition-all duration-500 ${product.stock <= 0 && !isEffectivePreorder(product) ? "opacity-50 grayscale" : ""}`}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl text-muted-foreground">📦</div>
              )}
              {product.stock <= 0 && !isEffectivePreorder(product) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-destructive text-destructive-foreground text-lg font-bold px-10 py-2 rotate-[-35deg] shadow-lg">
                    Out of Stock
                  </div>
                </div>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {allImages.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition ${
                      i === selectedImage ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-2xl font-bold text-foreground break-words">{product.name}</h1>
              <WishlistButton productId={product.id} size="md" className="shrink-0 mt-1" />
            </div>

            {/* Generic & Manufacturer / Brand Metadata */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5 pb-1">
              {product.generic_name && (
                <Link
                  to={`/search?q=${encodeURIComponent(product.generic_name)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1 rounded-md transition-colors"
                >
                  <span className="font-semibold">{b("জেনেরিক:", "Generic:")}</span>
                  <span>{product.generic_name}</span>
                </Link>
              )}

              {brand && (
                <Link
                  to={`/brand/${brand.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted hover:bg-muted/80 text-foreground px-2.5 py-1 rounded-md border transition-colors group"
                >
                  {brand.logo_url && (
                    <img src={brand.logo_url} alt={brand.name} className="h-4 w-4 object-contain rounded-xs" />
                  )}
                  <span className="text-muted-foreground">{b("কোম্পানি:", "Brand:")}</span>
                  <span className="font-semibold group-hover:text-primary transition-colors">{brand.name}</span>
                </Link>
              )}

              {product.requires_prescription && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 border-amber-500 text-amber-600 bg-amber-50/50">
                  {b("⚠️ প্রেসক্রিপশন আবশ্যক", "⚠️ Rx Required")}
                </Badge>
              )}
            </div>

            {product.is_qmall_verified && (
              <Link to="/qmall" className="flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1 w-fit hover:bg-primary/20 transition-colors">
                <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />
                <span className="text-xs font-semibold text-primary">Verified by SKP</span>
              </Link>
            )}

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-medium">{product.rating || 0}</span>
              </div>
              {product.sold_count ? (
                <span className="text-sm text-muted-foreground">{formatNumber(product.sold_count)} {b("বিক্রি হয়েছে", "sold")}</span>
              ) : null}
              {isEffectivePreorder(product) ? (
                <Link to="/pre-orders">
                  <Badge className="bg-accent text-accent-foreground hover:bg-accent/80 cursor-pointer">
                    {b("অগ্রিম অর্ডার", "Pre-Order")}{product.preorder_count ? ` (${formatNumber(product.preorder_count)})` : ""}
                  </Badge>
                </Link>
              ) : product.stock > 0 ? (
                <Badge variant="secondary">{b("স্টকে আছে", "In Stock")} ({formatNumber(product.stock)})</Badge>
              ) : (
                <Badge variant="destructive">{b("স্টক শেষ", "Out of Stock")}</Badge>
              )}
            </div>

            {(() => {
              const med = getMedicinePricing(product);
              if (med && med.isTabletOrCapsule) {
                return (
                  <div className="space-y-2.5 rounded-xl border-2 border-primary/30 bg-primary/5 p-3.5 shadow-sm">
                    {/* Strip price */}
                    {med.stripPrice && (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{b("স্ট্রিপ মূল্য:", "Strip Price:")}</span>
                        <span className="text-sm text-muted-foreground line-through">{formatPrice(med.stripPrice)}</span>
                        <span className="text-2xl font-bold text-primary">{formatPrice(applyDiscount(med.stripPrice, stripDiscountPct))}</span>
                        <Badge className="bg-destructive text-destructive-foreground text-xs">{stripDiscountPct}% {b("ছাড়", "OFF")}</Badge>
                        {med.pcsPerStrip && (
                          <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-foreground">
                            ({formatNumber(med.pcsPerStrip)} {b("পিস/স্ট্রিপ", "pcs/strip")})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Unit price with 10% discount */}
                    {med.unitPrice && med.discountedUnitPrice && (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{b("ইউনিট মূল্য:", "Unit Price:")}</span>
                        <span className="text-sm text-muted-foreground line-through">{formatPrice(med.unitPrice)}</span>
                        <span className="text-lg font-bold text-primary">{formatPrice(med.discountedUnitPrice)}</span>
                        <Badge className="bg-destructive text-destructive-foreground text-xs">10% {b("ছাড়", "OFF")}</Badge>
                        <span className="text-xs text-muted-foreground">({b("প্রতি পিস", "per piece")})</span>
                      </div>
                    )}

                    {/* Pack size & price */}
                    {med.packSizeLabel && med.packPrice && (
                      <div className="flex items-baseline gap-2 flex-wrap pt-1.5 border-t border-primary/10">
                        <span className="text-xs font-medium text-muted-foreground">{b("বক্স / প্যাক:", "Box / Pack:")}</span>
                        <span className="text-xs font-semibold">{med.packSizeLabel}{med.totalPcsPerPack ? ` (${formatNumber(med.totalPcsPerPack)} pcs)` : ""}</span>
                        <span className="text-xs font-bold text-primary">{formatPrice(med.packPrice)}</span>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-bold text-primary">{formatPrice(effectivePrice)}</span>
                  {(product as any).price_unit && (
                    <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-foreground">{(product as any).price_unit}</span>
                  )}
                  {product.original_price && (
                    <>
                      <span className="text-lg text-muted-foreground line-through">
                        {formatPrice(product.original_price)}
                      </span>
                      <Badge className="bg-primary/10 text-primary">-{discount}%</Badge>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Variants */}
            {variants.length > 0 && (() => {
              const grouped = variants.reduce((acc: Record<string, typeof variants>, v) => {
                if (!acc[v.variant_name]) acc[v.variant_name] = [];
                acc[v.variant_name].push(v);
                return acc;
              }, {});
              return (
                <div className="space-y-3">
                  {Object.entries(grouped).map(([name, options]) => (
                    <div key={name}>
                      <span className="text-sm font-medium text-foreground">{name}</span>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {options.map((opt) => {
                          const isSelected = selectedVariants[name]?.id === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => setSelectedVariants(prev => ({ ...prev, [name]: { id: opt.id, value: opt.variant_value, adjustment: opt.price_adjustment } }))}
                              className={`rounded-md border px-3 py-1.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${isSelected ? "border-primary bg-primary/10 text-primary font-semibold" : "hover:border-primary hover:text-primary"}`}
                            >
                              {opt.variant_value}
                              {opt.price_adjustment !== 0 && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({opt.price_adjustment > 0 ? "+" : ""}{formatPrice(opt.price_adjustment)})
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Quantity + Buttons moved above description */}
            <div className="space-y-3 pt-2">
              {canBuyPcs && medPricing && (
                <div>
                  <span className="text-sm font-medium text-foreground">{b("হিসেবে কিনুন", "Buy as")}</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setBuyUnit("strip")}
                      className={`rounded-md border px-3 py-1.5 text-sm transition ${unitMode === "strip" ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm" : "hover:border-primary hover:text-primary"}`}
                    >
                      {b("স্ট্রিপ", "Strip")} ({medPricing.pcsPerStrip} {b("পিস", "pcs")}) — {formatPrice(applyDiscount(medPricing.stripPrice || product.price, stripDiscountPct))}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuyUnit("pcs")}
                      className={`rounded-md border px-3 py-1.5 text-sm transition ${unitMode === "pcs" ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm" : "hover:border-primary hover:text-primary"}`}
                    >
                      {b("পিস", "Piece")} (1 {b("পিস", "pc")}) — {formatPrice(medPricing.discountedUnitPrice!)}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-md border w-fit">
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setQty(Math.max(1, qty - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center font-medium">{formatNumber(qty)}</span>
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setQty(qty + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {unitMode === "pcs" ? b("পিস", "Piece") : b("স্ট্রিপ", "Strip")} × {formatNumber(qty)} = <span className="font-semibold text-primary">{formatPrice(effectivePrice * qty)}</span>
                </span>
              </div>

              {/* Tiered discount reminder */}
              {unitMode === "strip" && (
                <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2.5 text-xs">
                  <p className="font-semibold text-primary">
                    {b(`এখন পাচ্ছেন ${stripDiscountPct}% ছাড় (${formatNumber(qty)} স্ট্রিপ)`, `Getting ${stripDiscountPct}% OFF (${qty} strips)`)}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {b("১ স্ট্রিপ = ১০% • ২ স্ট্রিপ = ১২% • ৩+ স্ট্রিপ = ১৫% ছাড়", "1 strip = 10% • 2 strips = 12% • 3+ strips = 15% OFF")}
                    {qty < 3 && <span className="ml-1 font-medium text-foreground">{b(`— আরও ${3 - qty} স্ট্রিপ নিলে ১৫% ছাড়!`, `— Add ${3 - qty} more for 15% OFF!`)}</span>}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
              {isEffectivePreorder(product) ? (
                  <Button
                    className="flex-1 gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      const { variantKey, variantLabel } = buildVariant();
                      addItem({ id: product.id, name: product.name, price: effectivePrice, image_url: product.image_url, variantKey, variantLabel }, qty);
                      toast.success(b(`${formatNumber(qty)} ${unitMode === "pcs" ? "পিস" : "স্ট্রিপ"} Pre-Order সফল হয়েছে!`, `${qty} item(s) Pre-Order placed successfully!`));
                    }}
                  >
                    <ShoppingCart className="h-5 w-5" /> {b("অগ্রিম অর্ডার করুন", "Pre-Order Now")}
                  </Button>
                ) : (
                  <>
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => {
                        const { variantKey, variantLabel } = buildVariant();
                        addItem({ id: product.id, name: product.name, price: effectivePrice, image_url: product.image_url, variantKey, variantLabel }, qty);
                        toast.success(b(`${formatNumber(qty)} ${unitMode === "pcs" ? "পিস" : "স্ট্রিপ"} কার্টে যোগ হয়েছে!`, `${qty} item(s) added to cart!`));
                      }}
                    >
                      <ShoppingCart className="h-5 w-5" /> {b("কার্টে যোগ করুন", "Add to Cart")}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => {
                        const { variantKey, variantLabel } = buildVariant();
                        addItem({ id: product.id, name: product.name, price: effectivePrice, image_url: product.image_url, variantKey, variantLabel }, qty);
                        navigate("/checkout");
                      }}
                    >
                      <Zap className="h-5 w-5" /> {b("এখনই কিনুন", "Buy Now")}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Brand Badge */}
            {brand && (
              <Link
                to={`/brand/${brand.id}`}
                className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 hover:bg-primary/10 transition-colors group"
              >
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt={brand.name} className="h-5 w-5 rounded object-contain shrink-0" />
                ) : (
                  <Store className="h-5 w-5 text-primary shrink-0" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {b("ব্র্যান্ড:", "Brand:")} {brand.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{b("সব পণ্য দেখুন", "View all products")}</p>
                </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
              </Link>
            )}

            {/* Generic Name Badge */}
            {product.generic_name && (
              <Link
                to={`/generic/${encodeURIComponent(product.generic_name)}`}
                className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">G</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{b("জেনেরিক নাম", "Generic Name")}</p>
                  <p className="text-sm font-semibold text-foreground">{product.generic_name}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
              </Link>
            )}

            {/* Delivery Badge */}
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <Truck className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{b("ডেলিভারি: ৩-৫ কার্যদিবস", "Delivery: 3-5 Days")}</p>
                <p className="text-xs text-muted-foreground">{b("সারাদেশে ক্যাশ অন ডেলিভারি", "All over Bangladesh")}</p>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{b("নিরাপদ পেমেন্ট", "Secure Payment")}</p>
                <p className="text-xs text-muted-foreground">{b("আপনার পেমেন্ট শতভাগ নিরাপদ", "Your payment is safe & encrypted")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <RotateCcw className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{b("সহজ রিটার্ন সুবিধা", "Easy Return Within 7 Days")}</p>
                <p className="text-xs text-muted-foreground">{b("৭ দিনের মধ্যে সহজ রিটার্ন পলিসি", "Hassle-free return policy")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <BadgeCheck className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{b("১০০% খাঁটি ওষুধের নিশ্চয়তা", "100% Authentic Products")}</p>
                <p className="text-xs text-muted-foreground">{b("শতভাগ আসল ও অনুমোদিত ওষুধ", "Guaranteed genuine products")}</p>
              </div>
            </div>

            {product.sku && (
              <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
            )}

            {product.description && (() => {
              // Split specs table from description
              const desc = product.description;
              const tableMatch = desc.match(/^(<table[\s\S]*?<\/table>)([\s\S]*)$/i);
              const specsHtml = tableMatch ? tableMatch[1] : null;
              const restDesc = tableMatch ? tableMatch[2].trim() : desc;

              // Parse specs from HTML table
              const parsedSpecs: { key: string; value: string }[] = [];
              if (specsHtml) {
                const rowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
                let match;
                while ((match = rowRegex.exec(specsHtml)) !== null) {
                  const key = match[1].replace(/<[^>]+>/g, '').trim();
                  const value = match[2].replace(/<[^>]+>/g, '').trim();
                  if (key && value) parsedSpecs.push({ key, value });
                }
              }

              // Extract Composition section into its own highlighted box
              const compositionRegex = /<section[^>]*class="product-section"[^>]*>[\s\S]*?<h3[^>]*>\s*Composition\s*<\/h3>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/section>/i;
              const compositionMatch = restDesc.match(compositionRegex);
              const compositionHtml = compositionMatch ? compositionMatch[1].trim() : null;
              const descWithoutComposition = compositionMatch ? restDesc.replace(compositionMatch[0], "").trim() : restDesc;

              return (
                <>
                  {parsedSpecs.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Specification</h3>
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full border-collapse text-sm">
                          <tbody>
                            {parsedSpecs.map((spec, i) => (
                              <tr key={i} className={i % 2 === 0 ? "bg-muted/50" : "bg-background"}>
                                <td className="px-3 py-2.5 border-b border-border last:border-b-0 text-muted-foreground font-medium w-[40%]">{spec.key}</td>
                                <td className="px-3 py-2.5 border-b border-border last:border-b-0 text-foreground font-semibold">
                                  <Link
                                    to={`/search?q=${encodeURIComponent(spec.value)}`}
                                    className="hover:text-primary hover:underline transition-colors cursor-pointer"
                                  >
                                    {spec.value}
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {compositionHtml && (
                    <div
                      className={`rounded-xl border-2 border-primary/20 bg-primary/5 p-4 ${product.generic_name ? "cursor-pointer hover:bg-primary/10 transition-colors" : ""}`}
                      onClick={() => {
                        if (product.generic_name) navigate(`/generic/${encodeURIComponent(product.generic_name)}`);
                      }}
                      role={product.generic_name ? "link" : undefined}
                    >
                      <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-primary" />
                        Composition
                        {product.generic_name && (
                          <span className="ml-auto text-xs font-normal text-primary flex items-center gap-0.5">
                            View all <ChevronRight className="h-3 w-3" />
                          </span>
                        )}
                      </h3>
                      {(() => {
                        const lines = compositionHtml
                          .replace(/<\/(p|div|li)>/gi, "\n")
                          .replace(/<(br|\/?ul|\/?ol|li|p|div)[^>]*>/gi, "\n")
                          .replace(/&nbsp;/gi, " ")
                          .split("\n")
                          .map((l) => l.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
                          .filter(Boolean);
                        if (lines.length <= 1) {
                          return (
                            <div className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: compositionHtml }} />
                          );
                        }
                        return (
                          <ol className="space-y-1.5">
                            {lines.map((line, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                                  {i + 1}
                                </span>
                                <span>{line}</span>
                              </li>
                            ))}
                          </ol>
                        );
                      })()}
                    </div>
                  )}

                  {descWithoutComposition && (
                    <ProductDescriptionSections html={descWithoutComposition} />
                  )}

                </>
              );
            })()}

            {/* Vendor Card */}
            {vendor && (
              <div className="space-y-2">
                <Link
                  to={`/store/${vendor.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:border-primary hover:bg-primary/5 transition-colors group"
                >
                  {vendor.logo_url ? (
                    <img src={vendor.logo_url} alt={vendor.store_name} className="h-10 w-10 rounded-lg object-cover border shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Sold by</p>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{vendor.store_name}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                </Link>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setMsgOpen(true)}
                >
                  <MessageCircle className="h-4 w-4" />
                  Message Seller
                </Button>
              </div>
            )}


          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8 border-t pt-6">
          <ProductReviews
            productId={product.id}
            vendorUserId={vendor?.user_id ?? null}
            vendorName={vendor?.store_name ?? null}
          />
        </div>

        {/* Related Products */}
        <RelatedProducts
          productId={product.id}
          category={product.category}
          subcategory={product.subcategory}
        />
      </main>
      <Footer />
      {vendor && (
        <MessageVendorDialog
          open={msgOpen}
          onOpenChange={setMsgOpen}
          vendorId={vendor.id}
          vendorName={vendor.store_name}
          productId={product.id}
          productName={product.name}
        />
      )}
    </div>
  );
};

export default ProductPage;
