import { corsHeaders, getBkashConfig, getOrRefreshToken, isV2 } from "../_shared/bkash.ts";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const token: string = String(body.token || "").trim();
    const amount = Number(body.amount);
    const payerName: string | null = body.payer_name ? String(body.payer_name).slice(0, 120) : null;
    const payerPhone: string | null = body.payer_phone ? String(body.payer_phone).slice(0, 20) : null;
    const callbackUrl: string = String(body.callback_url || "");

    if (!token || !callbackUrl) return json({ ok: false, error: "Missing token or callback_url" }, 400);
    if (!Number.isFinite(amount) || amount < 1 || amount > 500000) {
      return json({ ok: false, error: "টাকার অংক সঠিক নয় (১ – ৫,০০,০০০)" }, 400);
    }

    const customData = body.custom_data && typeof body.custom_data === "object" ? body.custom_data : {};

    const { BKASH_BASE, APP_KEY, APP_SECRET, USERNAME, PASSWORD, supabase } = await getBkashConfig();

    const { data: link } = await supabase
      .from("payment_links")
      .select("id, is_active, fixed_amount, require_otp, custom_fields")
      .eq("token", token)
      .maybeSingle();

    if (!link || !link.is_active) return json({ ok: false, error: "এই পেমেন্ট লিংকটি সক্রিয় নয়" }, 404);

    // Required custom fields validation
    const fields = Array.isArray(link.custom_fields) ? link.custom_fields : [];
    for (const f of fields) {
      if (f?.required && !String((customData as any)[f.key] ?? "").trim()) {
        return json({ ok: false, error: `${f.label || f.key} পূরণ করুন` }, 400);
      }
    }

    // OTP enforcement
    if (link.require_otp) {
      let p = String(payerPhone || "").replace(/[^0-9]/g, "");
      if (p.startsWith("880")) p = "0" + p.slice(3);
      if (p && !p.startsWith("0")) p = "0" + p;

      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: verified } = await supabase
        .from("payment_link_otps")
        .select("id")
        .eq("token", token)
        .eq("phone", p)
        .not("verified_at", "is", null)
        .gte("verified_at", since)
        .limit(1)
        .maybeSingle();

      if (!verified) return json({ ok: false, error: "প্রথমে মোবাইল নম্বর যাচাই করুন" }, 400);
    }

    const finalAmount = link.fixed_amount ? Number(link.fixed_amount) : amount;

    const { data: payment, error: insErr } = await supabase
      .from("payment_link_payments")
      .insert({
        link_id: link.id,
        amount: finalAmount,
        payer_name: payerName,
        payer_phone: payerPhone,
        custom_data: customData,
        status: "pending",
      })
      .select("id")
      .single();

    if (insErr || !payment) return json({ ok: false, error: "পেমেন্ট রেকর্ড তৈরি করা যায়নি" }, 500);

    const idToken = await getOrRefreshToken(supabase, BKASH_BASE, APP_KEY, APP_SECRET, USERNAME, PASSWORD);
    const createUrl = isV2(BKASH_BASE)
      ? `${BKASH_BASE}/checkout/create`
      : `${BKASH_BASE}/tokenized/checkout/create`;

    const cb = `${callbackUrl}${callbackUrl.includes("?") ? "&" : "?"}pay_id=${payment.id}`;

    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: idToken,
        "X-APP-Key": APP_KEY,
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: payerPhone || " ",
        callbackURL: cb,
        amount: String(finalAmount),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: `PL-${String(payment.id).slice(0, 8)}-${Date.now()}`,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const raw = await createRes.text();
    let data: any = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { /* ignore */ }
    console.log(`[PaymentLink] create status=${createRes.status} body=${raw.slice(0, 500)}`);

    if (!data.bkashURL) {
      await supabase.from("payment_link_payments").update({
        status: "failed",
        failure_reason: data.statusMessage || "bKash create failed",
      }).eq("id", payment.id);
      return json({ ok: false, error: data.statusMessage || "bKash পেমেন্ট শুরু করা যায়নি" }, 400);
    }

    await supabase.from("payment_link_payments")
      .update({ payment_id: data.paymentID || data.paymentId || null })
      .eq("id", payment.id);

    return json({ ok: true, bkashURL: data.bkashURL, pay_id: payment.id, amount: finalAmount });
  } catch (err) {
    console.log(`[PaymentLink] EXCEPTION: ${(err as Error).message}`);
    return json({ ok: false, error: (err as Error).message }, 500);
  }
});
