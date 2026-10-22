const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VAULT_API_URL = "https://api.bongbangla.top/vault-api";
const VAULT_EMAIL = "shop@sheikhpharma.shop";
const VAULT_PASSWORD = "Aktmtbar@1";

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ── KNOWN COMPANY PREFIXES to strip from product names ──
const COMPANY_PREFIXES = [
  'square', 'beximco', 'incepta', 'aci', 'renata', 'eskayef', 'opsonin',
  'acme', 'aristopharma', 'drug international', 'globe', 'ibnsina',
  'jayson', 'nuvista', 'orion', 'popular', 'radiant', 'sanofi',
  'healthcare', 'pharma', 'pharmaceuticals', 'ltd', 'limited',
  'genera', 'unimed', 'beacon', 'navana',
];

// ── PACK SIZE PATTERNS to strip (e.g. "10x10", "30's", "strip of 10") ──
const PACK_PATTERNS = [
  /\b\d+\s*x\s*\d+\b/gi,              // 10x10, 5x10
  /\b\d+'s?\b/gi,                       // 30's, 30s
  /\bstrip\s*(of\s*)?\d*\b/gi,         // strip, strip of 10
  /\bpack\s*(of\s*)?\d*\b/gi,          // pack, pack of 30
  /\bbox\s*(of\s*)?\d*\b/gi,           // box, box of 10
  /\b(per|each)\s*(strip|pack|box|piece)\b/gi,
  /\bpcs?\b/gi,                         // pc, pcs
];

// Extract the clean brand name and strength numbers from a product title
function extractBrandInfo(productName: string) {
  let text = productName.trim();

  // 0. STRIP company prefixes from the beginning
  let lowerCheck = text.toLowerCase();
  for (const prefix of COMPANY_PREFIXES) {
    if (lowerCheck.startsWith(prefix + ' ') || lowerCheck.startsWith(prefix + '-')) {
      text = text.substring(prefix.length).replace(/^[\s\-]+/, '');
      lowerCheck = text.toLowerCase();
    }
  }

  // 0b. STRIP pack-size patterns BEFORE number extraction so "10x10" doesn't pollute strength
  for (const pat of PACK_PATTERNS) {
    text = text.replace(pat, ' ');
  }
  text = text.replace(/\s+/g, ' ').trim();

  // 1. Extract REAL strength numbers (only those followed by a unit like mg, mcg, ml, iu, %)
  const strengthNumbers: string[] = [];
  const strengthRx = /(\d+(?:\.\d+)?)\s*(mg|mcg|gm|g|ml|iu|%|unit)/gi;
  let sm;
  while ((sm = strengthRx.exec(text)) !== null) {
    strengthNumbers.push(sm[1]);
  }

  // Also extract standalone numbers that are NOT pack sizes (for "Sergel 20", "Napa 500")
  const bareNumbers: string[] = [];
  const bareRx = /\b(\d+(?:\.\d+)?)\b/g;
  let bm;
  while ((bm = bareRx.exec(text)) !== null) {
    bareNumbers.push(bm[1]);
  }

  // Use strength numbers if we found unit-qualified ones; otherwise use bare numbers
  const numbers = strengthNumbers.length > 0 ? strengthNumbers : bareNumbers;

  // 2. Extract dosage forms and route of administration for strict matching
  const requiredForms: string[] = [];
  const lower = text.toLowerCase();
  if (/\b(im|intramuscular)\b/i.test(lower)) requiredForms.push('im');
  if (/\b(iv|intravenous)\b/i.test(lower)) requiredForms.push('iv');
  if (/\b(sc|subcutaneous)\b/i.test(lower)) requiredForms.push('sc');
  if (/\b(tablets?|tab)\b/i.test(lower)) requiredForms.push('tablet');
  if (/\b(capsules?|cap)\b/i.test(lower)) requiredForms.push('capsule');
  if (/\b(syrups?)\b/i.test(lower)) requiredForms.push('syrup');
  if (/\b(suspensions?)\b/i.test(lower)) requiredForms.push('suspension');
  if (/\b(injections?|inj)\b/i.test(lower)) requiredForms.push('injection');
  if (/\b(infusions?)\b/i.test(lower)) requiredForms.push('infusion');
  if (/\b(suppositor(y|ies))\b/i.test(lower)) requiredForms.push('suppository');
  if (/\b(drops?)\b/i.test(lower)) requiredForms.push('drops');
  if (/\b(gels?)\b/i.test(lower)) requiredForms.push('gel');
  if (/\b(creams?)\b/i.test(lower)) requiredForms.push('cream');
  if (/\b(ointments?)\b/i.test(lower)) requiredForms.push('ointment');

  // 3. Remove complex strength patterns: 500 mg, 0.5 mg+10 mg, 100 IU, 20%, (1 gm+1.3 gm)/50 gm
  text = text.replace(/\(?\d+(\.\d+)?\s*(mg|mcg|gm|g|ml|iu|%|unit)\s*([\+\/]\s*\d+(\.\d+)?\s*(mg|mcg|gm|g|ml|iu|%|unit))*\)?(\/\d+(\.\d+)?\s*(mg|mcg|gm|g|ml|iu|%|unit|vial|puff))*/gi, ' ');
  text = text.replace(/\b\d+(\.\d+)?\s*(mg|mcg|gm|g|ml|iu|%|unit|vial|puff)\b/gi, ' ');
  text = text.replace(/\b\d+(\.\d+)?\b/g, ' ');

  // 4. Convert slashes, commas, plus, brackets to spaces so words like /vial become " vial "
  text = text.replace(/[\/\(\)\+,\.]/g, ' ').replace(/\s+/g, ' ');

  // 5. Remove dosage form descriptors using SPACE-BOUNDARY (not \b) to protect
  //    hyphenated brand names like A-Gel, A-Cal, A-Pect, A-Ket etc.
  const forms = [
    'chewable tablets?', 'dispersible tablets?', 'orally disintegrating tablets?',
    'effervescent tablets?', 'extended release tablets?', 'sustained release tablets?',
    'film coated tablets?', 'ec tablets?', 'mups tablets?',
    'tablets?', 'capsules?', 'syrups?', 'suspensions?', 'injections?',
    'paediatric drops?', 'pediatric drops?', 'eye drops?', 'ear drops?', 'nasal drops?',
    'drops?', 'topical gels?', 'oral gels?', 'gels?', 'creams?', 'ointments?',
    'oral solutions?', 'iv infusions?', 'infusions?', 'ophthalmic suspensions?',
    'suppositories', 'suppository', 'inhalers?', 'rotacaps?', 'respcaps?',
    'shampoo', 'lotions?', 'sprays?', 'mouthwash', 'solutions?', 'elixir',
    'emulsions?', 'powders?', 'granules?', 'patch', 'condom',
    'chewable', 'dispersible', 'effervescent', 'topical', 'ophthalmic', 'oral',
    'sr', 'xr', 'cr', 'tr', 'dr', 'er', 'mr', 'ec', 'mups',
    'im', 'iv', 'sc', 'vial', 'puff',
  ];

  for (const f of forms) {
    // Use space/start/end as boundary — never \b which treats hyphens as boundary
    const rx = new RegExp(`(\\s+|^)${f}(\\s+|$)`, 'gi');
    text = text.replace(rx, ' ');
  }

  text = text.replace(/\s+/g, ' ').trim();

  const brandSlug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();

  return { brandName: text, brandSlug, numbers, requiredForms };
}

// ── SMART SCORING ──
// When the product name has NO numbers (e.g. "Napa Rapid Tablet"), we accept
// any candidate that starts with the brand slug. We only reject on power
// mismatch when the product itself specifies a power.
function scoreCandidate(candidateSlug: string, brandSlug: string, numbers: string[], requiredForms: string[] = []): number {
  const norm = candidateSlug.toLowerCase();

  // Candidate MUST start with the brand slug (e.g. a-cal-d-500-mg-tablet starts with a-cal-d-)
  const isMatch = norm === brandSlug || norm.startsWith(brandSlug + '-');
  if (!isMatch) {
    return -1; // REJECT — wrong brand
  }

  // 1. POWER MATCH — only enforce if the product name itself had numbers
  if (numbers.length > 0) {
    const candidateNumbers = [...norm.matchAll(/(\d+(?:\.\d+)?)/g)].map(m => m[0]);
    for (const cn of candidateNumbers) {
      if (!numbers.includes(cn)) {
        return -1; // REJECT — different strength/power
      }
    }
  }
  // If numbers.length === 0, we ACCEPT any power variant (first match wins)

  // 2. STRICT ROUTE MATCH (IM vs IV)
  if (requiredForms.includes('im') && (norm.includes('-iv-') || norm.includes('iv-injection') || norm.includes('iv-infusion'))) {
    return -1;
  }
  if (requiredForms.includes('iv') && (norm.includes('-im-') || norm.includes('im-injection'))) {
    return -1;
  }

  // 3. STRICT FORM MATCH (Tablet vs Capsule vs Syrup vs Suppository)
  if (requiredForms.includes('tablet') && (norm.includes('capsule') || norm.includes('syrup') || norm.includes('suppository'))) {
    return -1;
  }
  if (requiredForms.includes('capsule') && (norm.includes('tablet') || norm.includes('syrup') || norm.includes('suppository'))) {
    return -1;
  }
  if (requiredForms.includes('syrup') && (norm.includes('suspension') || norm.includes('tablet'))) {
    return -1;
  }
  if (requiredForms.includes('suspension') && (norm.includes('syrup') || norm.includes('tablet'))) {
    return -1;
  }
  if (requiredForms.includes('suppository') && (norm.includes('tablet') || norm.includes('capsule') || norm.includes('syrup'))) {
    return -1;
  }

  let score = 100;
  // Bonus for each matching strength number found in the slug
  for (const num of numbers) {
    if (norm.includes('-' + num + '-') || norm.endsWith('-' + num)) {
      score += 30;
    }
  }
  // Bonus for each matching dosage form found in the slug
  for (const f of requiredForms) {
    if (norm.includes(f)) {
      score += 50;
    }
  }
  // Bonus for shorter/more-specific slugs (prefer exact match)
  if (norm === brandSlug) {
    score += 20;
  }
  return score;
}

// Upload downloaded image to FileVault (vault.bongbangla.top)
async function uploadToVaultDirect(imgBytes: Uint8Array, fileName: string, mime: string): Promise<string> {
  const loginRes = await fetch(`${VAULT_API_URL}/login.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: VAULT_EMAIL, password: VAULT_PASSWORD }),
  });

  if (!loginRes.ok) {
    throw new Error(`Vault login failed: ${loginRes.statusText}`);
  }

  const loginData = await loginRes.json();
  const token = loginData?.token;
  if (!token) {
    throw new Error(loginData?.error || "Vault token missing");
  }

  const formData = new FormData();
  formData.append("upload_id", `medex-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  formData.append("chunk_index", "0");
  formData.append("total_chunks", "1");
  formData.append("file_name", fileName);
  formData.append("file_size", String(imgBytes.byteLength));
  formData.append("mime", mime);
  formData.append("chunk", new Blob([imgBytes], { type: mime }), fileName);

  const upRes = await fetch(`${VAULT_API_URL}/upload-chunk.php`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!upRes.ok) {
    const errText = await upRes.text();
    throw new Error(`Vault upload failed: ${errText}`);
  }

  const upData = await upRes.json();
  const shareToken = upData?.file?.share_token;
  if (!shareToken) {
    throw new Error("No share token returned from FileVault");
  }

  return `${VAULT_API_URL}/share.php?t=${shareToken}`;
}

// Download an image from a URL and upload it to FileVault
// Falls back to the original Medex URL if FileVault upload fails
async function downloadAndUpload(imageUrl: string, brandSlug: string): Promise<{ vaultUrl: string | null; fallbackUrl: string }> {
  let vaultUrl: string | null = null;
  try {
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });

    if (imgRes.ok) {
      const imgBuffer = await imgRes.arrayBuffer();
      const imgBytes = new Uint8Array(imgBuffer);
      const ext = imageUrl.split('.').pop()?.split('?')[0] || 'webp';
      const fileName = `${brandSlug}-${Date.now()}.${ext}`;
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/webp';

      vaultUrl = await uploadToVaultDirect(imgBytes, fileName, mime);
      console.log(`Uploaded to FileVault: ${vaultUrl}`);
    }
  } catch (vaultErr) {
    console.error("Vault upload failed, returning Medex URL as fallback:", vaultErr);
  }
  return { vaultUrl, fallbackUrl: imageUrl };
}

// ── BROADER IMAGE EXTRACTION from drug page ──
// Looks in packaging first, then falls back to any product image on the page
function extractDrugImage(drugHtml: string): string | null {
  // Priority 1: packaging folder
  const packMatch = /https:\/\/medex\.com\.bd\/storage\/images\/packaging\/[^"'\s>]+/.exec(drugHtml);
  if (packMatch) return packMatch[0];

  // Priority 2: any medex product/brand image (data-src or src)
  const dataSrcMatch = /data-src=["'](https:\/\/medex\.com\.bd\/storage\/images\/[^"']+)["']/i.exec(drugHtml);
  if (dataSrcMatch) return dataSrcMatch[1];

  // Priority 3: og:image meta tag
  const ogMatch = /property=["']og:image["']\s+content=["']([^"']+)["']/i.exec(drugHtml);
  if (ogMatch && ogMatch[1].includes('medex.com.bd')) return ogMatch[1];

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    let isAuthorized = false;

    // Check if token has service_role or admin/vendor
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadStr);
        if (payload.role === 'service_role') {
          isAuthorized = true;
        }
      }
    } catch (_e) {
      // ignore
    }

    if (!isAuthorized && token) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!userError && user) {
        const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
        const userRoles = (roles || []).map((r: any) => r.role);
        if (userRoles.includes('admin') || userRoles.includes('vendor')) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized: admin or vendor role required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name } = await req.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'Product name is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const productName = name.trim();
    const { brandName, brandSlug, numbers, requiredForms } = extractBrandInfo(productName);
    console.log(`Product: "${productName}" => Brand: "${brandName}" (slug: "${brandSlug}"), Numbers:`, numbers, "Forms:", requiredForms);

    // If brand slug is empty or just dashes (e.g. Bengali-only name), use the raw product name for search
    const isSlugEmpty = !brandSlug || brandSlug === '-' || brandSlug.length < 2;

    // Helper: extract candidates from HTML
    const linkRegex = /\/brands\/(\d+)\/([a-z0-9-]+)/g;
    const seen = new Set<string>();
    let candidates: { id: string; slug: string; score: number }[] = [];

    function extractCandidates(html: string) {
      let m;
      const rx = new RegExp(linkRegex.source, 'g');
      while ((m = rx.exec(html)) !== null) {
        const key = `${m[1]}/${m[2]}`;
        if (!seen.has(key)) {
          seen.add(key);
          if (isSlugEmpty) {
            // Can't do slug matching — accept all candidates from the search page
            candidates.push({ id: m[1], slug: m[2], score: 50 });
          } else {
            const score = scoreCandidate(m[2], brandSlug, numbers, requiredForms);
            if (score > 0) {
              candidates.push({ id: m[1], slug: m[2], score });
            }
          }
        }
      }
    }

    // ── SEARCH STRATEGY ──────────────────────────────────────────

    // 1. Search Medex with clean Brand Name
    let searchUrl = `https://medex.com.bd/search?search=${encodeURIComponent(brandName || productName)}`;
    let searchHtml = await fetchHtml(searchUrl);

    if (searchHtml) {
      extractCandidates(searchHtml);
    }

    // 2. Fallback: search with full product name if no candidates yet
    if (candidates.length === 0) {
      searchUrl = `https://medex.com.bd/search?search=${encodeURIComponent(productName)}`;
      searchHtml = await fetchHtml(searchUrl);
      if (searchHtml) {
        extractCandidates(searchHtml);
      }
    }

    // 3. Fallback: search with just the primary brand word(s) (first 1-2 words)
    if (candidates.length === 0 && brandName) {
      const primaryWord = brandName.split(/\s+/).slice(0, 1).join(' ');
      if (primaryWord && primaryWord !== brandName) {
        searchUrl = `https://medex.com.bd/search?search=${encodeURIComponent(primaryWord)}`;
        searchHtml = await fetchHtml(searchUrl);
        if (searchHtml) {
          extractCandidates(searchHtml);
        }
      }
    }

    if (candidates.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: `Medex এ "${brandName || productName}" এর মিল পাওয়া যায়নি`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sort strictly by highest score
    candidates.sort((a, b) => b.score - a.score);
    console.log(`Found ${candidates.length} valid candidates. Best: ${candidates[0].slug} (score: ${candidates[0].score})`);

    // 4. Check up to 10 candidates for packaging image (not just 3!)
    const topCandidates = candidates.slice(0, 10);
    for (const c of topCandidates) {
      const drugUrl = `https://medex.com.bd/brands/${c.id}/${c.slug}`;
      const drugHtml = await fetchHtml(drugUrl);
      if (!drugHtml) continue;

      const medexImageUrl = extractDrugImage(drugHtml);
      if (medexImageUrl) {
        const drugName = c.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log(`Found image on candidate ${c.slug}: ${medexImageUrl}`);

        // Download and upload to FileVault (with Medex URL fallback)
        const result = await downloadAndUpload(medexImageUrl, brandSlug || c.slug);
        const finalUrl = result.vaultUrl || result.fallbackUrl;

        return new Response(JSON.stringify({
          success: true,
          vault_url: result.vaultUrl,
          image_url: finalUrl,
          medex_url: drugUrl,
          drug_name: drugName,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: `Medex এ "${brandName || productName}" এর প্যাকেজ ছবি নেই`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in medex-image-search:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
