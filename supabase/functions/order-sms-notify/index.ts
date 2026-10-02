import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Maps order status to SMS settings field & message templates
const EVENT_MAP: Record<string, { settingsField: string; adminMsg: (o: any) => string; customerMsg: (o: any, siteName: string) => string; vendorMsg: (o: any, siteName: string) => string }> = {
  pending: {
    settingsField: "on_new_order",
    adminMsg: (o) => `নতুন অর্ডার #${String(o.order_number).padStart(11, "0")}! গ্রাহক: ${o.customer_name || "N/A"}, মোট: ৳${o.total}`,
    customerMsg: (o, s) => `${s}: আপনার অর্ডার #${String(o.order_number).padStart(11, "0")} সফলভাবে গৃহীত হয়েছে। মোট: ৳${o.total}। ধন্যবাদ!`,
    vendorMsg: (o, s) => `${s}: নতুন অর্ডার #${String(o.order_number).padStart(11, "0")} পেয়েছেন। অনুগ্রহ করে চেক করুন।`,
  },
  confirmed: {
    settingsField: "on_order_confirmed",
    adminMsg: (o) => `অর্ডার #${String(o.order_number).padStart(11, "0")} কনফার্ম করা হয়েছে।`,
    customerMsg: (o, s) => `${s}: আপনার অর্ডার #${String(o.order_number).padStart(11, "0")} কনফার্ম হয়েছে। শীঘ্রই শিপমেন্ট হবে।`,
    vendorMsg: (o, s) => `${s}: অর্ডার #${String(o.order_number).padStart(11, "0")} কনফার্ম হয়েছে।`,
  },
  shipped: {
    settingsField: "on_order_shipped",
    adminMsg: (o) => `অর্ডার #${String(o.order_number).padStart(11, "0")} শিপ করা হয়েছে।`,
    customerMsg: (o, s) => `${s}: আপনার অর্ডার #${String(o.order_number).padStart(11, "0")} শিপ হয়েছে। ডেলিভারির জন্য অপেক্ষা করুন।`,
    vendorMsg: (o, s) => `${s}: অর্ডার #${String(o.order_number).padStart(11, "0")} শিপ হয়েছে।`,
  },
  delivered: {
    settingsField: "on_order_delivered",
    adminMsg: (o) => `অর্ডার #${String(o.order_number).padStart(11, "0")} ডেলিভারি সম্পন্ন।`,
    customerMsg: (o, s) => `${s}: আপনার অর্ডার #${String(o.order_number).padStart(11, "0")} ডেলিভারি হয়েছে। ধন্যবাদ!`,
    vendorMsg: (o, s) => `${s}: অর্ডার #${String(o.order_number).padStart(11, "0")} ডেলিভারি সম্পন্ন।`,
  },
  cancelled: {
    settingsField: "on_order_cancelled",
    adminMsg: (o) => `অর্ডার #${String(o.order_number).padStart(11, "0")} বাতিল করা হয়েছে।`,
    customerMsg: (o, s) => `${s}: আপনার অর্ডার #${String(o.order_number).padStart(11, "0")} বাতিল হয়েছে।`,
    vendorMsg: (o, s) => `${s}: অর্ডার #${String(o.order_number).padStart(11, "0")} বাতিল হয়েছে।`,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { order_id, status } = await req.json();

    if (!order_id || !status) {
      return new Response(JSON.stringify({ error: "order_id and status required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch SMS settings
    const { data: settings } = await supabase.from("sms_settings").select("*").limit(1).single();
    if (!settings?.is_enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "SMS disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = EVENT_MAP[status];
    if (!event) {
      return new Response(JSON.stringify({ skipped: true, reason: "Unknown status" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this event is enabled
    if (!(settings as any)[event.settingsField]) {
      return new Response(JSON.stringify({ skipped: true, reason: `${event.settingsField} disabled` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order details
    const { data: order } = await supabase.from("orders").select("*").eq("id", order_id).single();
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch site name
    const { data: siteSettings } = await supabase.from("site_settings").select("site_name").limit(1).single();
    const siteName = siteSettings?.site_name || "QweekBD";

    const sendSmsUrl = `${supabaseUrl}/functions/v1/send-sms`;
    const results: any[] = [];

    // Helper to send SMS
    const sendSms = async (phone: string, message: string, eventType: string) => {
      try {
        const res = await fetch(sendSmsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({ phone, message, event_type: eventType, order_id }),
        });
        const data = await res.json();
        results.push({ phone, status: data.success ? "sent" : "failed", data });
      } catch (err) {
        results.push({ phone, status: "error", error: err.message });
      }
    };

    // 1. Admin SMS
    if (settings.notify_admin && settings.admin_phone) {
      await sendSms(settings.admin_phone, event.adminMsg(order), `order_${status}_admin`);
    }

    // 2. Customer SMS
    if (settings.notify_customer && order.customer_phone) {
      await sendSms(order.customer_phone, event.customerMsg(order, siteName), `order_${status}_customer`);
    }

    // 3. Vendor SMS — find vendors from order items
    if (settings.notify_vendor) {
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id")
        .eq("order_id", order_id);

      if (items?.length) {
        const productIds = items.map((i: any) => i.product_id).filter(Boolean);
        if (productIds.length) {
          const { data: products } = await supabase
            .from("products")
            .select("vendor_id")
            .in("id", productIds);

          const vendorIds = [...new Set((products || []).map((p: any) => p.vendor_id).filter(Boolean))];

          if (vendorIds.length) {
            const { data: vendors } = await supabase
              .from("vendors")
              .select("phone")
              .in("id", vendorIds);

            for (const vendor of vendors || []) {
              if (vendor.phone) {
                await sendSms(vendor.phone, event.vendorMsg(order, siteName), `order_${status}_vendor`);
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Order SMS Notify Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
