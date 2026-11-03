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
      notify_admin,   // ONLY send SMS if explicitly true
      event_type,     // 'page_exit' | 'payment_failed'
    } = body;

    // Need at least one contact field filled
    if (!customer_name && !customer_phone && !customer_address) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let targetId = incomplete_order_id;
    let existingOrder: any = null;

    if (targetId) {
      const { data: found } = await supabase
        .from("incomplete_orders")
        .select("id, notes, status")
        .eq("id", targetId)
        .maybeSingle();
      existingOrder = found;
    }

    let updatedNotes = notes || existingOrder?.notes || null;

    if (existingOrder) {
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
          status: event_type === "payment_failed" ? "payment_failed" : (existingOrder.status || "open"),
          notes: updatedNotes,
        })
        .eq("id", targetId);

      if (error) throw error;
    } else {
      // Create new abandoned cart entry
      const { data: newRow, error } = await supabase
        .from("incomplete_orders")
        .insert({
          type: event_type === "payment_failed" ? "payment_failed" : "abandoned_cart",
          status: event_type === "payment_failed" ? "payment_failed" : "open",
          customer_name: customer_name || null,
          customer_phone: customer_phone || null,
          customer_address: customer_address || null,
          customer_division: customer_division || null,
          customer_zilla: customer_zilla || null,
          customer_upazilla: customer_upazilla || null,
          items: items || [],
          subtotal: subtotal || 0,
          notes: updatedNotes,
        })
        .select("id, notes")
        .single();

      if (error) throw error;
      targetId = newRow.id;
      existingOrder = newRow;
    }

    // ONLY notify admins via SMS if notify_admin is explicitly true!
    // (While user is typing, notify_admin will be false/falsy, so NO SMS is sent!)
    if (notify_admin === true) {
      const cleanPhone = (customer_phone || "").replace(/[^0-9]/g, "");
      const hasValidPhone = cleanPhone.length >= 10;
      const alreadySent = (existingOrder?.notes || "").includes("[sms_sent]");

      if (hasValidPhone && !alreadySent) {
        // Fetch admin phone from sms_settings
        const { data: smsSettings } = await supabase
          .from("sms_settings")
          .select("admin_phone, is_enabled")
          .limit(1)
          .single();

        if (smsSettings?.is_enabled !== false) {
          const adminPhones = [
            smsSettings?.admin_phone || "01712472839",
            "01521771548",
          ].filter(Boolean);
          const uniqueAdminPhones = [...new Set(adminPhones)];

          const itemCount = Array.isArray(items) ? items.length : 0;
          let msg = "";
          if (event_type === "payment_failed") {
            msg = `অসম্পূর্ণ অর্ডার (পেমেন্ট ব্যর্থ)! গ্রাহক: ${customer_name || "N/A"}, ফোন: ${customer_phone}, পণ্য: ${itemCount}টি, মোট: ৳${subtotal || 0} — পেমেন্ট সম্পন্ন করতে পারেনি।`;
          } else {
            msg = `অসম্পূর্ণ অর্ডার! গ্রাহক: ${customer_name || "N/A"}, ফোন: ${customer_phone}, পণ্য: ${itemCount}টি, মোট: ৳${subtotal || 0} — অর্ডার সম্পন্ন না করে পেজ ত্যাগ করেছেন।`;
          }

          const sendSmsUrl = `${supabaseUrl}/functions/v1/send-sms`;
          try {
            await Promise.all(
              uniqueAdminPhones.map((adminPhone) =>
                fetch(sendSmsUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
                  body: JSON.stringify({ phone: adminPhone, message: msg, event_type: "incomplete_order_admin" }),
                })
              )
            );

            // Mark [sms_sent] in notes so duplicate SMS is not sent for the same cart
            const newNotesWithFlag = updatedNotes ? `${updatedNotes} [sms_sent]` : "[sms_sent]";
            await supabase
              .from("incomplete_orders")
              .update({ notes: newNotesWithFlag })
              .eq("id", targetId);
          } catch (smsErr) {
            console.error("Incomplete order SMS error:", smsErr);
          }
        }
      }
    }

    return new Response(JSON.stringify({ id: targetId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
