import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error('CarryBee non-JSON response:', text.slice(0, 300));
    return { error: true, message: text.slice(0, 300), raw: true };
  }
}

const CARRYBEE_BASE = 'https://developers.carrybee.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: true, message: 'Unauthorized' }), { status: 401, headers: corsHeaders });
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
      return new Response(JSON.stringify({ error: true, message: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const { data: roleData } = await adminSupabase.from('user_roles').select('role').eq('user_id', user.id);
    const isAdmin = (roleData || []).some((r: any) => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: true, message: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }

    // Read CarryBee credentials from site_settings
    const { data: siteSettings } = await adminSupabase
      .from('site_settings')
      .select('carrybee_client_id, carrybee_client_secret, carrybee_client_context, carrybee_store_id')
      .limit(1)
      .single();

    const CLIENT_ID = (siteSettings as any)?.carrybee_client_id || '';
    const CLIENT_SECRET = (siteSettings as any)?.carrybee_client_secret || '';
    const CLIENT_CONTEXT = (siteSettings as any)?.carrybee_client_context || '';
    const STORE_ID = (siteSettings as any)?.carrybee_store_id || '';

    if (!CLIENT_ID || !CLIENT_SECRET || !CLIENT_CONTEXT) {
      return new Response(JSON.stringify({ error: true, message: 'CarryBee credentials not configured. Please set them in Admin → Site Settings.' }), { status: 503, headers: corsHeaders });
    }

    const cbHeaders: Record<string, string> = {
      'Client-ID': CLIENT_ID,
      'Client-Secret': CLIENT_SECRET,
      'Client-Context': CLIENT_CONTEXT,
      'Content-Type': 'application/json',
    };

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // GET address-details (resolve city_id & zone_id from address)
    if (req.method === 'POST' && action === 'address-details') {
      const body = await req.json();
      const res = await fetch(`${CARRYBEE_BASE}/api/v2/address-details`, {
        method: 'POST',
        headers: cbHeaders,
        body: JSON.stringify({ query: body.query }),
      });
      const data = await safeJson(res);
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST create order
    if (req.method === 'POST' && action === 'create') {
      const body = await req.json();
      const { order_id, recipient_name, recipient_phone, recipient_address, cod_amount, note, city_id, zone_id } = body;

      if (!STORE_ID) {
        return new Response(JSON.stringify({ error: true, message: 'CarryBee Store ID not configured. Please set it in Admin → Site Settings.' }), { status: 503, headers: corsHeaders });
      }

      // Get order number for merchant_order_id
      const { data: orderData } = await adminSupabase.from('orders').select('order_number').eq('id', order_id).single();
      const merchantOrderId = orderData ? String(orderData.order_number) : order_id;

      const orderPayload: any = {
        store_id: STORE_ID,
        merchant_order_id: merchantOrderId,
        delivery_type: 1, // Normal delivery
        product_type: 1,  // Parcel
        recipient_phone,
        recipient_name,
        recipient_address,
        item_weight: 500, // Default 500g
        collectable_amount: Math.round(cod_amount || 0),
      };

      if (city_id) orderPayload.city_id = city_id;
      if (zone_id) orderPayload.zone_id = zone_id;
      if (note) orderPayload.special_instruction = note;

      const res = await fetch(`${CARRYBEE_BASE}/api/v2/orders`, {
        method: 'POST',
        headers: cbHeaders,
        body: JSON.stringify(orderPayload),
      });
      const data = await safeJson(res);

      if (data.raw) {
        return new Response(JSON.stringify({ error: true, message: `CarryBee API error: ${data.message}` }), { status: 502, headers: corsHeaders });
      }

      // If order created successfully, save consignment_id
      if (!data.error && data.data?.order?.consignment_id) {
        await adminSupabase.from('orders').update({
          carrybee_consignment_id: data.data.order.consignment_id,
          carrybee_status: 'Order Created',
          status: 'shipped',
        }).eq('id', order_id);
      }

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // GET order details / tracking
    if (req.method === 'GET' && action === 'details') {
      const consignmentId = url.searchParams.get('consignment_id');
      if (!consignmentId) {
        return new Response(JSON.stringify({ error: true, message: 'consignment_id required' }), { status: 400, headers: corsHeaders });
      }
      const res = await fetch(`${CARRYBEE_BASE}/api/v2/orders/${consignmentId}/details`, { headers: cbHeaders });
      const data = await safeJson(res);
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST refresh status
    if (req.method === 'POST' && action === 'refresh_status') {
      const body = await req.json();
      const { order_id, consignment_id } = body;

      const res = await fetch(`${CARRYBEE_BASE}/api/v2/orders/${consignment_id}/details`, { headers: cbHeaders });
      const data = await safeJson(res);

      if (data.raw) {
        return new Response(JSON.stringify({ error: true, message: `CarryBee API error: ${data.message}` }), { status: 502, headers: corsHeaders });
      }

      if (!data.error && data.data?.transfer_status) {
        await adminSupabase.from('orders').update({
          carrybee_status: data.data.transfer_status,
        }).eq('id', order_id);
      }

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST cancel order
    if (req.method === 'POST' && action === 'cancel') {
      const body = await req.json();
      const { order_id, consignment_id, reason } = body;

      const res = await fetch(`${CARRYBEE_BASE}/api/v2/orders/${consignment_id}/cancel`, {
        method: 'POST',
        headers: cbHeaders,
        body: JSON.stringify({ cancellation_reason: reason || 'Cancelled by admin' }),
      });
      const data = await safeJson(res);

      if (!data.error) {
        await adminSupabase.from('orders').update({
          carrybee_status: 'Cancelled',
        }).eq('id', order_id);
      }

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: true, message: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error('CarryBee error:', err);
    return new Response(JSON.stringify({ error: true, message: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
