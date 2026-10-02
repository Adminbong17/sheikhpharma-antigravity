// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Includes every static route plus all active products, categories and brands so that
// medicine / generic names are discoverable by search engines.

import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const SITEMAP_PATH = resolve("public/sitemap.xml");

function existingSitemapUrlCount(): number {
  try {
    if (!existsSync(SITEMAP_PATH)) return 0;
    const matches = readFileSync(SITEMAP_PATH, "utf8").match(/<loc>/g);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

const BASE_URL = "https://www.sheikhpharma.shop";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/categories", changefreq: "weekly", priority: "0.8" },
  { path: "/brands", changefreq: "weekly", priority: "0.7" },
  { path: "/vendors", changefreq: "weekly", priority: "0.5" },
  { path: "/qmall", changefreq: "weekly", priority: "0.6" },
  { path: "/pre-orders", changefreq: "weekly", priority: "0.5" },
  { path: "/flash-deals", changefreq: "daily", priority: "0.6" },
  { path: "/prescription", changefreq: "monthly", priority: "0.7" },
  { path: "/lab-test", changefreq: "weekly", priority: "0.7" },
  { path: "/specialist-doctors", changefreq: "weekly", priority: "0.6" },
  { path: "/blood-bank", changefreq: "weekly", priority: "0.6" },
  { path: "/emergency", changefreq: "monthly", priority: "0.5" },
  { path: "/prayer-times", changefreq: "daily", priority: "0.4" },
  { path: "/careers", changefreq: "monthly", priority: "0.3" },
];

async function fetchAll(table: string, select: string, filter = ""): Promise<any[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  const rows: any[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${filter}&limit=${pageSize}&offset=${from}`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) break;
    const batch = (await res.json()) as any[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${xmlEscape(BASE_URL + e.path)}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function main() {
  const entries = [...staticEntries];

  const [products, categories, brands, pages] = await Promise.all([
    fetchAll("products", "id,slug", "&is_active=eq.true"),
    fetchAll("categories", "slug"),
    fetchAll("brands", "id"),
    fetchAll("static_pages", "slug", "&is_active=eq.true"),
  ]);

  const dynamicCount = categories.length + products.length + brands.length + pages.length;
  if (dynamicCount === 0 && existingSitemapUrlCount() > staticEntries.length) {
    console.log("sitemap: no dynamic rows fetched — keeping existing richer public/sitemap.xml");
    return;
  }

  for (const c of categories) if (c.slug) entries.push({ path: `/category/${c.slug}`, changefreq: "weekly", priority: "0.8" });
  for (const p of products) {
    const key = p.slug || p.id;
    if (key) entries.push({ path: `/product/${encodeURIComponent(key)}`, changefreq: "weekly", priority: "0.9" });
  }
  for (const b of brands) if (b.id) entries.push({ path: `/brand/${b.id}`, changefreq: "monthly", priority: "0.5" });
  for (const s of pages) if (s.slug) entries.push({ path: `/page/${s.slug}`, changefreq: "monthly", priority: "0.3" });

  writeFileSync(SITEMAP_PATH, generateSitemap(entries));
  console.log(`sitemap.xml written (${entries.length} entries)`);
}

main().catch((err) => {
  console.error("sitemap generation failed:", err);
  if (existingSitemapUrlCount() > staticEntries.length) {
    console.log("sitemap: keeping existing richer public/sitemap.xml after failure");
    return;
  }
  writeFileSync(SITEMAP_PATH, generateSitemap(staticEntries));
});
