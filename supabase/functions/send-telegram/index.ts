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
    const { type, order_id, data, custom_message } = body;

    // Fetch telegram settings from site_settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("site_name, telegram_bot_token, telegram_chat_id, telegram_enabled")
      .limit(1)
      .single();

    const botToken = settings?.telegram_bot_token?.trim();
    const chatId = settings?.telegram_chat_id?.trim();
    const isEnabled = settings?.telegram_enabled;
    const siteName = settings?.site_name || "Sheikh Pharma";

    if (!botToken || !chatId) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Telegram Bot Token or Chat ID not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type !== "test" && isEnabled === false) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Telegram notifications are disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let messageText = "";

    if (type === "test") {
      messageText = `🔔 <b>${siteName} Telegram Bot সক্রিয় হয়েছে!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `✅ অভিনন্দন! আপনার টেলিগ্রাম নোটিফিকেশন সফলভাবে কানেক্ট হয়েছে।\n\n` +
        `এখন থেকে:\n` +
        `• প্রতিটি নতুন অর্ডার\n` +
        `• অসম্পূর্ণ অর্ডার (Abandoned Cart)\n` +
        `• পেমেন্ট ব্যর্থতার তাৎক্ষণিক অ্যালার্ট\n\n` +
        `সরাসরি এই চ্যাটে চলে আসবে! 🎉`;
    } else if (type === "new_order" && order_id) {
      // Fetch full order with items
      const { data: order } = await supabase
        .from("orders")
        .select("*, order_items(*, products(name))")
        .eq("id", order_id)
        .single();

      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orderNumber = order.order_number
        ? `#${String(order.order_number).padStart(11, "0")}`
        : `#${order.id.slice(0, 8)}`;

      const cleanPhone = (order.customer_phone || "").replace(/[^0-9]/g, "");
      const waNumber = cleanPhone.startsWith("88")
        ? cleanPhone
        : (cleanPhone.startsWith("0") ? `88${cleanPhone}` : `880${cleanPhone}`);
      const waLink = cleanPhone ? `https://wa.me/${waNumber}` : "";

      const itemsList = (order.order_items || [])
        .map((i: any) => {
          const pName = i.products?.name || i.product_name || "পণ্য";
          return `• ${pName} × ${i.quantity} (৳${i.price * i.quantity})`;
        })
        .join("\n");

      messageText = `🛍️ <b>নতুন অর্ডার এসেছে!</b> <code>${orderNumber}</code>\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>গ্রাহক:</b> ${order.customer_name || "N/A"}\n` +
        `📞 <b>ফোন:</b> <code>${order.customer_phone || "N/A"}</code>\n` +
        (waLink ? `💬 <b>WhatsApp:</b> <a href="${waLink}">কাস্টমারকে WhatsApp করুন</a>\n` : "") +
        `📍 <b>ঠিকানা:</b> ${order.customer_address || "N/A"}` +
        (order.customer_upazilla ? `, ${order.customer_upazilla}` : "") +
        (order.customer_zilla ? `, ${order.customer_zilla}` : "") +
        (order.customer_division ? ` (${order.customer_division})` : "") + `\n` +
        `💳 <b>পেমেন্ট:</b> ${order.payment_method?.toUpperCase() || "COD"}\n` +
        (order.order_notes ? `📝 <b>নোট:</b> ${order.order_notes}\n` : "") +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `📦 <b>পণ্যসমূহ:</b>\n${itemsList || "কোনো পণ্য তথ্য নেই"}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💰 <b>সর্বমোট:</b> <b>৳${order.total || 0}</b>\n` +
        `🔗 <a href="https://sheikhpharma.shop/admin/orders">অর্ডার প্যানেলে দেখুন</a>`;
    } else if (type === "incomplete_order" || type === "payment_failed") {
      const custName = data?.customer_name || "N/A";
      const custPhone = data?.customer_phone || "N/A";
      const subtotal = data?.subtotal || 0;
      const items = Array.isArray(data?.items) ? data.items : [];
      const reason = data?.reason || "";

      const cleanPhone = custPhone.replace(/[^0-9]/g, "");
      const waNumber = cleanPhone.startsWith("88")
        ? cleanPhone
        : (cleanPhone.startsWith("0") ? `88${cleanPhone}` : `880${cleanPhone}`);
      const waLink = cleanPhone ? `https://wa.me/${waNumber}` : "";

      const itemsList = items
        .slice(0, 5)
        .map((i: any) => `• ${i.name || "পণ্য"} × ${i.quantity || 1} (৳${(i.price || 0) * (i.quantity || 1)})`)
        .join("\n");
      const moreCount = items.length > 5 ? `\n...আরও ${items.length - 5}টি পণ্য` : "";

      const isFail = type === "payment_failed";
      const title = isFail
        ? `🚨 <b>সতর্কতা: অসম্পূর্ণ অর্ডার (পেমেন্ট ব্যর্থ)!</b>`
        : `⚠️ <b>সতর্কতা: অসম্পূর্ণ অর্ডার (গ্রাহক চলে গেছেন)!</b>`;

      const reasonText = isFail
        ? `পেমেন্ট সম্পন্ন না করে ক্যানসেল বা ফেইল্ড হয়েছে।`
        : `অর্ডার সম্পন্ন না করে চেকআউট পেজ থেকে বের হয়ে গেছেন।`;

      messageText = `${title}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>গ্রাহক:</b> ${custName}\n` +
        `📞 <b>ফোন:</b> <code>${custPhone}</code>\n` +
        (waLink ? `💬 <b>WhatsApp:</b> <a href="${waLink}">গ্রাহককে WhatsApp এ মেসেজ দিন</a>\n` : "") +
        (data?.customer_address ? `📍 <b>ঠিকানা:</b> ${data.customer_address}\n` : "") +
        `ℹ️ <b>কারণ:</b> ${reasonText}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🛒 <b>কার্টে থাকা পণ্য (${items.length}টি):</b>\n${itemsList || "তথ্য নেই"}${moreCount}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💰 <b>মোট মূল্য:</b> <b>৳${subtotal}</b>\n` +
        `💡 <i>টিপস: গ্রাহককে দ্রুত WhatsApp বা ফোনে যোগাযোগ করে অর্ডার কনফার্ম করতে সহায়তা করুন।</i>\n` +
        `🔗 <a href="https://sheikhpharma.shop/admin/incomplete-orders">অসম্পূর্ণ অর্ডার প্যানেলে দেখুন</a>`;
    } else if (custom_message) {
      messageText = custom_message;
    }

    if (!messageText) {
      return new Response(JSON.stringify({ skipped: true, reason: "Empty message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send to Telegram Bot API
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error("Telegram API Error:", result);
      return new Response(JSON.stringify({ error: result.description || "Telegram sending failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-telegram function exception:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
