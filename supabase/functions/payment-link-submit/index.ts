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
    const token = String(body.token || "").trim();
    const name = body.name ? String(body.name).slice(0, 120) : null;
    const phone = normalizePhone(body.phone || "");
    const data = body.data && typeof body.data === "object" ? body.data : {};

    if (!token) return json({ ok: false, error: "টোকেন পাওয়া যায়নি" }, 400);

    const { data: link } = await supabase
      .from("payment_links")
      .select("id, is_active, mode, require_otp, custom_fields, title")
      .eq("token", token)
      .maybeSingle();

    if (!link || !link.is_active) return json({ ok: false, error: "এই লিংকটি সক্রিয় নয়" }, 404);
    if (link.mode !== "form") return json({ ok: false, error: "এই লিংকটি ফর্ম মোডে নেই" }, 400);

    const fields = Array.isArray(link.custom_fields) ? link.custom_fields : [];
    for (const f of fields) {
      if (f?.required && !String((data as Record<string, unknown>)[f.key] ?? "").trim()) {
        return json({ ok: false, error: `${f.label || f.key} পূরণ করুন` }, 400);
      }
    }

    let verified = false;
    if (link.require_otp) {
      if (!/^01[3-9]\d{8}$/.test(phone)) {
        return json({ ok: false, error: "সঠিক মোবাইল নম্বর দিন" }, 400);
      }
      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: ok } = await supabase
        .from("payment_link_otps")
        .select("id")
        .eq("token", token)
        .eq("phone", phone)
        .not("verified_at", "is", null)
        .gte("verified_at", since)
        .limit(1)
        .maybeSingle();
      if (!ok) return json({ ok: false, error: "প্রথমে মোবাইল নম্বর যাচাই করুন" }, 400);
      verified = true;
    }

    const { data: sub, error: insErr } = await supabase
      .from("payment_link_submissions")
      .insert({
        link_id: link.id,
        name,
        phone: phone || null,
        phone_verified: verified,
        data,
      })
      .select("id")
      .single();

    if (insErr || !sub) return json({ ok: false, error: "তথ্য সংরক্ষণ করা যায়নি" }, 500);

    return json({ ok: true, id: sub.id });
  } catch (err) {
    return json({ ok: false, error: (err as Error).message }, 500);
  }
});
