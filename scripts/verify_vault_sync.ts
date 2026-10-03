import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vkfloynvxqkxbqpdlzbd.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmxveW52eHFreGJxcGRsemJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQ0NzMyNSwiZXhwIjoyMDg5MDIzMzI1fQ.KGfBZMEqiEykX6emQp-pOqZTaZfnjQXBzfsrEUTsQK4";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function verify() {
  console.log("Checking all products in Supabase...");

  // 1. Any medex links across the entire database?
  const { data: allMedex } = await supabase
    .from("products")
    .select("id, name, image_url")
    .like("image_url", "%medex%");

  console.log(`Total MedEx images remaining across ENTIRE database: ${allMedex?.length || 0}`);

  // 2. Check Hamdard products
  const brandId = "7213c050-758b-4f6a-a0fa-9351c7c3e46f";
  const { data: hamdardProds } = await supabase
    .from("products")
    .select("id, name, image_url")
    .eq("brand_id", brandId);

  const vaultCount = hamdardProds?.filter(p => p.image_url?.includes("vault.bongbangla.top")).length;
  const nullCount = hamdardProds?.filter(p => !p.image_url).length;

  console.log(`Hamdard total: ${hamdardProds?.length}`);
  console.log(`Hamdard with Vault images: ${vaultCount}`);
  console.log(`Hamdard with null images: ${nullCount}`);

  // 3. Test 5 sample images
  const sample = hamdardProds?.filter(p => p.image_url).slice(0, 5) || [];
  console.log("\nTesting 5 sample Vault image URLs:");
  for (const s of sample) {
    const res = await fetch(s.image_url);
    console.log(`- ${s.name}: Status ${res.status}, Type: ${res.headers.get("content-type")}, Size: ${res.headers.get("content-length")} bytes`);
    console.log(`  URL: ${s.image_url}`);
  }
}

verify();
