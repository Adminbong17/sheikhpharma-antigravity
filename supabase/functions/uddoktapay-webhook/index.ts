import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const UDDOKTAPAY_API_KEY = Deno.env.get('UDDOKTAPAY_API_KEY') || '982d381360a69d419689740d9f2e26ce36fb7a50';
    const headerApiKey = req.headers.get('RT-UDDOKTAPAY-API-KEY');

    if (headerApiKey !== UDDOKTAPAY_API_KEY) {
      return new Response('Unauthorized', { status: 401 });
    }

    const data = await req.json();

    if (data.status !== 'COMPLETED') {
      return new Response('OK', { status: 200 });
    }

    const orderId = data.metadata?.order_id;
    if (!orderId) {
      return new Response('No order_id in metadata', { status: 400 });
    }

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await adminSupabase
      .from('orders')
      .update({
        status: 'processing',
        transaction_id: data.transaction_id,
        payment_method: `uddokta_pay (${data.payment_method})`,
      })
      .eq('id', orderId);

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
});
