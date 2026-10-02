import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { phone, message, event_type, order_id } = await req.json();

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: "phone and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch SMS settings
    const { data: settings } = await supabase
      .from("sms_settings")
      .select("*")
      .limit(1)
      .single();

    if (!settings || !settings.is_enabled) {
      return new Response(JSON.stringify({ error: "SMS is disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings.api_key || !settings.secret_key || !settings.caller_id) {
      return new Response(JSON.stringify({ error: "SMS API credentials not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format phone: ensure it starts with 880
    let formattedPhone = phone.replace(/[^0-9]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "88" + formattedPhone;
    } else if (!formattedPhone.startsWith("880")) {
      formattedPhone = "880" + formattedPhone;
    }

    // Build ReveSMS API URL
    const apiUrl = settings.api_url || "https://smpp.revesms.com:7790/sendtext";
    const smsUrl = `${apiUrl}?apikey=${encodeURIComponent(settings.api_key)}&secretkey=${encodeURIComponent(settings.secret_key)}&callerID=${encodeURIComponent(settings.caller_id)}&toUser=${formattedPhone}&messageContent=${encodeURIComponent(message)}`;

    console.log(`Sending SMS to ${formattedPhone} via ${apiUrl}`);

    const smsResponse = await fetch(smsUrl);
    const responseText = await smsResponse.text();

    let responseJson: any = {};
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { raw: responseText };
    }

    const status = responseJson?.Status === "0" ? "sent" : "failed";

    // Log the SMS
    await supabase.from("sms_logs").insert({
      phone: formattedPhone,
      message,
      event_type: event_type || "general",
      status,
      provider_response: responseJson,
      response: responseJson,
      order_id: order_id || null,
    });

    return new Response(JSON.stringify({ success: status === "sent", response: responseJson }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SMS Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
