import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(input: string) {
  let p = String(input || "").replace(/[^0-9]/g, "");
  if (p.startsWith("880")) p = "0" + p.slice(3);
  if (p && !p.startsWith("0")) p = "0" + p;
  return p;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const action = String(body.action || "");
    const token = String(body.token || "").trim();
    const phone = normalizePhone(body.phone || "");

    if (!token) return json({ ok: false, error: "টোকেন পাওয়া যায়নি" }, 400);
    if (!/^01[3-9]\d{8}$/.test(phone)) {
      return json({ ok: false, error: "সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)" }, 400);
    }

    const { data: link } = await supabase
      .from("payment_links")
      .select("id, is_active, require_otp")
      .eq("token", token)
      .maybeSingle();

    if (!link || !link.is_active) return json({ ok: false, error: "এই পেমেন্ট লিংকটি সক্রিয় নয়" }, 404);
    if (!link.require_otp) return json({ ok: true, skipped: true });

    if (action === "send") {
      // simple rate limit: max 3 OTPs per phone+token in last 10 minutes
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("payment_link_otps")
        .select("id", { count: "exact", head: true })
        .eq("token", token)
        .eq("phone", phone)
        .gte("created_at", since);
      if ((count || 0) >= 3) {
        return json({ ok: false, error: "অনেকবার চেষ্টা হয়েছে, ১০ মিনিট পর আবার চেষ্টা করুন" }, 429);
      }

      const otp = String(Math.floor(1000 + Math.random() * 9000));

      await supabase.from("payment_link_otps")
        .update({ used: true })
        .eq("token", token).eq("phone", phone).eq("used", false);

      const { error: insErr } = await supabase.from("payment_link_otps")
        .insert({ token, phone, otp });
      if (insErr) return json({ ok: false, error: "OTP তৈরি করা যায়নি" }, 500);

      await supabase.functions.invoke("send-sms", {
        body: {
          phone,
          message: `আপনার পেমেন্ট ভেরিফিকেশন কোড: ${otp}\nকোডটি ১০ মিনিট পর্যন্ত কার্যকর।`,
          event_type: "payment_link_otp",
        },
      });

      return json({ ok: true, sent: true });
    }

    if (action === "verify") {
      const otp = String(body.otp || "").replace(/[^0-9]/g, "");
      if (otp.length !== 4) return json({ ok: false, error: "৪ ডিজিটের কোড দিন" }, 400);

      const { data: rec } = await supabase
        .from("payment_link_otps")
        .select("id, otp, attempts")
        .eq("token", token)
        .eq("phone", phone)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!rec) return json({ ok: false, error: "কোডের মেয়াদ শেষ, আবার কোড নিন" }, 400);
      if ((rec.attempts || 0) >= 5) {
        await supabase.from("payment_link_otps").update({ used: true }).eq("id", rec.id);
        return json({ ok: false, error: "অনেকবার ভুল হয়েছে, নতুন কোড নিন" }, 400);
      }
      if (rec.otp !== otp) {
        await supabase.from("payment_link_otps")
          .update({ attempts: (rec.attempts || 0) + 1 }).eq("id", rec.id);
        return json({ ok: false, error: "কোডটি সঠিক নয়" }, 400);
      }

      await supabase.from("payment_link_otps")
        .update({ used: true, verified_at: new Date().toISOString() })
        .eq("id", rec.id);

      return json({ ok: true, verified: true });
    }

    return json({ ok: false, error: "Invalid action" }, 400);
  } catch (err) {
    return json({ ok: false, error: (err as Error).message }, 500);
  }
});
