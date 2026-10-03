import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vkfloynvxqkxbqpdlzbd.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmxveW52eHFreGJxcGRsemJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQ0NzMyNSwiZXhwIjoyMDg5MDIzMzI1fQ.KGfBZMEqiEykX6emQp-pOqZTaZfnjQXBzfsrEUTsQK4";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const VAULT_API = "https://api.bongbangla.top/vault-api";
const VAULT_EMAIL = "shop@sheikhpharma.shop";
const VAULT_PASS = "Aktmtbar@1";

function getRootWord(n: string): string {
  let clean = n
    .replace(/\(.*?\)/g, " ")
    .replace(/hamdard\s*/gi, "")
    .replace(/\d+(\.\d+)?\s*(mg|ml|gm|g|%|kg)\b/gi, "")
    .replace(/tablet|capsule|syrup|ointment|gel|sachet|powder|suspension|cream|lotion|oil|semisolid|preparation|liquid|topical|oral/gi, "")
    .replace(/[^a-z0-9]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return clean;
}

async function loginVault(): Promise<string> {
  console.log("Logging into FileVault (vault.bongbangla.top)...");
  const res = await fetch(`${VAULT_API}/login.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: VAULT_EMAIL, password: VAULT_PASS }),
  });
  if (!res.ok) throw new Error(`Vault login failed with status ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error("No token returned from Vault login");
  console.log("Vault login successful!");
  return data.token;
}

async function uploadToVault(token: string, buffer: Buffer, fileName: string, mime: string): Promise<string> {
  const uploadId = crypto.randomUUID();
  const form = new FormData();
  form.append("upload_id", uploadId);
  form.append("chunk_index", "0");
  form.append("total_chunks", "1");
  form.append("file_name", fileName);
  form.append("file_size", String(buffer.length));
  form.append("mime", mime);
  form.append("chunk", new Blob([buffer], { type: mime }), fileName);

  const res = await fetch(`${VAULT_API}/upload-chunk.php`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) throw new Error(`Vault upload failed: ${res.statusText}`);
  const json = await res.json();
  const shareToken = json?.file?.share_token;
  if (!shareToken) throw new Error(`Vault upload did not return share_token: ${JSON.stringify(json)}`);
  return `${VAULT_API}/share.php?t=${shareToken}`;
}

async function main() {
  const vaultToken = await loginVault();

  console.log("Fetching Hamdard official catalog...");
  const catRes = await fetch("https://hamdard.aimanager24.com/api/products/all-info?title=&limit=250&page=1");
  const catJson = await catRes.json();
  const hamdardItems: any[] = catJson.data?.items || [];
  console.log(`Fetched ${hamdardItems.length} official items from Hamdard.`);

  const brandId = "7213c050-758b-4f6a-a0fa-9351c7c3e46f";
  console.log("Fetching products from Supabase database...");
  const { data: supaProds, error: supaErr } = await supabase
    .from("products")
    .select("id, name, slug, image_url")
    .eq("brand_id", brandId);

  if (supaErr || !supaProds) {
    throw new Error(`Failed to fetch Supabase products: ${supaErr?.message}`);
  }
  console.log(`Found ${supaProds.length} Hamdard products in Supabase.`);

  // URL upload cache to avoid downloading/uploading identical official images multiple times
  const uploadedUrlCache = new Map<string, string>();

  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < supaProds.length; i++) {
    const sp = supaProds[i];
    const spRoot = getRootWord(sp.name);

    // Matching logic
    let match: any = null;

    // Special cases
    if (sp.name.toLowerCase().includes("ors")) {
      match = hamdardItems.find(h => h.title.includes("O R S"));
    } else if (sp.name.toLowerCase().includes("rooh afza")) {
      match = hamdardItems.find(h => h.title.toLowerCase().includes("rooh afza"));
    } else if (sp.name.toLowerCase().includes("qarhin")) {
      match = hamdardItems.find(h => h.title.toLowerCase().includes("qarhin"));
    }

    if (!match) {
      match = hamdardItems.find(h => {
        const hRoot = getRootWord(h.title);
        return hRoot === spRoot && h.thumbnail;
      });
    }

    if (!match && spRoot.length >= 3) {
      match = hamdardItems.find(h => {
        const hRoot = getRootWord(h.title);
        return (hRoot.startsWith(spRoot) || spRoot.startsWith(hRoot)) && h.thumbnail;
      });
    }

    if (!match) {
      const firstTok = spRoot.split(" ")[0];
      if (firstTok && firstTok.length >= 4) {
        const candidates = hamdardItems.filter(h => {
          const hRoot = getRootWord(h.title);
          return hRoot.split(" ")[0] === firstTok && h.thumbnail;
        });
        if (candidates.length === 1) {
          match = candidates[0];
        } else if (candidates.length > 1) {
          const secondTok = spRoot.split(" ")[1];
          if (secondTok) {
            match = candidates.find(c => getRootWord(c.title).includes(secondTok));
          }
          if (!match) match = candidates[0];
        }
      }
    }

    if (!match || !match.thumbnail) {
      console.log(`[${i + 1}/${supaProds.length}] No Hamdard official image match for: "${sp.name}"`);
      skippedCount++;
      continue;
    }

    const officialImgUrl = `https://hamdard.aimanager24.com${match.thumbnail}`;

    try {
      let vaultUrl = uploadedUrlCache.get(officialImgUrl);

      if (!vaultUrl) {
        // Download official packshot
        const imgRes = await fetch(officialImgUrl);
        if (!imgRes.ok) {
          console.error(`Failed to download official image: ${officialImgUrl}`);
          failedCount++;
          continue;
        }
        const imgBuf = Buffer.from(await imgRes.arrayBuffer());
        const ext = match.thumbnail.endsWith(".webp") ? "webp" : "png";
        const mime = ext === "webp" ? "image/webp" : "image/png";
        const fileName = `${sp.slug}.${ext}`;

        // Upload to FileVault
        vaultUrl = await uploadToVault(vaultToken, imgBuf, fileName, mime);
        uploadedUrlCache.set(officialImgUrl, vaultUrl);
        console.log(`Uploaded to Vault -> ${vaultUrl} (${fileName})`);
      }

      // Update Supabase DB
      const { error: updateErr } = await supabase
        .from("products")
        .update({ image_url: vaultUrl })
        .eq("id", sp.id);

      if (updateErr) {
        console.error(`Failed to update DB for ${sp.name}:`, updateErr.message);
        failedCount++;
      } else {
        updatedCount++;
        console.log(`[${i + 1}/${supaProds.length}] Updated "${sp.name}" -> ${vaultUrl}`);
      }
    } catch (err: any) {
      console.error(`Error processing "${sp.name}":`, err.message);
      failedCount++;
    }
  }

  console.log("\n================ SYNC SUMMARY ================");
  console.log(`Total Products: ${supaProds.length}`);
  console.log(`Updated to Vault: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Failed: ${failedCount}`);

  // Final check for medex links
  const { data: remainingMedex } = await supabase
    .from("products")
    .select("id, name, image_url")
    .eq("brand_id", brandId)
    .like("image_url", "%medex.com.bd%");

  console.log(`Remaining MedEx images in Supabase: ${remainingMedex?.length || 0}`);
}

main().catch(console.error);
