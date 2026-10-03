import { createClient } from "@supabase/supabase-js";
import { getMedicinePricing } from "../src/lib/medicinePricing";

const SUPABASE_URL = "https://vkfloynvxqkxbqpdlzbd.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmxveW52eHFreGJxcGRsemJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQ0NzMyNSwiZXhwIjoyMDg5MDIzMzI1fQ.KGfBZMEqiEykX6emQp-pOqZTaZfnjQXBzfsrEUTsQK4";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function normalizeHamdardTabletsInDb() {
  console.log("Fetching Hamdard products...");
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, price, original_price, price_unit, specification")
    .eq("brand_id", "7213c050-758b-4f6a-a0fa-9351c7c3e46f");

  if (error || !products) {
    console.error("Error fetching Hamdard products:", error);
    return;
  }

  let count = 0;
  for (const p of products) {
    const med = getMedicinePricing(p);
    if (med && med.isTabletOrCapsule && med.stripPrice && med.unitPrice) {
      const newPrice = med.stripPrice;
      const newOriginalPrice = med.unitPrice;
      const newPriceUnit = med.pcsPerStrip && med.pcsPerStrip > 20 ? "pack" : "strip";

      if (p.price !== newPrice || p.original_price !== newOriginalPrice || p.price_unit !== newPriceUnit) {
        const { error: updateErr } = await supabase
          .from("products")
          .update({
            price: newPrice,
            original_price: newOriginalPrice,
            price_unit: newPriceUnit,
          })
          .eq("id", p.id);

        if (updateErr) {
          console.error(`Failed to update ${p.name}:`, updateErr.message);
        } else {
          count++;
          console.log(`Updated [${count}]: ${p.name} -> price: ৳${newPrice}, unit: ৳${newOriginalPrice}, unit_type: ${newPriceUnit}`);
        }
      }
    }
  }

  console.log(`\nSuccessfully normalized ${count} Hamdard tablets/capsules in Supabase!`);
}

normalizeHamdardTabletsInDb();
