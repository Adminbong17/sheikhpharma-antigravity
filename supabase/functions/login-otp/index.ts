import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizePhone = (phone: string) => {
  let clean = (phone || "").replace(/[^0-9]/g, "");
  if (!clean) return "";
  if (clean.startsWith("880")) clean = "0" + clean.slice(3);
  if (!clean.startsWith("0")) clean = "0" + clean;
  return clean;
};

const phoneToVirtualEmail = (phone: string) => `${phone}@phone.local`;

async function sendSmsOtp(supabase: any, phone: string, otpCode: string, purpose: "login" | "signup") {
  const { data: smsSettings } = await supabase.from("sms_settings").select("*").limit(1).single();
  if (!smsSettings?.is_enabled || !smsSettings.api_key || !smsSettings.secret_key) {
    console.log("SMS settings not configured");
    return false;
  }

  let formattedPhone = phone.replace(/[^0-9]/g, "");
  if (formattedPhone.startsWith("0")) formattedPhone = "88" + formattedPhone;

  const message =
    purpose === "signup"
      ? `আপনার সাইনআপ ভেরিফিকেশন কোড: ${otpCode}\nএই কোডটি ১০ মিনিট পর্যন্ত কার্যকর থাকবে।`
      : `আপনার লগইন কোড: ${otpCode}\nএই কোডটি ১০ মিনিট পর্যন্ত কার্যকর থাকবে।`;

  const apiUrl = smsSettings.api_url || "https://smpp.revesms.com:7790/sendtext";
  const smsUrl = `${apiUrl}?apikey=${encodeURIComponent(smsSettings.api_key)}&secretkey=${encodeURIComponent(smsSettings.secret_key)}&callerID=${encodeURIComponent(smsSettings.caller_id)}&toUser=${formattedPhone}&messageContent=${encodeURIComponent(message)}`;

  console.log(`Sending ${purpose} OTP to ${formattedPhone}`);
  try {
    const smsResponse = await fetch(smsUrl);
    const responseText = await smsResponse.text();
    let responseJson: any = {};
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { raw: responseText };
    }

    await supabase.from("sms_logs").insert({
      phone: formattedPhone,
      message,
      event_type: `${purpose}_otp`,
      status: responseJson?.Status === "0" ? "sent" : "failed",
      response: responseJson,
    });
    return responseJson?.Status === "0";
  } catch (e) {
    console.error("SMS send error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, phone, otp, name, email } = await req.json();
    const cleanPhone = normalizePhone(phone || "");

    if (!cleanPhone) {
      return new Response(JSON.stringify({ error: "সঠিক ফোন নম্বর দিন" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ───────────────────────── SEND OTP (login or auto-signup) ─────────────────────────
    if (action === "send_login_otp") {
      // Note: We no longer block if profile is missing — account will be auto-created on verify
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));

      // Invalidate previous unused OTPs
      await supabase.from("login_otps").update({ used: true }).eq("phone", cleanPhone).eq("used", false);
      await supabase.from("login_otps").insert({ phone: cleanPhone, otp: otpCode });

      await sendSmsOtp(supabase, cleanPhone, otpCode, "login");

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────── VERIFY OTP & RETURN SESSION (login) ────────────────────
    if (action === "verify_login_otp") {
      if (!otp) {
        return new Response(JSON.stringify({ error: "OTP দিন" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: otpRecord } = await supabase
        .from("login_otps")
        .select("*")
        .eq("phone", cleanPhone)
        .eq("otp", otp)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRecord) {
        return new Response(JSON.stringify({ error: "ভুল বা মেয়াদোত্তীর্ণ OTP" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find user by phone — if missing, auto-create account
      let { data: profile } = await supabase
        .from("profiles")
        .select("user_id, email")
        .eq("phone", cleanPhone)
        .limit(1)
        .maybeSingle();

      let userEmail: string | null = null;

      if (!profile?.user_id) {
        // Auto-create account for first-time login
        const newEmail = phoneToVirtualEmail(cleanPhone);
        const randomPassword = crypto.randomUUID() + crypto.randomUUID();

        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: newEmail,
          password: randomPassword,
          email_confirm: true,
          user_metadata: { phone: cleanPhone, username: cleanPhone },
        });

        if (createErr || !created?.user) {
          console.error("auto-createUser error:", createErr);
          return new Response(JSON.stringify({ error: createErr?.message || "Account তৈরি করতে সমস্যা" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Ensure profile has phone set (handle_new_user trigger creates the row)
        await supabase
          .from("profiles")
          .update({ phone: cleanPhone, username: cleanPhone, email: newEmail })
          .eq("user_id", created.user.id);

        userEmail = newEmail;
      } else {
        // Existing account
        const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(profile.user_id);
        if (authErr || !authUser?.user?.email) {
          return new Response(JSON.stringify({ error: "অ্যাকাউন্ট লোড করতে সমস্যা" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userEmail = authUser.user.email;
      }

      // Generate magic link to extract tokens
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail!,
      });

      if (linkErr || !linkData) {
        console.error("generateLink error:", linkErr);
        return new Response(JSON.stringify({ error: "Session তৈরি করতে সমস্যা" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Extract hashed_token + email_otp to verify on client
      const hashedToken = (linkData.properties as any)?.hashed_token;
      const emailOtp = (linkData.properties as any)?.email_otp;
      if (!hashedToken && !emailOtp) {
        return new Response(JSON.stringify({ error: "Token পাওয়া যায়নি" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark OTP as used (only after successfully generating link)
      await supabase.from("login_otps").update({ used: true }).eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({
          success: true,
          email: userEmail!,
          token_hash: hashedToken,
          email_otp: emailOtp,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ───────────────────────── SEND OTP (signup) ─────────────────────────
    if (action === "send_signup_otp") {
      // Check phone not already used
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", cleanPhone)
        .limit(1)
        .maybeSingle();

      if (existingProfile) {
        return new Response(
          JSON.stringify({ error: "এই ফোন নম্বর দিয়ে আগেই অ্যাকাউন্ট আছে। লগইন করুন।" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      await supabase.from("login_otps").update({ used: true }).eq("phone", cleanPhone).eq("used", false);
      await supabase.from("login_otps").insert({ phone: cleanPhone, otp: otpCode });

      await sendSmsOtp(supabase, cleanPhone, otpCode, "signup");

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────── VERIFY OTP & CREATE ACCOUNT (signup) ────────────────
    if (action === "verify_signup_otp") {
      if (!otp) {
        return new Response(JSON.stringify({ error: "OTP দিন" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify OTP
      const { data: otpRecord } = await supabase
        .from("login_otps")
        .select("*")
        .eq("phone", cleanPhone)
        .eq("otp", otp)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRecord) {
        return new Response(JSON.stringify({ error: "ভুল বা মেয়াদোত্তীর্ণ OTP" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Double-check phone not registered while OTP was active
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", cleanPhone)
        .limit(1)
        .maybeSingle();

      if (existingProfile) {
        await supabase.from("login_otps").update({ used: true }).eq("id", otpRecord.id);
        return new Response(
          JSON.stringify({ error: "এই ফোন নম্বর দিয়ে আগেই অ্যাকাউন্ট আছে। লগইন করুন।" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create auth user (with random password — never used)
      const userEmail = email?.trim() || phoneToVirtualEmail(cleanPhone);
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();

      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: userEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          phone: cleanPhone,
          username: name?.trim() || cleanPhone,
        },
      });

      if (createErr || !created?.user) {
        console.error("createUser error:", createErr);
        return new Response(JSON.stringify({ error: createErr?.message || "Account তৈরি করতে সমস্যা" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update profile with phone + name
      await supabase
        .from("profiles")
        .update({
          phone: cleanPhone,
          username: name?.trim() || cleanPhone,
          email: email?.trim() || userEmail,
        })
        .eq("user_id", created.user.id);

      // Mark OTP as used
      await supabase.from("login_otps").update({ used: true }).eq("id", otpRecord.id);

      // Generate magic link to log them in
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail,
      });

      if (linkErr || !linkData) {
        return new Response(JSON.stringify({ error: "Auto-login করতে সমস্যা, লগইন পেজে যান" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hashedToken = (linkData.properties as any)?.hashed_token;
      const emailOtp = (linkData.properties as any)?.email_otp;

      return new Response(
        JSON.stringify({
          success: true,
          email: userEmail,
          token_hash: hashedToken,
          email_otp: emailOtp,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("login-otp error:", error);
    return new Response(JSON.stringify({ error: error.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
