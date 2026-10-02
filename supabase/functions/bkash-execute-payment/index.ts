import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function isV2(base: string) { return base.includes("/v2"); }

async function getOrRefreshToken(supabase: any, bkashBase: string, appKey: string, appSecret: string, username: string, password: string): Promise<string> {
  const { data: existing, error: selErr } = await supabase
    .from("bkash_tokens")
    .select("id, id_token, refresh_token, expires_at")
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (selErr) console.log(`[bKash] Token select error: ${selErr.message}`);

  if (existing && new Date(existing.expires_at) > new Date()) {
    console.log("[bKash] Using cached token from DB (still valid)");
    return existing.id_token;
  }

  if (existing?.refresh_token) {
    try {
      const refreshUrl = isV2(bkashBase) ? `${bkashBase}/checkout/token/refresh` : `${bkashBase}/tokenized/checkout/token/refresh`;
      console.log(`[bKash] Refreshing token → POST ${refreshUrl}`);
      const res = await fetch(refreshUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", username, password },
        body: JSON.stringify({ app_key: appKey, app_secret: appSecret, refresh_token: existing.refresh_token }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      if (data.id_token) {
        console.log("[bKash] Token refreshed successfully");
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 55 * 60 * 1000);
        await supabase.from("bkash_tokens").delete().neq("id", existing.id);
        await supabase.from("bkash_tokens").update({
          id_token: data.id_token,
          refresh_token: data.refresh_token || existing.refresh_token,
          granted_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        }).eq("id", existing.id);
        return data.id_token;
      }
      console.log(`[bKash] Refresh failed: ${data.statusMessage || "no id_token"}`);
    } catch (e: any) {
      console.log(`[bKash] Refresh error: ${e.message}`);
    }
  }

  const grantUrl = isV2(bkashBase) ? `${bkashBase}/checkout/token/grant` : `${bkashBase}/tokenized/checkout/token/grant`;
  console.log(`[bKash] Grant Token → POST ${grantUrl}`);
  const res = await fetch(grantUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", username, password },
    body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json();
  console.log(`[bKash] Grant Token Response Status: ${res.status}`);
  if (!data.id_token) throw new Error(data.errorMessageEn || data.statusMessage || "Grant token failed");

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 55 * 60 * 1000);
  if (existing) await supabase.from("bkash_tokens").delete().eq("id", existing.id);
  await supabase.from("bkash_tokens").insert({
    id_token: data.id_token,
    refresh_token: data.refresh_token || null,
    granted_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  console.log("[bKash] New token granted and stored in DB");
  return data.id_token;
}

async function getBkashConfig() {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let BKASH_BASE = Deno.env.get("BKASH_BASE_URL") || "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
  let APP_KEY = Deno.env.get("BKASH_APP_KEY") || "";
  let APP_SECRET = Deno.env.get("BKASH_APP_SECRET") || "";
  let USERNAME = Deno.env.get("BKASH_USERNAME") || "";
  let PASSWORD = Deno.env.get("BKASH_PASSWORD") || "";

  const { data: s } = await supabase
    .from("site_settings")
    .select("bkash_base_url, bkash_app_key, bkash_app_secret, bkash_username, bkash_password")
    .single();

  if (s?.bkash_base_url) BKASH_BASE = s.bkash_base_url;
  if (s?.bkash_app_key) APP_KEY = s.bkash_app_key;
  if (s?.bkash_app_secret) APP_SECRET = s.bkash_app_secret;
  if (s?.bkash_username) USERNAME = s.bkash_username;
  if (s?.bkash_password) PASSWORD = s.bkash_password;

  console.log(`[bKash] Config loaded — Base URL: ${BKASH_BASE}`);
  return { BKASH_BASE, APP_KEY, APP_SECRET, USERNAME, PASSWORD, supabase };
}

async function executePayment(bkashBase: string, appKey: string, token: string, paymentID: string) {
  const url = isV2(bkashBase) ? `${bkashBase}/checkout/execute` : `${bkashBase}/tokenized/checkout/execute`;
  console.log(`[bKash] Execute Payment → POST ${url}`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: token, "X-APP-Key": appKey },
      body: JSON.stringify({ paymentID }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json();
    console.log(`[bKash] Execute Response: ${JSON.stringify(data)}`);
    return data;
  } catch (err: any) {
    console.log(`[bKash] Execute TIMEOUT/ERROR: ${err.message}`);
    return null;
  }
}

async function queryPayment(bkashBase: string, appKey: string, token: string, paymentID: string) {
  const url = isV2(bkashBase) ? `${bkashBase}/checkout/payment/status` : `${bkashBase}/tokenized/checkout/payment/status`;
  console.log(`[bKash] Query Payment → POST ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: token, "X-APP-Key": appKey },
    body: JSON.stringify({ paymentID }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json();
  console.log(`[bKash] Query Response: ${JSON.stringify(data)}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { paymentID, order_id, payment_type } = await req.json();
    console.log(`[bKash] === EXECUTE PAYMENT START ===`);
    console.log(`[bKash] Input: paymentID=${paymentID}, order_id=${order_id}, payment_type=${payment_type}`);

    if (!paymentID || !order_id) {
      return new Response(JSON.stringify({ error: "Missing paymentID or order_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { BKASH_BASE, APP_KEY, APP_SECRET, USERNAME, PASSWORD, supabase } = await getBkashConfig();
    const token = await getOrRefreshToken(supabase, BKASH_BASE, APP_KEY, APP_SECRET, USERNAME, PASSWORD);

    let result = await executePayment(BKASH_BASE, APP_KEY, token, paymentID);

    if (!result || !result.transactionStatus) {
      console.log("[bKash] Execute failed, falling back to Query Payment API");
      result = await queryPayment(BKASH_BASE, APP_KEY, token, paymentID);
    }

    const isSuccess = result?.transactionStatus === "Completed" || result?.statusCode === "0000";
    console.log(`[bKash] Result — transactionStatus: ${result?.transactionStatus}, statusCode: ${result?.statusCode}, isSuccess: ${isSuccess}`);

    if (isSuccess) {
      const trxId = result.trxID || result.paymentID || paymentID;
      console.log(`[bKash] SUCCESS — trxID: ${trxId}, amount: ${result.amount}`);

      if (payment_type === "lab_service") {
        await supabase.from("lab_test_bookings").update({ payment_status: "paid", transaction_id: trxId }).eq("id", order_id);
      } else if (payment_type === "cod_delivery_charge") {
        await supabase.from("orders").update({ transaction_id: `bkash_dc_${trxId}` }).eq("id", order_id);
      } else {
        await supabase.from("orders").update({ payment_method: "bkash", transaction_id: trxId }).eq("id", order_id);
      }

      return new Response(JSON.stringify({ success: true, trxID: trxId, amount: result.amount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[bKash] FAILED — statusMessage: ${result?.statusMessage}, statusCode: ${result?.statusCode}`);
    return new Response(JSON.stringify({
      success: false, error: result?.statusMessage || "Payment not completed", statusCode: result?.statusCode,
    }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.log(`[bKash] EXCEPTION: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
