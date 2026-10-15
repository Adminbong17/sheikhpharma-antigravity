import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://vkfloynvxqkxbqpdlzbd.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmxveW52eHFreGJxcGRsemJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQ0NzMyNSwiZXhwIjoyMDg5MDIzMzI1fQ.KGfBZMEqiEykX6emQp-pOqZTaZfnjQXBzfsrEUTsQK4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const SITE_URL = "https://www.sheikhpharma.shop";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("X-Rendered-By", "SheikhPharma-SEO-Engine");
  const slug = (req.query.slug as string) || "";

  if (!slug) {
    return serveDefaultHtml(res);
  }

  try {
    // 1. Fetch product by slug, then fall back to id
    let { data: product } = await supabase
      .from("products")
      .select("id, name, slug, description, price, original_price, price_unit, category, subcategory, image_url, brand_id, generic_name, is_active, stock")
      .eq("slug", slug)
      .maybeSingle();

    if (!product) {
      const { data: byId } = await supabase
        .from("products")
        .select("id, name, slug, description, price, original_price, price_unit, category, subcategory, image_url, brand_id, generic_name, is_active, stock")
        .eq("id", slug)
        .maybeSingle();
      product = byId;
    }

    if (!product) {
      return serveDefaultHtml(res);
    }

    // 2. Fetch Brand if available
    let brandName = "";
    if (product.brand_id) {
      const { data: brand } = await supabase
        .from("brands")
        .select("name")
        .eq("id", product.brand_id)
        .maybeSingle();
      if (brand?.name) brandName = brand.name;
    }

    const name = escapeHtml(product.name || "Medicine");
    const generic = product.generic_name ? escapeHtml(product.generic_name) : "";
    const brand = brandName ? escapeHtml(brandName) : "";
    const price = product.price || 0;
    const priceUnit = escapeHtml(product.price_unit || "piece");
    const canonicalUrl = `${SITE_URL}/product/${escapeHtml(product.slug || product.id)}`;
    const imageUrl = product.image_url ? escapeHtml(product.image_url) : `${SITE_URL}/pwa-512.png`;

    // SEO Title & Description targeted for Bangladesh queries
    const pageTitle = `${name}${generic ? ` (${generic})` : ""} Price in Bangladesh — দাম ও খাওয়ার নিয়ম | Sheikh Pharma`;
    const cleanDesc = (product.description || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    
    const pageDesc = cleanDesc.length > 50
      ? cleanDesc.slice(0, 160)
      : `${name}${generic ? ` (${generic})` : ""}${brand ? ` by ${brand}` : ""}. বর্তমান দাম ৳${price} (${priceUnit})। এই ওষুধের ব্যবহার, খাওয়ার নিয়ম, মাত্রা ও পার্শ্বপ্রতিক্রিয়া জেনে অর্ডার করুন — Sheikh Pharma থেকে দ্রুত হোম ডেলিভারি নিন।`;

    // Schema.org Structured Data
    const productSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      ...(product.generic_name ? { alternateName: product.generic_name } : {}),
      image: [imageUrl],
      description: pageDesc,
      sku: product.id,
      ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
      ...(product.category ? { category: product.category } : {}),
      offers: {
        "@type": "Offer",
        url: canonicalUrl,
        priceCurrency: "BDT",
        price: price,
        itemCondition: "https://schema.org/NewCondition",
        availability: product.stock !== 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        seller: {
          "@type": "Pharmacy",
          name: "Sheikh Pharma",
          url: SITE_URL,
        },
      },
    };

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `${product.name} এর মূল জেনেরিক উপাদান কী?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: product.generic_name
              ? `${product.name} এর মূল জেনেরিক উপাদান হলো ${product.generic_name}।`
              : `${product.name} একটি রেজিস্টার্ড ব্র্যান্ডের ঔষধ।`,
          },
        },
        {
          "@type": "Question",
          name: `${product.name} কোন ফার্মাসিউটিক্যাল কোম্পানি তৈরি করে?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: brandName
              ? `${product.name} এর প্রস্তুতকারক কোম্পানি হলো ${brandName}।`
              : "এটি বাংলাদেশের স্বনামধন্য ওষুধ প্রস্তুতকারক কোম্পানি দ্বারা উৎপাদিত।",
          },
        },
        {
          "@type": "Question",
          name: `${product.name} এর বর্তমান দাম কত?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `${product.name} এর বর্তমান খুচরা মূল্য ৳${price} (${priceUnit})। Sheikh Pharma থেকে অর্ডার করলে বিশেষ ছাড় ও দ্রুত হোম ডেলিভারি পাওয়া যায়।`,
          },
        },
        {
          "@type": "Question",
          name: `Sheikh Pharma থেকে ${product.name} কীভাবে অনলাইনে অর্ডার করব?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sheikh Pharma ওয়েবসাইটে সরাসরি কার্টে যোগ করে অথবা প্রেসক্রিপশন আপলোড করে ক্যাশ অন ডেলিভারিতে বাংলাদেশের যেকোনো প্রান্ত থেকে ঘরে বসে অর্ডার করতে পারেন।",
          },
        },
      ],
    };

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: product.category || "Medicines", item: `${SITE_URL}/categories` },
        { "@type": "ListItem", position: 3, name: product.name, item: canonicalUrl },
      ],
    };

    // Rendered HTML body content for Googlebot
    const html = `<!doctype html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDesc)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="Sheikh Pharma" />
  <meta property="og:title" content="${escapeHtml(pageTitle)}" />
  <meta property="og:description" content="${escapeHtml(pageDesc)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:locale" content="bn_BD" />
  <meta property="product:price:amount" content="${price}" />
  <meta property="product:price:currency" content="BDT" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(pageDesc)}" />
  <meta name="twitter:image" content="${imageUrl}" />

  <!-- Structured Data JSON-LD -->
  <script type="application/ld+json">${JSON.stringify(productSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>

  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 900px; margin: 0 auto; padding: 20px; background: #f8fafc; }
    .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .brand-title { color: #059669; font-size: 24px; font-weight: bold; text-decoration: none; }
    .product-box { background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { font-size: 28px; margin: 0 0 8px 0; color: #0f172a; }
    .generic { color: #059669; font-size: 18px; font-weight: 600; margin-bottom: 12px; }
    .manufacturer { color: #64748b; font-size: 14px; margin-bottom: 16px; }
    .price-tag { font-size: 24px; font-weight: bold; color: #059669; margin: 16px 0; }
    .badge { display: inline-block; background: #ecfdf5; color: #059669; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; border: 1px solid #a7f3d0; }
    .desc { margin: 24px 0; font-size: 15px; color: #334155; }
    .faq-section { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 24px; }
    .faq-item { margin-bottom: 16px; }
    .faq-q { font-weight: 600; color: #0f172a; font-size: 16px; margin-bottom: 4px; }
    .faq-a { color: #475569; font-size: 14px; }
    .btn { display: inline-block; background: #059669; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <a href="${SITE_URL}" class="brand-title">Sheikh Pharma</a>
    <span>Bangladesh's Trusted Online Medicine Shop</span>
  </div>

  <div class="product-box">
    <div class="badge">১০০% আসল ওষুধ • হোম ডেলিভারি</div>
    <h1>${name}</h1>
    ${generic ? `<div class="generic">জেনেরিক: ${generic}</div>` : ""}
    ${brand ? `<div class="manufacturer">প্রস্তুতকারক: <strong>${brand}</strong></div>` : ""}
    
    <div class="price-tag">৳${price} <span style="font-size:14px; color:#64748b; font-weight:normal;">/ ${priceUnit}</span></div>

    <a href="${canonicalUrl}" class="btn">এখনই অনলাইনে অর্ডার করুন</a>

    <div class="desc">
      <h3>ওষুধের বিস্তারিত বিবরণ ও ব্যবহার:</h3>
      ${product.description ? product.description : `<p>${pageDesc}</p>`}
    </div>

    <div class="faq-section">
      <h2>সাধারণ জিজ্ঞাসা (FAQ):</h2>
      <div class="faq-item">
        <div class="faq-q">১. ${name} এর মূল জেনেরিক উপাদান কী?</div>
        <div class="faq-a">${generic ? `${name} এর মূল উপাদান হলো <strong>${generic}</strong>।` : "এটি একটি নির্ভরযোগ্য ব্র্যান্ডের ওষুধ।"}</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">২. এটি কোন কোম্পানি তৈরি করে?</div>
        <div class="faq-a">${brand ? `এটি তৈরি করেছে <strong>${brand}</strong>।` : "স্বনামধন্য ফার্মাসিউটিক্যাল কোম্পানি।"}</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">৩. ${name} এর বর্তমান দাম কত?</div>
        <div class="faq-a">${name} এর বর্তমান বিক্রয় মূল্য ৳${price} (${priceUnit})।</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">৪. Sheikh Pharma তে হোম ডেলিভারি পাওয়া যায় কি?</div>
        <div class="faq-a">হ্যাঁ, সারা বাংলাদেশে বিশ্বস্ততার সাথে প্রেসক্রিপশন অনুযায়ী ক্যাশ অন ডেলিভারিতে দ্রুত হোম ডেলিভারি দেওয়া হয়।</div>
      </div>
    </div>
  </div>

  <!-- React hydration anchor -->
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200");
    return res.status(200).send(html);

  } catch (error) {
    console.error("SEO Renderer Error:", error);
    return serveDefaultHtml(res);
  }
}

function serveDefaultHtml(res: VercelResponse) {
  try {
    const indexPath = resolve(process.cwd(), "dist/index.html");
    if (existsSync(indexPath)) {
      const html = readFileSync(indexPath, "utf8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }
  } catch (_e) {
    // ignore
  }
  return res.redirect(302, "/");
}
