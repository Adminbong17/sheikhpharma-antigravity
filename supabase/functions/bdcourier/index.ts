import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = user.id;

    // Verify admin or vendor role
    const { data: roleData } = await adminSupabase.from('user_roles').select('role').eq('user_id', userId);
    const roles = (roleData || []).map(r => r.role);
    const isAdminOrVendor = roles.includes('admin') || roles.includes('vendor');
    if (!isAdminOrVendor) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }

    // Read BDCourier API key from site_settings
    const { data: siteSettings } = await adminSupabase
      .from('site_settings')
      .select('bdcourier_api_key')
      .limit(1)
      .single();

    const API_KEY = (siteSettings as any)?.bdcourier_api_key || '';
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: 'BDCourier API key not configured. Please set it in Admin → Site Settings.' }), { status: 503, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // --- Check Connection ---
    if (action === 'check-connection') {
      const res = await fetch('https://api.bdcourier.com/check-connection', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${API_KEY}` },
      });
      const text = await res.text();
      console.log('BDCourier check-connection response:', text.slice(0, 300));
      let data: any;
      try { data = JSON.parse(text); } catch {
        return new Response(JSON.stringify({ error: 'Invalid response from BDCourier API' }), { status: 502, headers: corsHeaders });
      }
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- My Plan ---
    if (action === 'my-plan' || req.method === 'GET') {
      const res = await fetch('https://api.bdcourier.com/my-plan', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${API_KEY}` },
      });
      const text = await res.text();
      console.log('BDCourier my-plan response:', text.slice(0, 500));
      let data: any;
      try { data = JSON.parse(text); } catch {
        return new Response(JSON.stringify({ error: 'Invalid response from BDCourier API' }), { status: 502, headers: corsHeaders });
      }
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Courier Check (POST with phone) ---
    const { phone } = await req.json();
    if (!phone) {
      return new Response(JSON.stringify({ error: 'phone is required' }), { status: 400, headers: corsHeaders });
    }

    const res = await fetch('https://api.bdcourier.com/courier-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ phone }),
    });

    const text = await res.text();
    console.log('BDCourier raw response:', text.slice(0, 500));

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('BDCourier non-JSON response:', text.slice(0, 300));
      return new Response(JSON.stringify({ error: 'Invalid response from BDCourier API', raw: text.slice(0, 200) }), { status: 502, headers: corsHeaders });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('BDCourier error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
