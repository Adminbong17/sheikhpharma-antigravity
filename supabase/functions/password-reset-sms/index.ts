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

    const { action, phone, otp, new_password } = await req.json();

    if (action === "send_otp") {
      if (!phone) {
        return new Response(JSON.stringify({ error: "Phone number is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Format phone
      let cleanPhone = phone.replace(/[^0-9]/g, "");
      if (cleanPhone.startsWith("880")) cleanPhone = "0" + cleanPhone.slice(3);
      if (!cleanPhone.startsWith("0")) cleanPhone = "0" + cleanPhone;

      // First try to find user by phone in profiles table
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("phone", cleanPhone)
        .limit(1)
        .single();

      let userId: string | null = null;

      if (profileData?.user_id) {
        userId = profileData.user_id;
      } else {
        // Fallback: check virtual email
        const virtualEmail = `${cleanPhone}@phone.local`;
        const { data: userData } = await supabase.auth.admin.listUsers();
        const user = userData?.users?.find((u: any) => u.email === virtualEmail);
        if (user) userId = user.id;
      }

      if (!userId) {
        // Don't reveal that user doesn't exist
        return new Response(JSON.stringify({ success: true, message: "If this phone exists, an OTP has been sent." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate 6-digit OTP
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));

      // Invalidate old OTPs
      await supabase.from("password_reset_otps").update({ used: true }).eq("phone", cleanPhone).eq("used", false);

      // Save OTP
      await supabase.from("password_reset_otps").insert({
        phone: cleanPhone,
        otp: otpCode,
        user_id: userId,
      });

      // Send SMS
      const { data: smsSettings } = await supabase.from("sms_settings").select("*").limit(1).single();

      if (smsSettings?.is_enabled && smsSettings.api_key && smsSettings.secret_key) {
        let formattedPhone = cleanPhone.replace(/[^0-9]/g, "");
        if (formattedPhone.startsWith("0")) formattedPhone = "88" + formattedPhone;

        const message = `আপনার পাসওয়ার্ড রিসেট কোড: ${otpCode}\nএই কোডটি ১০ মিনিট পর্যন্ত কার্যকর থাকবে।`;
        const apiUrl = smsSettings.api_url || "https://smpp.revesms.com:7790/sendtext";
        const smsUrl = `${apiUrl}?apikey=${encodeURIComponent(smsSettings.api_key)}&secretkey=${encodeURIComponent(smsSettings.secret_key)}&callerID=${encodeURIComponent(smsSettings.caller_id)}&toUser=${formattedPhone}&messageContent=${encodeURIComponent(message)}`;

        console.log(`Sending password reset OTP to ${formattedPhone}`);
        const smsResponse = await fetch(smsUrl);
        const responseText = await smsResponse.text();
        let responseJson: any = {};
        try { responseJson = JSON.parse(responseText); } catch { responseJson = { raw: responseText }; }

        // Log SMS
        await supabase.from("sms_logs").insert({
          phone: formattedPhone,
          message,
          event_type: "password_reset",
          status: responseJson?.Status === "0" ? "sent" : "failed",
          response: responseJson,
        });
      }

      return new Response(JSON.stringify({ success: true, message: "OTP sent successfully" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "verify_otp") {
      if (!phone || !otp || !new_password) {
        return new Response(JSON.stringify({ error: "Phone, OTP, and new password are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new_password.length < 5) {
        return new Response(JSON.stringify({ error: "Password must be at least 5 characters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let cleanPhone = phone.replace(/[^0-9]/g, "");
      if (cleanPhone.startsWith("880")) cleanPhone = "0" + cleanPhone.slice(3);
      if (!cleanPhone.startsWith("0")) cleanPhone = "0" + cleanPhone;

      // Find valid OTP
      const { data: otpRecord } = await supabase
        .from("password_reset_otps")
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

      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(otpRecord.user_id, {
        password: new_password,
      });

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ensure phone is stored in profiles for future login lookups
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, phone")
        .eq("user_id", otpRecord.user_id)
        .limit(1)
        .maybeSingle();

      if (existingProfile && !existingProfile.phone) {
        await supabase.from("profiles").update({ phone: cleanPhone }).eq("id", existingProfile.id);
      }

      // Mark OTP as used
      await supabase.from("password_reset_otps").update({ used: true }).eq("id", otpRecord.id);

      // Get user's auth email so frontend can use it for login
      const { data: userData } = await supabase.auth.admin.getUserById(otpRecord.user_id);
      const authEmail = userData?.user?.email || null;

      return new Response(JSON.stringify({ success: true, message: "Password updated successfully", auth_email: authEmail }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Password Reset SMS Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
