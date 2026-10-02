import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Safe JSON parser — returns parsed object or { error, raw } on failure
async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error('Steadfast non-JSON response:', text.slice(0, 300));
    return { status: res.status, error: text.slice(0, 300), raw: true };
  }
}

const STEADFAST_BASE = 'https://portal.packzy.com/api/v1';

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

    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const { data: roleData } = await adminSupabase.from('user_roles').select('role').eq('user_id', user.id);
    const isAdmin = (roleData || []).some(r => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }

    // Read Steadfast credentials from site_settings (DB), fallback to env secrets
    const { data: siteSettings } = await adminSupabase
      .from('site_settings')
      .select('steadfast_api_key, steadfast_secret_key')
      .limit(1)
      .single();

    const API_KEY = (siteSettings as any)?.steadfast_api_key || Deno.env.get('STEADFAST_API_KEY') || '';
    const SECRET_KEY = (siteSettings as any)?.steadfast_secret_key || Deno.env.get('STEADFAST_SECRET_KEY') || '';

    if (!API_KEY || !SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Steadfast credentials not configured. Please set them in Admin → Site Settings.' }), { status: 503, headers: corsHeaders });
    }

    const sfHeaders = {
      'Api-Key': API_KEY,
      'Secret-Key': SECRET_KEY,
      'Content-Type': 'application/json',
    };

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // GET balance
    if (req.method === 'GET' && action === 'balance') {
      const res = await fetch(`${STEADFAST_BASE}/get_balance`, { headers: sfHeaders });
      const data = await safeJson(res);
      if (data.raw) return new Response(JSON.stringify({ error: `Steadfast API error: ${data.error}` }), { status: 502, headers: corsHeaders });
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // GET delivery status
    if (req.method === 'GET' && action === 'status') {
      const trackingCode = url.searchParams.get('tracking_code');
      if (!trackingCode) {
        return new Response(JSON.stringify({ error: 'tracking_code required' }), { status: 400, headers: corsHeaders });
      }
      const res = await fetch(`${STEADFAST_BASE}/status_by_trackingcode/${trackingCode}`, { headers: sfHeaders });
      const data = await safeJson(res);
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST create consignment
    if (req.method === 'POST' && action === 'create') {
      const body = await req.json();
      const { order_id, invoice, recipient_name, recipient_phone, recipient_address, cod_amount, note } = body;

      const res = await fetch(`${STEADFAST_BASE}/create_order`, {
        method: 'POST',
        headers: sfHeaders,
        body: JSON.stringify({ invoice, recipient_name, recipient_phone, recipient_address, cod_amount, note }),
      });
      const data = await safeJson(res);

      if (data.raw) {
        return new Response(JSON.stringify({ error: `Steadfast API error: ${data.error}` }), { status: 502, headers: corsHeaders });
      }

      if (data.status === 200 && data.consignment) {
        // Save tracking info to order
        await adminSupabase.from('orders').update({
          steadfast_consignment_id: data.consignment.consignment_id,
          steadfast_tracking_code: data.consignment.tracking_code,
          steadfast_status: data.consignment.status,
          status: 'shipped',
        }).eq('id', order_id);
      }

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST refresh status from Steadfast
    if (req.method === 'POST' && action === 'refresh_status') {
      const body = await req.json();
      const { order_id, tracking_code } = body;

      const res = await fetch(`${STEADFAST_BASE}/status_by_trackingcode/${tracking_code}`, { headers: sfHeaders });
      const data = await safeJson(res);

      if (data.raw) {
        return new Response(JSON.stringify({ error: `Steadfast API error: ${data.error}` }), { status: 502, headers: corsHeaders });
      }

      if (data.status === 200) {
        await adminSupabase.from('orders').update({
          steadfast_status: data.delivery_status,
        }).eq('id', order_id);
      }

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error('Steadfast error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
