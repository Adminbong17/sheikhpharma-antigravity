import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vkfloynvxqkxbqpdlzbd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmxveW52eHFreGJxcGRsemJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NDczMjUsImV4cCI6MjA4OTAyMzMyNX0.EbvNtvuQGgg-fqAF5jeRa5VwtOOPz1zTM3w_flu5Czo";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parsePricing(p: { name: string; price: number; original_price: number | null; specification: string | null }) {
  const spec = (p.specification || "").replace(/&#039;/g, "'");
  const name = p.name || "";

  const stripMatch = spec.match(/Strip Price:\s*৳?\s*([\d,.]+)/i);
  const unitMatch = spec.match(/Unit Price:\s*৳?\s*([\d,.]+)/i);
  const packMatch = spec.match(/(?:Pack Size:|\(|\s|^)\s*(\d+)\s*[x×*]\s*(\d+)\s*(?::\s*৳?\s*([\d,.]+))?/i);
  const singlePackMatch = spec.match(/(\d+)(?:'s|\s*pcs)?\s*(?:pack|container)(?::\s*৳?\s*([\d,.]+))?/i);

  let stripsPerPack = packMatch ? parseInt(packMatch[1], 10) : null;
  let pcsPerStrip = packMatch ? parseInt(packMatch[2], 10) : null;
  let packPrice = packMatch && packMatch[3] ? parseFloat(packMatch[3].replace(/,/g, "")) : null;

  if (!pcsPerStrip && singlePackMatch) {
    pcsPerStrip = parseInt(singlePackMatch[1], 10);
  }
  if (!packPrice && singlePackMatch && singlePackMatch[2]) {
    packPrice = parseFloat(singlePackMatch[2].replace(/,/g, ""));
  }

  let explicitStripPrice = stripMatch ? parseFloat(stripMatch[1].replace(/,/g, "")) : null;
  let explicitUnitPrice = unitMatch ? parseFloat(unitMatch[1].replace(/,/g, "")) : null;

  let unitPrice = explicitUnitPrice;
  let stripPrice = explicitStripPrice;

  if (!pcsPerStrip) pcsPerStrip = 10;

  if (unitPrice && !stripPrice) {
    if (packPrice && pcsPerStrip && stripsPerPack) {
      stripPrice = Number((packPrice / stripsPerPack).toFixed(2));
    } else {
      stripPrice = Number((unitPrice * pcsPerStrip).toFixed(2));
    }
  }

  if (stripPrice && !unitPrice) {
    unitPrice = Number((stripPrice / pcsPerStrip).toFixed(2));
  }

  if (!stripPrice && !unitPrice) {
    stripPrice = p.price;
    unitPrice = Number((stripPrice / pcsPerStrip).toFixed(2));
  }

  return { name: p.name, unitPrice, stripPrice, pcsPerStrip, packPrice };
}

async function run() {
  const { data } = await supabase
    .from("products")
    .select("name, price, original_price, price_unit, specification")
    .eq("brand_id", "7213c050-758b-4f6a-a0fa-9351c7c3e46f");

  const tabs = (data || []).filter((p) => /tablet|capsule|cap|tab/i.test(p.name));
  console.log(`Found ${tabs.length} Hamdard tablets/capsules:`);
  for (const t of tabs) {
    const res = parsePricing(t);
    console.log(
      `${res.name.padEnd(30)} => Unit: ৳${String(res.unitPrice).padEnd(6)} | Strip: ৳${String(res.stripPrice).padEnd(6)} (${res.pcsPerStrip} pcs) ${res.packPrice ? "| Pack: ৳" + res.packPrice : ""}`
    );
  }
}

run();
