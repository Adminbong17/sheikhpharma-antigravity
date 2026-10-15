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

// Extract the clean brand name and strength numbers from a product title
function extractBrandInfo(productName: string) {
  let text = productName.trim();

  // 1. Extract strength numbers FIRST (before any stripping)
  const numbers = [...text.matchAll(/\d+(\.\d+)?/g)].map(m => m[0]);

  // 2. Remove complex strength patterns: 500 mg, 0.5 mg+10 mg, 100 IU, 20%, (1 gm+1.3 gm)/50 gm
  text = text.replace(/\(?\d+(\.\d+)?\s*(mg|mcg|gm|g|ml|iu|%|unit)\s*([\+\/]\s*\d+(\.\d+)?\s*(mg|mcg|gm|g|ml|iu|%|unit))*\)?(\/\d+(\.\d+)?\s*(mg|mcg|gm|g|ml|iu|%|unit|vial|puff))*/gi, ' ');

  // Remove remaining standalone number+unit combos and bare numbers
  text = text.replace(/\b\d+(\.\d+)?\s*(mg|mcg|gm|g|ml|iu|%|unit|vial|puff)\b/gi, ' ');
  text = text.replace(/\b\d+(\.\d+)?\b/g, ' ');

  // 3. Convert slashes, commas, plus, brackets to spaces so words like /vial become " vial "
  text = text.replace(/[\/\(\)\+,\.]/g, ' ').replace(/\s+/g, ' ');

  // 4. Remove dosage form descriptors using SPACE-BOUNDARY (not \b) to protect
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
    .trim();

  return { brandName: text, brandSlug, numbers };
}

// Strict score candidate against the brand — REJECTS wrong power/strength
function scoreCandidate(candidateSlug: string, brandSlug: string, numbers: string[]): number {
  const norm = candidateSlug.toLowerCase();
  // Candidate MUST start with the brand slug (e.g. a-cal-d-500-mg-tablet starts with a-cal-d-)
  const isMatch = norm === brandSlug || norm.startsWith(brandSlug + '-');
  if (!isMatch) {
    return -1; // REJECT — wrong brand
  }

  // STRICT POWER MATCH: extract numbers from the candidate slug
  const candidateNumbers = [...norm.matchAll(/(\d+(?:\.\d+)?)/g)].map(m => m[0]);

  // Reject if candidate contains ANY number NOT present in the product's numbers
  // e.g. product is "Maxpro 40 mg" (numbers=["40"]), candidate "maxpro-20-mg-tablet"
  //      has "20" which is NOT in ["40"] → REJECT (wrong strength!)
  for (const cn of candidateNumbers) {
    if (!numbers.includes(cn)) {
      return -1; // REJECT — different strength/power
    }
  }

  let score = 100;
  // Bonus for each matching strength number found in the slug
  for (const num of numbers) {
    if (norm.includes('-' + num + '-') || norm.endsWith('-' + num)) {
      score += 30;
    }
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
async function downloadAndUpload(imageUrl: string, brandSlug: string): Promise<{ vaultUrl: string | null }> {
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
    console.error("Direct Vault upload failed, returning original URL as fallback:", vaultErr);
  }
  return { vaultUrl };
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
    const { brandName, brandSlug, numbers } = extractBrandInfo(productName);
    console.log(`Product: "${productName}" => Brand: "${brandName}" (slug: "${brandSlug}"), Numbers:`, numbers);

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
          const score = scoreCandidate(m[2], brandSlug, numbers);
          if (score > 0) {
            candidates.push({ id: m[1], slug: m[2], score });
          }
        }
      }
    }

    // Helper: try to grab a packaging image matching our brand from search page HTML
    function grabSearchPageImage(html: string): string | null {
      const imgRegex = new RegExp(
        `https://medex\\.com\\.bd/storage/images/packaging/${brandSlug.replace(/-/g, '[-]?')}[^"'\\s>]+`,
        'i'
      );
      const match = imgRegex.exec(html);
      return match ? match[0] : null;
    }

    // ── SEARCH STRATEGY ──────────────────────────────────────────

    // 1. Search Medex with clean Brand Name
    let searchUrl = `https://medex.com.bd/search?search=${encodeURIComponent(brandName || productName)}`;
    let searchHtml = await fetchHtml(searchUrl);

    if (searchHtml) {
      // Quick-grab: check if the search results page itself has a matching packaging image
      const quickImg = grabSearchPageImage(searchHtml);
      if (quickImg) {
        console.log(`Quick-grab from search page: ${quickImg}`);
        // Still need to find the matching brand URL for metadata
        extractCandidates(searchHtml);
        const bestCandidate = candidates.length > 0 ? candidates.sort((a, b) => b.score - a.score)[0] : null;
        const drugUrl = bestCandidate ? `https://medex.com.bd/brands/${bestCandidate.id}/${bestCandidate.slug}` : searchUrl;
        const drugName = bestCandidate ? bestCandidate.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : brandName;

        // Download & upload to FileVault
        const result = await downloadAndUpload(quickImg, brandSlug);
        return new Response(JSON.stringify({
          success: true,
          vault_url: result.vaultUrl,
          image_url: result.vaultUrl || quickImg,
          medex_url: drugUrl,
          drug_name: drugName,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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

      const imgMatch = /https:\/\/medex\.com\.bd\/storage\/images\/packaging\/[^"'\s>]+/.exec(drugHtml);
      if (imgMatch) {
        const medexImageUrl = imgMatch[0];
        const drugName = c.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log(`Found pack image on candidate ${c.slug}: ${medexImageUrl}`);

        // Download and upload to FileVault
        const result = await downloadAndUpload(medexImageUrl, brandSlug);
        return new Response(JSON.stringify({
          success: true,
          vault_url: result.vaultUrl,
          image_url: result.vaultUrl || medexImageUrl,
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
