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
  if (!data.id_token) throw new Error(data.statusMessage || "Grant token failed");

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
  return { BKASH_BASE, APP_KEY, APP_SECRET, USERNAME, PASSWORD, supabase };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, paymentID, trxID, amount, reason, sku } = await req.json();

    const { BKASH_BASE, APP_KEY, APP_SECRET, USERNAME, PASSWORD, supabase } = await getBkashConfig();
    const token = await getOrRefreshToken(supabase, BKASH_BASE, APP_KEY, APP_SECRET, USERNAME, PASSWORD);

    if (action === "refund") {
      if (!paymentID || !trxID || !amount) {
        return new Response(JSON.stringify({ error: "Missing paymentID, trxID, or amount" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const refundUrl = isV2(BKASH_BASE) ? `${BKASH_BASE}/checkout/payment/refund` : `${BKASH_BASE}/tokenized/checkout/payment/refund`;
      console.log(`[bKash] Refund → POST ${refundUrl}`);

      const refundRes = await fetch(refundUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: token, "X-APP-Key": APP_KEY },
        body: JSON.stringify({ paymentID, trxID, amount: String(amount), reason: reason || "Customer refund request", sku: sku || "N/A" }),
        signal: AbortSignal.timeout(30000),
      });

      const refundData = await refundRes.json();
      console.log(`[bKash] Refund Response: ${JSON.stringify(refundData)}`);

      if (!refundData || !refundData.statusCode) {
        console.log("[bKash] Refund response unclear, querying refund status...");
        const rsUrl = isV2(BKASH_BASE) ? `${BKASH_BASE}/checkout/payment/refund` : `${BKASH_BASE}/tokenized/checkout/payment/refund`;
        const statusRes = await fetch(rsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: token, "X-APP-Key": APP_KEY },
          body: JSON.stringify({ paymentID, trxID }),
          signal: AbortSignal.timeout(30000),
        });
        const statusData = await statusRes.json();
        return new Response(JSON.stringify({ ...statusData, fallback: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(refundData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "refund_status") {
      if (!paymentID || !trxID) {
        return new Response(JSON.stringify({ error: "Missing paymentID or trxID" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statusUrl = isV2(BKASH_BASE) ? `${BKASH_BASE}/checkout/payment/refund` : `${BKASH_BASE}/tokenized/checkout/payment/refund`;
      console.log(`[bKash] Refund Status → POST ${statusUrl}`);
      const statusRes = await fetch(statusUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: token, "X-APP-Key": APP_KEY },
        body: JSON.stringify({ paymentID, trxID }),
        signal: AbortSignal.timeout(30000),
      });
      const statusData = await statusRes.json();
      console.log(`[bKash] Refund Status Response: ${JSON.stringify(statusData)}`);
      return new Response(JSON.stringify(statusData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'refund' or 'refund_status'" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
