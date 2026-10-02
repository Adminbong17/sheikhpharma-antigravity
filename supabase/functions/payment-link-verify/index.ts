import { corsHeaders, getBkashConfig, getOrRefreshToken, isV2 } from "../_shared/bkash.ts";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callBkash(url: string, appKey: string, token: string, paymentID: string) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
        "X-APP-Key": appKey,
      },
      body: JSON.stringify({ paymentID }),
      signal: AbortSignal.timeout(30000),
    });
    return await res.json();
  } catch (err) {
    console.log(`[PaymentLink] bKash call error: ${(err as Error).message}`);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { paymentID, pay_id } = await req.json();
    if (!paymentID || !pay_id) return json({ success: false, error: "Missing paymentID or pay_id" }, 400);

    const { BKASH_BASE, APP_KEY, APP_SECRET, USERNAME, PASSWORD, supabase } = await getBkashConfig();
    const token = await getOrRefreshToken(supabase, BKASH_BASE, APP_KEY, APP_SECRET, USERNAME, PASSWORD);

    const execUrl = isV2(BKASH_BASE)
      ? `${BKASH_BASE}/checkout/execute`
      : `${BKASH_BASE}/tokenized/checkout/execute`;
    const statusUrl = isV2(BKASH_BASE)
      ? `${BKASH_BASE}/checkout/payment/status`
      : `${BKASH_BASE}/tokenized/checkout/payment/status`;

    let result = await callBkash(execUrl, APP_KEY, token, paymentID);
    if (!result || !result.transactionStatus) {
      result = await callBkash(statusUrl, APP_KEY, token, paymentID);
    }

    const isSuccess = result?.transactionStatus === "Completed" || result?.statusCode === "0000";
    console.log(`[PaymentLink] verify pay_id=${pay_id} success=${isSuccess} status=${result?.transactionStatus}`);

    if (isSuccess) {
      const trxId = result.trxID || paymentID;
      await supabase.from("payment_link_payments").update({
        status: "success",
        trx_id: trxId,
        payment_id: paymentID,
        paid_at: new Date().toISOString(),
        amount: result.amount ? Number(result.amount) : undefined,
      }).eq("id", pay_id);

      // Notify admin (and payer) via SMS
      try {
        const { data: pay } = await supabase
          .from("payment_link_payments")
          .select("amount, payer_name, payer_phone, link_id")
          .eq("id", pay_id)
          .maybeSingle();

        let linkTitle = "Payment Link";
        if (pay?.link_id) {
          const { data: link } = await supabase
            .from("payment_links").select("title").eq("id", pay.link_id).maybeSingle();
          if (link?.title) linkTitle = link.title;
        }

        const { data: smsSettings } = await supabase
          .from("sms_settings").select("*").limit(1).maybeSingle();

        const amt = pay?.amount ?? result.amount ?? "";
        const sendSmsUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const send = (phone: string, message: string, event_type: string) =>
          fetch(sendSmsUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({ phone, message, event_type }),
          }).catch((e) => console.log(`[PaymentLink] sms error: ${e.message}`));

        if (smsSettings?.admin_phone) {
          const adminMsg = `Payment received! ${linkTitle} | Amount: Tk${amt} | TrxID: ${trxId} | Payer: ${pay?.payer_name || "N/A"} ${pay?.payer_phone || ""}`;
          await send(smsSettings.admin_phone, adminMsg, "payment_link_admin");
        }
        if (pay?.payer_phone) {
          await send(
            pay.payer_phone,
            `Your payment of Tk${amt} is successful. TrxID: ${trxId}. Thank you!`,
            "payment_link_customer",
          );
        }
      } catch (e) {
        console.log(`[PaymentLink] notify exception: ${(e as Error).message}`);
      }

      return json({ success: true, trxID: trxId, amount: result.amount });
    }


    await supabase.from("payment_link_payments").update({
      status: "failed",
      payment_id: paymentID,
      failure_reason: result?.statusMessage || "Payment not completed",
    }).eq("id", pay_id);

    return json({
      success: false,
      error: result?.statusMessage || "পেমেন্ট সম্পন্ন হয়নি",
      statusCode: result?.statusCode,
    });
  } catch (err) {
    console.log(`[PaymentLink] EXCEPTION: ${(err as Error).message}`);
    return json({ success: false, error: (err as Error).message }, 500);
  }
});
