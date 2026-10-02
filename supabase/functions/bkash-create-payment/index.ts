import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type BkashCreateSuccess = {
  ok: true;
  bkashURL: string;
  paymentID: string | null;
};

type BkashCreateFailure = {
  ok: false;
  error: string;
  fallback: true;
  errorCode?: string | null;
  bkashStatus?: number;
  details?: unknown;
};

function respond(payload: BkashCreateSuccess | BkashCreateFailure, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isV2(base: string) { return base.includes("/v2"); }

async function getOrRefreshToken(supabase: any, bkashBase: string, appKey: string, appSecret: string, username: string, password: string): Promise<string> {
  // Step 1: Check DB for valid token
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

  // Step 2: Try refresh if we have a refresh_token
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

  // Step 3: Grant new token (last resort)
  const grantUrl = isV2(bkashBase) ? `${bkashBase}/checkout/token/grant` : `${bkashBase}/tokenized/checkout/token/grant`;
  console.log(`[bKash] Grant Token → POST ${grantUrl}`);
  const res = await fetch(grantUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", username, password },
    body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
    signal: AbortSignal.timeout(30000),
  });

  const rawText = await res.text();
  let data: any = {};
  try { data = rawText ? JSON.parse(rawText) : {}; } catch { throw new Error(`Grant token returned invalid JSON (${res.status})`); }

  console.log(`[bKash] Grant Token Response Status: ${res.status}`);
  if (!data.id_token) throw new Error(data.errorMessageEn || data.statusMessage || data.message || "Grant token failed");

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 55 * 60 * 1000);

  // Delete old tokens and insert new one
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
  const adminSupabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let BKASH_BASE = Deno.env.get("BKASH_BASE_URL") || "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
  let APP_KEY = Deno.env.get("BKASH_APP_KEY") || "";
  let APP_SECRET = Deno.env.get("BKASH_APP_SECRET") || "";
  let USERNAME = Deno.env.get("BKASH_USERNAME") || "";
  let PASSWORD = Deno.env.get("BKASH_PASSWORD") || "";

  const { data: s } = await adminSupabase
    .from("site_settings")
    .select("bkash_base_url, bkash_app_key, bkash_app_secret, bkash_username, bkash_password")
    .single();

  if (s?.bkash_base_url) BKASH_BASE = s.bkash_base_url;
  if (s?.bkash_app_key) APP_KEY = s.bkash_app_key;
  if (s?.bkash_app_secret) APP_SECRET = s.bkash_app_secret;
  if (s?.bkash_username) USERNAME = s.bkash_username;
  if (s?.bkash_password) PASSWORD = s.bkash_password;

  console.log(`[bKash] Config loaded — Base URL: ${BKASH_BASE}, App Key: ${APP_KEY.substring(0, 8)}...`);
  return { BKASH_BASE, APP_KEY, APP_SECRET, USERNAME, PASSWORD, supabase: adminSupabase };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { amount, order_id, callback_url } = await req.json();
    console.log(`[bKash] === CREATE PAYMENT START ===`);
    console.log(`[bKash] Input: amount=${amount}, order_id=${order_id}, callback_url=${callback_url}`);

    if (!amount || !order_id || !callback_url) {
      return respond({ ok: false, fallback: true, error: "Missing required fields" }, 200);
    }

    const { BKASH_BASE, APP_KEY, APP_SECRET, USERNAME, PASSWORD, supabase } = await getBkashConfig();
    const token = await getOrRefreshToken(supabase, BKASH_BASE, APP_KEY, APP_SECRET, USERNAME, PASSWORD);
    const invoiceNumber = `INV-${order_id.slice(0, 8)}-${Date.now()}`;

    const createUrl = isV2(BKASH_BASE) ? `${BKASH_BASE}/checkout/create` : `${BKASH_BASE}/tokenized/checkout/create`;
    const createBody = {
      mode: "0011",
      payerReference: " ",
      callbackURL: callback_url,
      amount: String(amount),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: invoiceNumber,
    };

    console.log(`[bKash] Create Payment → POST ${createUrl}`);
    console.log(`[bKash] Create Body: ${JSON.stringify(createBody)}`);

    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
        "X-APP-Key": APP_KEY,
      },
      body: JSON.stringify(createBody),
      signal: AbortSignal.timeout(30000),
    });

    const rawText = await createRes.text();
    console.log(`[bKash] Create Response Status: ${createRes.status}`);
    console.log(`[bKash] Create Raw Response: ${rawText}`);

    let createData: any = {};
    try { createData = rawText ? JSON.parse(rawText) : {}; } catch {
      return respond({
        ok: false, fallback: true, error: "bKash returned non-JSON response",
        bkashStatus: createRes.status, details: rawText.substring(0, 500),
      });
    }

    if (createData.bkashURL) {
      const resolvedPaymentID = createData.paymentID || createData.paymentId || null;
      console.log(`[bKash] SUCCESS — paymentID: ${resolvedPaymentID}, bkashURL: ${createData.bkashURL}`);
      return respond({ ok: true, bkashURL: createData.bkashURL, paymentID: resolvedPaymentID });
    }

    console.log(`[bKash] FAILED — statusCode: ${createData.statusCode}, statusMessage: ${createData.statusMessage}`);
    return respond({
      ok: false, fallback: true,
      error: createData.statusMessage || createData.errorMessageEn || createData.message || "Create payment failed",
      errorCode: createData.statusCode || null, bkashStatus: createRes.status, details: createData,
    });
  } catch (err: any) {
    console.log(`[bKash] EXCEPTION: ${err.message}`);
    return respond({ ok: false, fallback: true, error: err?.message || "Unexpected bKash error" });
  }
});
