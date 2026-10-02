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

    const token = authHeader.replace('Bearer ', '');
    const { data, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !data?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { invoice_id, order_id, payment_type } = body;

    // Read config from DB (falls back to env vars or sandbox defaults)
    let UDDOKTAPAY_BASE_URL = Deno.env.get('UDDOKTAPAY_BASE_URL') || 'https://sandbox.uddoktapay.com';
    let UDDOKTAPAY_API_KEY = Deno.env.get('UDDOKTAPAY_API_KEY') || '982d381360a69d419689740d9f2e26ce36fb7a50';

    const { data: siteSettings } = await adminSupabase
      .from('site_settings')
      .select('uddoktapay_base_url, uddoktapay_api_key')
      .single();
    if (siteSettings?.uddoktapay_base_url) UDDOKTAPAY_BASE_URL = siteSettings.uddoktapay_base_url;
    if (siteSettings?.uddoktapay_api_key) UDDOKTAPAY_API_KEY = siteSettings.uddoktapay_api_key;

    // Normalize: strip trailing /api or /api/ to prevent double /api in URL
    UDDOKTAPAY_BASE_URL = UDDOKTAPAY_BASE_URL.replace(/\/api\/?$/, '');

    const res = await fetch(`${UDDOKTAPAY_BASE_URL}/api/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'RT-UDDOKTAPAY-API-KEY': UDDOKTAPAY_API_KEY,
      },
      body: JSON.stringify({ invoice_id }),
    });

    const result = await res.json();

    if (result.status === 'COMPLETED') {
      // COD delivery charge advance payment: keep payment_method as COD, just confirm order
      // Full UddoktaPay payment: update payment_method to uddokta_pay
      const isCodDelivery = payment_type === 'cod_delivery';

      await adminSupabase
        .from('orders')
        .update({
          status: 'processing',
          transaction_id: result.transaction_id,
          payment_method: isCodDelivery
            ? `cod (delivery charge paid via uddokta_pay)`
            : `uddokta_pay (${result.payment_method})`,
        })
        .eq('id', order_id);

      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, status: result.status, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
