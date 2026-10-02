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
    console.error('Pathao non-JSON response:', text.slice(0, 300));
    return { status: res.status, error: text.slice(0, 300), raw: true };
  }
}

async function getPathaoToken(baseUrl: string, clientId: string, clientSecret: string, username: string, password: string): Promise<string> {
  const res = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      username,
      password,
      grant_type: 'password',
    }),
  });
  const data = await safeJson(res);
  if (data.raw || !data.access_token) {
    throw new Error(`Pathao token error: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data.access_token;
}

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

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const { data: roleData } = await adminSupabase.from('user_roles').select('role').eq('user_id', user.id);
    const isAdmin = (roleData || []).some((r: any) => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }

    // Get Pathao credentials from site_settings
    const { data: settings } = await adminSupabase
      .from('site_settings')
      .select('pathao_client_id, pathao_client_secret, pathao_username, pathao_password, pathao_store_id, pathao_base_url')
      .limit(1)
      .single();

    const baseUrl = (settings as any)?.pathao_base_url || 'https://api-hermes.pathao.com';
    const clientId = (settings as any)?.pathao_client_id;
    const clientSecret = (settings as any)?.pathao_client_secret;
    const username = (settings as any)?.pathao_username;
    const password = (settings as any)?.pathao_password;
    const storeId = (settings as any)?.pathao_store_id;

    if (!clientId || !clientSecret || !username || !password) {
      return new Response(JSON.stringify({ error: 'Pathao credentials not configured. Please set them in Admin → Site Settings.' }), { status: 503, headers: corsHeaders });
    }

    // Get access token
    const accessToken = await getPathaoToken(baseUrl, clientId, clientSecret, username, password);

    const pathaoHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // GET stores
    if (req.method === 'GET' && action === 'stores') {
      const res = await fetch(`${baseUrl}/aladdin/api/v1/stores`, { headers: pathaoHeaders });
      const data = await safeJson(res);
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // GET cities
    if (req.method === 'GET' && action === 'cities') {
      const res = await fetch(`${baseUrl}/aladdin/api/v1/city-list`, { headers: pathaoHeaders });
      const data = await safeJson(res);
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // GET zones
    if (req.method === 'GET' && action === 'zones') {
      const cityId = url.searchParams.get('city_id');
      if (!cityId) return new Response(JSON.stringify({ error: 'city_id required' }), { status: 400, headers: corsHeaders });
      const res = await fetch(`${baseUrl}/aladdin/api/v1/cities/${cityId}/zone-list`, { headers: pathaoHeaders });
      const data = await safeJson(res);
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // GET areas
    if (req.method === 'GET' && action === 'areas') {
      const zoneId = url.searchParams.get('zone_id');
      if (!zoneId) return new Response(JSON.stringify({ error: 'zone_id required' }), { status: 400, headers: corsHeaders });
      const res = await fetch(`${baseUrl}/aladdin/api/v1/zones/${zoneId}/area-list`, { headers: pathaoHeaders });
      const data = await safeJson(res);
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST price calculation
    if (req.method === 'POST' && action === 'price') {
      const body = await req.json();
      const res = await fetch(`${baseUrl}/aladdin/api/v1/merchant/price-plan`, {
        method: 'POST',
        headers: pathaoHeaders,
        body: JSON.stringify({
          store_id: parseInt(storeId) || body.store_id,
          item_type: body.item_type || 2,
          delivery_type: body.delivery_type || 48,
          item_weight: body.item_weight || 0.5,
          recipient_city: body.recipient_city,
          recipient_zone: body.recipient_zone,
        }),
      });
      const data = await safeJson(res);
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST create order
    if (req.method === 'POST' && action === 'create') {
      const body = await req.json();
      const { order_id, recipient_name, recipient_phone, recipient_address, cod_amount, note, item_quantity } = body;

      const res = await fetch(`${baseUrl}/aladdin/api/v1/orders`, {
        method: 'POST',
        headers: pathaoHeaders,
        body: JSON.stringify({
          store_id: parseInt(storeId) || body.store_id,
          merchant_order_id: String(body.merchant_order_id || order_id),
          recipient_name,
          recipient_phone,
          recipient_address,
          delivery_type: body.delivery_type || 48,
          item_type: body.item_type || 2,
          special_instruction: note || '',
          item_quantity: item_quantity || 1,
          item_weight: body.item_weight || 0.5,
          item_description: body.item_description || '',
          amount_to_collect: cod_amount || 0,
        }),
      });
      const data = await safeJson(res);

      if (data.raw) {
        return new Response(JSON.stringify({ error: `Pathao API error: ${data.error}` }), { status: 502, headers: corsHeaders });
      }

      if (data.code === 200 && data.data?.consignment_id) {
        await adminSupabase.from('orders').update({
          pathao_consignment_id: data.data.consignment_id,
          pathao_status: data.data.order_status || 'Pending',
          status: 'shipped',
        }).eq('id', order_id);

        return new Response(JSON.stringify({
          success: true,
          consignment_id: data.data.consignment_id,
          order_status: data.data.order_status,
          delivery_fee: data.data.delivery_fee,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: data.message || 'Failed to create order', data }), { status: 400, headers: corsHeaders });
    }

    // POST refresh status / tracking
    if (req.method === 'POST' && action === 'refresh_status') {
      const body = await req.json();
      const { order_id, consignment_id } = body;

      const res = await fetch(`${baseUrl}/aladdin/api/v1/orders/${consignment_id}/info`, {
        headers: pathaoHeaders,
      });
      const data = await safeJson(res);

      if (data.code === 200 && data.data) {
        const status = data.data.order_status || data.data.order_status_slug || 'Unknown';
        await adminSupabase.from('orders').update({
          pathao_status: status,
        }).eq('id', order_id);

        return new Response(JSON.stringify({
          success: true,
          order_status: status,
          data: data.data,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Could not fetch status', data }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error('Pathao error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
