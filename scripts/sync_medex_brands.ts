import { uploadToVault } from "../src/lib/vaultStorage";

const SUPABASE_URL = "https://vkfloynvxqkxbqpdlzbd.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmxveW52eHFreGJxcGRsemJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQ0NzMyNSwiZXhwIjoyMDg5MDIzMzI1fQ.KGfBZMEqiEykX6emQp-pOqZTaZfnjQXBzfsrEUTsQK4";

interface MedExCompany {
  id: string;
  name: string;
  slug: string;
  url: string;
  type: string;
  logoUrl?: string | null;
  vaultLogoUrl?: string | null;
}

async function scrapeAllMedExCompanies(): Promise<MedExCompany[]> {
  console.log("==> Scraping all companies from MedEx...");
  const types = ["", "herbal", "unani", "ayurvedic"];
  const companiesMap = new Map<string, MedExCompany>();

  for (const t of types) {
    let page = 1;
    while (true) {
      const url = t
        ? `https://medex.com.bd/companies?type=${t}&page=${page}`
        : `https://medex.com.bd/companies?page=${page}`;

      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        if (!res.ok) break;
        const html = await res.text();
        const matches = [...html.matchAll(/<a[^>]*href=["'](https:\/\/medex\.com\.bd\/companies\/(\d+)\/([^"'\/]+))(?:\/brands)?["'][^>]*>([\s\S]*?)<\/a>/gi)];
        if (matches.length === 0) break;

        let newFound = 0;
        for (const m of matches) {
          const compUrl = m[1];
          const id = m[2];
          const slug = m[3];
          const text = m[4].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

          if (!text || text.toLowerCase().includes("brand") || text.toLowerCase().includes("medex")) continue;

          if (!companiesMap.has(id)) {
            companiesMap.set(id, {
              id,
              name: text,
              slug,
              url: `https://medex.com.bd/companies/${id}/${slug}`,
              type: t || "allopathic",
            });
            newFound++;
          }
        }

        if (newFound === 0) break;
        page++;
        if (page > 30) break;
      } catch (e) {
        console.error(`Error fetching page ${page} type ${t}:`, e);
        break;
      }
    }
  }

  const list = Array.from(companiesMap.values());
  console.log(`==> Total unique MedEx companies discovered: ${list.length}`);
  return list;
}

async function fetchCompanyLogos(companies: MedExCompany[]) {
  console.log(`==> Fetching company logos for ${companies.length} companies...`);
  const BATCH_SIZE = 10;
  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const chunk = companies.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map(async (comp) => {
        try {
          const res = await fetch(comp.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          });
          if (!res.ok) return;
          const html = await res.text();
          const logoMatch = html.match(/<img[^>]+src=["'](https:\/\/medex\.com\.bd\/storage\/images\/company_logos\/[^"']+)["']/i);
          if (logoMatch) {
            comp.logoUrl = logoMatch[1];
          }
        } catch (e) {
          // ignore
        }
      })
    );
    process.stdout.write(`\rProgress: ${Math.min(i + BATCH_SIZE, companies.length)}/${companies.length} logos checked`);
  }
  console.log("\n==> Finished fetching logo URLs.");
  const withLogos = companies.filter((c) => !!c.logoUrl);
  console.log(`==> Companies with official MedEx logos: ${withLogos.length}`);
}

async function uploadLogosToVault(companies: MedExCompany[]) {
  const toUpload = companies.filter((c) => !!c.logoUrl);
  console.log(`==> Uploading ${toUpload.length} logos to FileVault (vault.bongbangla.top)...`);

  const CONCURRENCY = 5;
  for (let i = 0; i < toUpload.length; i += CONCURRENCY) {
    const chunk = toUpload.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (comp) => {
        if (!comp.logoUrl) return;
        try {
          const imgRes = await fetch(comp.logoUrl, {
            headers: { "User-Agent": "Mozilla/5.0" },
          });
          if (!imgRes.ok) return;
          const arrayBuf = await imgRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const ext = comp.logoUrl.split(".").pop()?.split("?")[0] || "png";
          const fileName = `brand-${comp.slug}-${Date.now()}.${ext}`;
          const blob = new Blob([buffer], { type: `image/${ext === "png" ? "png" : "jpeg"}` });

          const vaultUrl = await uploadToVault(blob, fileName);
          comp.vaultLogoUrl = vaultUrl;
        } catch (e: any) {
          console.error(`\nFailed to upload logo for ${comp.name}:`, e.message);
          // Fallback to original MedEx logo url if vault fails
          comp.vaultLogoUrl = comp.logoUrl;
        }
      })
    );
    process.stdout.write(`\rVault Uploaded: ${Math.min(i + CONCURRENCY, toUpload.length)}/${toUpload.length}`);
  }
  console.log("\n==> Finished FileVault uploads.");
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function syncToSupabase(companies: MedExCompany[]) {
  console.log("==> Fetching current brands from Supabase...");
  const brandsRes = await fetch(`${SUPABASE_URL}/rest/v1/brands?select=*`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const existingBrands: any[] = await brandsRes.json();
  console.log(`==> Existing brands in Supabase: ${existingBrands.length}`);

  const existingMap = new Map<string, any>();
  for (const b of existingBrands) {
    existingMap.set(normalize(b.name), b);
  }

  // Also check product counts per brand
  const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=brand_id`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const products: any[] = await prodRes.json();
  const productBrandCounts = new Map<string, number>();
  for (const p of products) {
    if (p.brand_id) {
      productBrandCounts.set(p.brand_id, (productBrandCounts.get(p.brand_id) || 0) + 1);
    }
  }

  let updatedCount = 0;
  let insertedCount = 0;

  for (const comp of companies) {
    const norm = normalize(comp.name);
    // Also try checking partial match
    let match = existingMap.get(norm);
    if (!match) {
      for (const [k, v] of existingMap.entries()) {
        if (norm.includes(k) || k.includes(norm)) {
          match = v;
          break;
        }
      }
    }

    const logo = comp.vaultLogoUrl || comp.logoUrl || match?.logo_url || null;

    if (match) {
      // Update existing brand
      const updatePayload: any = {
        name: comp.name,
        logo_url: logo,
        status: "approved",
        is_active: true,
      };
      await fetch(`${SUPABASE_URL}/rest/v1/brands?id=eq.${match.id}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(updatePayload),
      });
      updatedCount++;
    } else {
      // Insert new brand
      const insertPayload: any = {
        name: comp.name,
        logo_url: logo,
        status: "approved",
        is_active: true,
      };
      await fetch(`${SUPABASE_URL}/rest/v1/brands`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(insertPayload),
      });
      insertedCount++;
    }
  }

  console.log(`==> Sync Summary: ${updatedCount} brands updated, ${insertedCount} new brands inserted.`);

  // Make sure ALL brands in DB have status: 'approved' and is_active: true
  console.log("==> Making ALL brands in DB approved and active (Live)...");
  await fetch(`${SUPABASE_URL}/rest/v1/brands?status=neq.approved`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "approved", is_active: true }),
  });
  await fetch(`${SUPABASE_URL}/rest/v1/brands?is_active=neq.true`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ is_active: true, status: "approved" }),
  });

  // Verify final count
  const finalRes = await fetch(`${SUPABASE_URL}/rest/v1/brands?select=id,name,logo_url,status,is_active`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const finalBrands: any[] = await finalRes.json();
  const withLogoCount = finalBrands.filter((b) => !!b.logo_url).length;
  console.log(`==> Final Brands in Supabase: ${finalBrands.length} total (${withLogoCount} with logos, ALL Live/Approved)`);
}

async function main() {
  const companies = await scrapeAllMedExCompanies();
  await fetchCompanyLogos(companies);
  await uploadLogosToVault(companies);
  await syncToSupabase(companies);
  console.log("\n🎉 ALL Brands Grabbed, Hosted on FileVault, and Made Live!");
}

main().catch(console.error);
