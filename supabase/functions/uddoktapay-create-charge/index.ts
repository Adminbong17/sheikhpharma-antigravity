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

    const token = authHeader.replace('Bearer ', '');
    const { data, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !data?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const userId = data.claims.sub;
    const body = await req.json();
    const { full_name, email, amount, order_id, redirect_url, cancel_url } = body;

    const UDDOKTAPAY_BASE_URL_ENV = Deno.env.get('UDDOKTAPAY_BASE_URL');
    const UDDOKTAPAY_API_KEY_ENV = Deno.env.get('UDDOKTAPAY_API_KEY');

    // Read config from DB if env vars not set
    let UDDOKTAPAY_BASE_URL = UDDOKTAPAY_BASE_URL_ENV || 'https://sandbox.uddoktapay.com';
    let UDDOKTAPAY_API_KEY = UDDOKTAPAY_API_KEY_ENV || '982d381360a69d419689740d9f2e26ce36fb7a50';

    if (!UDDOKTAPAY_BASE_URL_ENV || !UDDOKTAPAY_API_KEY_ENV) {
      const adminSupabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { data: siteSettings } = await adminSupabase
        .from('site_settings')
        .select('uddoktapay_base_url, uddoktapay_api_key')
        .single();
      if (siteSettings?.uddoktapay_base_url) UDDOKTAPAY_BASE_URL = siteSettings.uddoktapay_base_url;
      if (siteSettings?.uddoktapay_api_key) UDDOKTAPAY_API_KEY = siteSettings.uddoktapay_api_key;
    }

    // Normalize: strip trailing /api or /api/ to prevent double /api in URL
    UDDOKTAPAY_BASE_URL = UDDOKTAPAY_BASE_URL.replace(/\/api\/?$/, '');

    const payload = {
      full_name,
      email,
      amount: String(amount),
      metadata: { user_id: userId, order_id },
      redirect_url,
      return_type: 'GET',
      cancel_url,
      webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/uddoktapay-webhook`,
    };

    const res = await fetch(`${UDDOKTAPAY_BASE_URL}/api/checkout-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'RT-UDDOKTAPAY-API-KEY': UDDOKTAPAY_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!result.status) {
      return new Response(JSON.stringify({ error: result.message || 'Payment initiation failed' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ payment_url: result.payment_url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
