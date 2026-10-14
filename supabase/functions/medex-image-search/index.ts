const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

function slugNormalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

function scoreMatch(inputName: string, slug: string): number {
  const inputSlug = slugNormalize(inputName);
  if (slug === inputSlug) return 100;
  if (slug.startsWith(inputSlug + '-') || slug.startsWith(inputSlug)) return 90;

  const inputTokens = inputSlug.split('-').filter(w => w.length >= 2);
  const slugTokens = slug.split('-').filter(w => w.length >= 2);
  if (inputTokens.length === 0) return 0;

  let matched = 0;
  for (const t of inputTokens) {
    if (slugTokens.includes(t)) matched++;
  }
  return (matched / inputTokens.length) * 80;
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
      // ignore token parse error
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

    // 1. Search Medex
    const searchUrl = `https://medex.com.bd/search?search=${encodeURIComponent(name.trim())}`;
    console.log(`Searching Medex: ${searchUrl}`);

    const searchHtml = await fetchHtml(searchUrl);
    if (!searchHtml) {
      return new Response(JSON.stringify({ success: false, error: 'Medex search failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Extract drug page links /brands/{id}/{slug}
    const linkRegex = /\/brands\/(\d+)\/([a-z0-9-]+)/g;
    const seen = new Set<string>();
    const candidates: { id: string; slug: string; score: number }[] = [];

    let m;
    while ((m = linkRegex.exec(searchHtml)) !== null) {
      const key = `${m[1]}/${m[2]}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({ id: m[1], slug: m[2], score: scoreMatch(name.trim(), m[2]) });
      }
    }

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Medex এ কোনো ফলাফল পাওয়া যায়নি' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Sort by best match score
    candidates.sort((a, b) => b.score - a.score);
    console.log(`Found ${candidates.length} candidates. Top: ${candidates[0].slug} (score: ${candidates[0].score})`);

    // 4. Check top 3 candidates for pack images
    const topCandidates = candidates.slice(0, 3);

    for (const c of topCandidates) {
      const drugUrl = `https://medex.com.bd/brands/${c.id}/${c.slug}`;
      console.log(`Checking drug page: ${drugUrl}`);

      const drugHtml = await fetchHtml(drugUrl);
      if (!drugHtml) continue;

      const imgMatch = /https:\/\/medex\.com\.bd\/storage\/images\/packaging\/[^"'\s>]+/.exec(drugHtml);
      if (imgMatch) {
        const drugName = c.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log(`Found pack image for "${drugName}": ${imgMatch[0]}`);

        return new Response(JSON.stringify({
          success: true,
          image_url: imgMatch[0],
          medex_url: drugUrl,
          drug_name: drugName,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Medex এ এই প্রোডাক্টের ছবি পাওয়া যায়নি',
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
