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

    const { role, user_id, identifier } = await req.json();

    if (!role || (!user_id && !identifier)) {
      return new Response(JSON.stringify({ error: "role and user_id/identifier required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch SMS settings
    const { data: settings } = await supabase.from("sms_settings").select("*").limit(1).single();
    if (!settings?.is_enabled || !settings.admin_phone) {
      return new Response(JSON.stringify({ skipped: true, reason: "SMS disabled or no admin phone" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch site name
    const { data: siteSettings } = await supabase.from("site_settings").select("site_name").limit(1).single();
    const siteName = siteSettings?.site_name || "QweekBD";

    // Fetch user profile details
    let userName = "N/A";
    let userEmail = "N/A";
    let userPhone = "N/A";

    if (user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, email, phone")
        .eq("user_id", user_id)
        .single();

      if (profile) {
        userName = profile.username || "N/A";
        userEmail = profile.email || "N/A";
        userPhone = profile.phone || "N/A";
      }
    } else {
      // Fallback for old format
      userName = identifier || "N/A";
    }

    const now = new Date().toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" });
    const message = `${siteName}: ${role} লগইন হয়েছে।\nনাম: ${userName}\nইমেইল: ${userEmail}\nফোন: ${userPhone}\nসময়: ${now}`;

    // Send SMS to admin phone
    const sendSmsUrl = `${supabaseUrl}/functions/v1/send-sms`;
    const res = await fetch(sendSmsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        phone: settings.admin_phone,
        message,
        event_type: "login_alert",
      }),
    });
    const data = await res.json();

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Login SMS Notify Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
