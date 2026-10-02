import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();

    // Handle deletion (when order is successfully placed)
    if (body.delete_id) {
      await supabase.from("incomplete_orders").delete().eq("id", body.delete_id);
      return new Response(JSON.stringify({ deleted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      user_id,
      customer_name,
      customer_phone,
      customer_address,
      customer_division,
      customer_zilla,
      customer_upazilla,
      items,
      subtotal,
      notes,
      incomplete_order_id,
    } = body;

    // Need at least one field filled
    if (!customer_name && !customer_phone && !customer_address) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If we have an existing incomplete_order_id, update it
    if (incomplete_order_id) {
      const { error } = await supabase
        .from("incomplete_orders")
        .update({
          customer_name: customer_name || null,
          customer_phone: customer_phone || null,
          customer_address: customer_address || null,
          customer_division: customer_division || null,
          customer_zilla: customer_zilla || null,
          customer_upazilla: customer_upazilla || null,
          items: items || [],
          subtotal: subtotal || 0,
          notes: notes || null,
        })
        .eq("id", incomplete_order_id);

      if (error) throw error;
      return new Response(JSON.stringify({ id: incomplete_order_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new abandoned cart entry
    const { data, error } = await supabase
      .from("incomplete_orders")
      .insert({
        type: "abandoned_cart",
        status: "open",
        
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        customer_address: customer_address || null,
        customer_division: customer_division || null,
        customer_zilla: customer_zilla || null,
        customer_upazilla: customer_upazilla || null,
        items: items || [],
        subtotal: subtotal || 0,
        notes: notes || null,
        
      })
      .select("id")
      .single();

    if (error) throw error;

    // Notify admins via SMS about the new incomplete order (fire-and-forget)
    const ADMIN_PHONES = ["01521771548", "01712472839"];
    const itemCount = Array.isArray(items) ? items.length : 0;
    const msg = `নতুন অসম্পূর্ণ অর্ডার! গ্রাহক: ${customer_name || "N/A"}, ফোন: ${customer_phone || "N/A"}, পণ্য: ${itemCount}টি, মোট: ৳${subtotal || 0}`;
    const sendSmsUrl = `${supabaseUrl}/functions/v1/send-sms`;
    try {
      await Promise.all(
        ADMIN_PHONES.map((adminPhone) =>
          fetch(sendSmsUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({ phone: adminPhone, message: msg, event_type: "incomplete_order_admin" }),
          })
        )
      );
    } catch (err) {
      console.error("Incomplete order SMS error:", err);
    }

    return new Response(JSON.stringify({ id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
