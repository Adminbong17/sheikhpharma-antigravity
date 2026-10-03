import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vkfloynvxqkxbqpdlzbd.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmxveW52eHFreGJxcGRsemJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQ0NzMyNSwiZXhwIjoyMDg5MDIzMzI1fQ.KGfBZMEqiEykX6emQp-pOqZTaZfnjQXBzfsrEUTsQK4";

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log("Connecting to Supabase with Admin Service Role...");

  // Load the 162 scraped and prepared products
  const products: any[] = await Bun.file("scripts/hamdard_all_162_final.json").json();
  console.log(`Loaded ${products.length} products to insert.`);

  const brandId = "7213c050-758b-4f6a-a0fa-9351c7c3e46f"; // Hamdard Laboratories (WAQF) BD
  const category = "Herbal";

  const rows = products.map((p) => {
    const desc = `<section class="product-section"><h3>Composition</h3><div>${p.composition}</div></section><section class="product-section"><h3>Indications</h3><div>${p.indications}</div></section><section class="product-section"><h3>Pharmacology</h3><div>${p.pharmacology}</div></section><section class="product-section"><h3>Dosage & Administration</h3><div>${p.dosage}</div></section><section class="product-section"><h3>Side Effects</h3><div>${p.sideEffects}</div></section>`;

    return {
      name: p.name,
      slug: p.slug,
      description: desc,
      price: p.price,
      original_price: p.originalPrice,
      price_unit: "piece",
      category,
      image_url: p.imageUrl,
      stock: 100,
      rating: 0,
      sold_count: 0,
      sku: p.sku,
      brand_id: brandId,
      is_active: true,
      is_qmall_verified: false,
      is_preorder: false,
      specification: p.specification,
      generic_name: p.genericName,
      requires_prescription: false,
    };
  });

  // Batch insert/upsert in chunks of 25
  const chunkSize = 25;
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await adminSupabase
      .from("products")
      .upsert(chunk, { onConflict: "slug" })
      .select("id, name");

    if (error) {
      console.error(`Error inserting chunk ${i / chunkSize + 1}:`, error);
      throw error;
    }

    totalInserted += (data?.length || chunk.length);
    console.log(`Inserted ${totalInserted}/${rows.length} products...`);
  }

  console.log(`\n🎉 SUCCESS! All ${totalInserted} products directly inserted into Supabase!`);

  // Verify in database
  const { count, error: countErr } = await adminSupabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("brand_id", brandId);

  console.log(`Verified in DB: ${count} total products under Hamdard Laboratories (WAQF) BD!`);
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
