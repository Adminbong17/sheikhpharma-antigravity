import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (user_id === caller.id) {
      return new Response(JSON.stringify({ error: "Cannot delete yourself" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if user is a vendor — clean up vendor data first
    const { data: vendor } = await adminClient.from("vendors").select("id").eq("user_id", user_id).maybeSingle();
    if (vendor) {
      // Delete vendor-related data that might block deletion
      await adminClient.from("messages").delete().eq("vendor_id", vendor.id);
      await adminClient.from("vendor_payment_methods").delete().eq("vendor_id", vendor.id);
      await adminClient.from("vendor_payouts").delete().eq("vendor_id", vendor.id);
      await adminClient.from("vendor_follows").delete().eq("vendor_id", vendor.id);
      await adminClient.from("brand_requests").delete().eq("vendor_id", vendor.id);
      // Nullify vendor_id on products, invoices, refund_requests (SET NULL via FK)
      await adminClient.from("products").update({ vendor_id: null }).eq("vendor_id", vendor.id);
      await adminClient.from("invoices").update({ vendor_id: null }).eq("vendor_id", vendor.id);
      await adminClient.from("refund_requests").update({ vendor_id: null }).eq("vendor_id", vendor.id);
      // Delete the vendor record
      await adminClient.from("vendors").delete().eq("id", vendor.id);
    }

    // Clean up other user data
    await adminClient.from("customer_credits").delete().eq("user_id", user_id);
    await adminClient.from("customer_credit_payouts").delete().eq("user_id", user_id);
    await adminClient.from("support_tickets").delete().eq("user_id", user_id);
    await adminClient.from("user_addresses").delete().eq("user_id", user_id);
    await adminClient.from("activity_logs").delete().eq("user_id", user_id);
    await adminClient.from("profiles").delete().eq("user_id", user_id);
    await adminClient.from("user_roles").delete().eq("user_id", user_id);

    // Delete from auth (cascades remaining FKs)
    const { error } = await adminClient.auth.admin.deleteUser(user_id);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
