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

    const { action, phone, otp } = await req.json();

    if (action === "send_otp") {
      if (!phone) {
        return new Response(JSON.stringify({ error: "Phone number is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let cleanPhone = phone.replace(/[^0-9]/g, "");
      if (cleanPhone.startsWith("880")) cleanPhone = "0" + cleanPhone.slice(3);
      if (!cleanPhone.startsWith("0")) cleanPhone = "0" + cleanPhone;

      // Check if phone already exists in profiles
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", cleanPhone)
        .limit(1)
        .maybeSingle();

      if (existingProfile) {
        return new Response(JSON.stringify({ error: "এই ফোন নম্বর দিয়ে আগেই অ্যাকাউন্ট আছে। লগইন করুন।" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate 6-digit OTP
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));

      // Invalidate old OTPs
      await supabase.from("signup_otps").update({ used: true }).eq("phone", cleanPhone).eq("used", false);

      // Save OTP
      await supabase.from("signup_otps").insert({ phone: cleanPhone, otp: otpCode });

      // Send SMS
      const { data: smsSettings } = await supabase.from("sms_settings").select("*").limit(1).single();

      if (smsSettings?.is_enabled && smsSettings.api_key && smsSettings.secret_key) {
        let formattedPhone = cleanPhone.replace(/[^0-9]/g, "");
        if (formattedPhone.startsWith("0")) formattedPhone = "88" + formattedPhone;

        const message = `আপনার সাইনআপ ভেরিফিকেশন কোড: ${otpCode}\nএই কোডটি ১০ মিনিট পর্যন্ত কার্যকর থাকবে।`;
        const apiUrl = smsSettings.api_url || "https://smpp.revesms.com:7790/sendtext";
        const smsUrl = `${apiUrl}?apikey=${encodeURIComponent(smsSettings.api_key)}&secretkey=${encodeURIComponent(smsSettings.secret_key)}&callerID=${encodeURIComponent(smsSettings.caller_id)}&toUser=${formattedPhone}&messageContent=${encodeURIComponent(message)}`;

        console.log(`Sending signup OTP to ${formattedPhone}`);
        const smsResponse = await fetch(smsUrl);
        const responseText = await smsResponse.text();
        let responseJson: any = {};
        try { responseJson = JSON.parse(responseText); } catch { responseJson = { raw: responseText }; }

        await supabase.from("sms_logs").insert({
          phone: formattedPhone,
          message,
          event_type: "signup_otp",
          status: responseJson?.Status === "0" ? "sent" : "failed",
          response: responseJson,
        });
      }

      return new Response(JSON.stringify({ success: true, message: "OTP sent successfully" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "verify_otp") {
      if (!phone || !otp) {
        return new Response(JSON.stringify({ error: "Phone and OTP are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let cleanPhone = phone.replace(/[^0-9]/g, "");
      if (cleanPhone.startsWith("880")) cleanPhone = "0" + cleanPhone.slice(3);
      if (!cleanPhone.startsWith("0")) cleanPhone = "0" + cleanPhone;

      const { data: otpRecord } = await supabase
        .from("signup_otps")
        .select("*")
        .eq("phone", cleanPhone)
        .eq("otp", otp)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!otpRecord) {
        return new Response(JSON.stringify({ error: "Invalid or expired OTP" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark OTP as used
      await supabase.from("signup_otps").update({ used: true }).eq("id", otpRecord.id);

      return new Response(JSON.stringify({ success: true, verified: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Signup OTP Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
