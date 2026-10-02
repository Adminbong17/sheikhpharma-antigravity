import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tables that can be restored
const ALLOWED_TABLES = [
  "products", "orders", "order_items", "categories", "subcategories", "brands",
  "coupons", "hero_slides", "homepage_sections", "homepage_section_products",
  "delivery_zones", "static_pages", "staff_members", "invoices",
  "product_images", "product_variants", "product_reviews", "messages",
  "vendor_payment_methods", "vendor_payouts", "brand_requests",
  "support_tickets", "support_ticket_messages", "payment_methods",
  "career_applications", "customer_credits", "customer_credit_payouts",
  "refund_requests", "incomplete_orders",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { trash_id } = await req.json();
    if (!trash_id) {
      return new Response(JSON.stringify({ error: "trash_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get trash record
    const { data: trashRecord, error: trashError } = await adminClient
      .from("trash")
      .select("*")
      .eq("id", trash_id)
      .is("restored_at", null)
      .single();

    if (trashError || !trashRecord) {
      return new Response(JSON.stringify({ error: "Trash record not found or already restored" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { table_name, record_data } = trashRecord;

    if (!ALLOWED_TABLES.includes(table_name)) {
      return new Response(JSON.stringify({ error: `Table ${table_name} is not restorable` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert back to original table
    const { error: insertError } = await adminClient
      .from(table_name)
      .insert(record_data);

    if (insertError) {
      console.error("Restore insert error:", insertError);
      return new Response(JSON.stringify({ error: `Restore failed: ${insertError.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as restored
    await adminClient.from("trash").update({ restored_at: new Date().toISOString() }).eq("id", trash_id);

    // Log activity
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      action: "restore",
      details: `Restored ${table_name} record`,
      entity_type: table_name,
      entity_id: trashRecord.record_id,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
