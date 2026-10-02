import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Validate API key
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing x-api-key header" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: keyRow } = await supabase
    .from("api_keys")
    .select("id, is_active, name")
    .eq("api_key", apiKey)
    .single();

  if (!keyRow || !keyRow.is_active) {
    return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update last_used_at
  await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

  const url = new URL(req.url);
  const endpoint = url.pathname.split("/").pop() || "";

  try {
    let result: any;

    switch (endpoint) {
      // ─── Categories ───
      case "categories": {
        const { data } = await supabase.from("categories").select("id, name, slug, icon_url, sort_order").order("sort_order");
        result = data;
        break;
      }

      // ─── Subcategories ───
      case "subcategories": {
        const categorySlug = url.searchParams.get("category");
        let query = supabase.from("subcategories").select("id, category_id, name, slug, sort_order").order("sort_order");
        if (categorySlug) {
          const { data: cat } = await supabase.from("categories").select("id").eq("slug", categorySlug).single();
          if (cat) query = query.eq("category_id", cat.id);
        }
        const { data } = await query;
        result = data;
        break;
      }

      // ─── Brands ───
      case "brands": {
        const { data } = await supabase.from("brands").select("id, name, logo_url").eq("is_active", true).eq("status", "approved").order("name");
        result = data;
        break;
      }

      // ─── Products List ───
      case "products": {
        const category = url.searchParams.get("category");
        const subcategory = url.searchParams.get("subcategory");
        const brandId = url.searchParams.get("brand_id");
        const search = url.searchParams.get("search");
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
        const offset = (page - 1) * limit;

        let query = supabase.from("products")
          .select("id, name, slug, price, original_price, price_unit, image_url, category, subcategory, brand_id, stock, rating, sold_count, is_preorder, sku, description")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (category) query = query.eq("category", category);
        if (subcategory) query = query.eq("subcategory", subcategory);
        if (brandId) query = query.eq("brand_id", brandId);
        if (search) query = query.ilike("name", `%${search}%`);

        const { data } = await query;
        result = { products: data, page, limit };
        break;
      }

      // ─── Single Product ───
      case "product": {
        const slug = url.searchParams.get("slug");
        const id = url.searchParams.get("id");
        if (!slug && !id) {
          return new Response(JSON.stringify({ error: "Provide slug or id" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        let query = supabase.from("products")
          .select("id, name, slug, price, original_price, price_unit, image_url, category, subcategory, brand_id, stock, rating, sold_count, is_preorder, sku, description")
          .eq("is_active", true);
        if (slug) query = query.eq("slug", slug);
        else query = query.eq("id", id!);
        const { data } = await query.single();

        let images: any[] = [];
        let variants: any[] = [];
        if (data) {
          const [imgRes, varRes] = await Promise.all([
            supabase.from("product_images").select("image_url, sort_order").eq("product_id", data.id).order("sort_order"),
            supabase.from("product_variants").select("id, variant_name, variant_value, price_adjustment, stock, sku, sort_order").eq("product_id", data.id).order("sort_order"),
          ]);
          images = imgRes.data || [];
          variants = varRes.data || [];
        }

        result = data ? { ...data, images, variants } : null;
        break;
      }

      // ─── Order Status (for external partner tracking) ───
      case "order-status": {
        const orderId = url.searchParams.get("order_id");
        const orderNumber = url.searchParams.get("order_number");
        if (!orderId && !orderNumber) {
          return new Response(JSON.stringify({ error: "Provide order_id or order_number" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let query = supabase.from("orders")
          .select("id, order_number, status, total, payment_method, created_at, updated_at, customer_name, customer_phone, customer_address, customer_division, customer_zilla, customer_upazilla, steadfast_tracking_code, carrybee_consignment_id");

        if (orderId) query = query.eq("id", orderId);
        else query = query.eq("order_number", parseInt(orderNumber!));

        const { data } = await query.single();

        if (!data) {
          return new Response(JSON.stringify({ error: "Order not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get order items
        const { data: items } = await supabase.from("order_items")
          .select("id, product_id, quantity, price")
          .eq("order_id", data.id);

        result = { ...data, items: items || [] };
        break;
      }

      // ─── Send Message to Admin ───
      case "send-message": {
        if (req.method !== "POST") {
          return new Response(JSON.stringify({ error: "POST required" }), {
            status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = await req.json();
        const { message, order_id, sender_name } = body;

        if (!message || typeof message !== "string" || message.trim().length === 0) {
          return new Response(JSON.stringify({ error: "message is required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create admin notification with API partner context
        const { data: notif, error: notifErr } = await supabase.from("admin_notifications").insert({
          title: `API Partner Message: ${keyRow.name || "Unknown"}`,
          body: message.trim(),
          type: "api_message",
          metadata: {
            api_key_id: keyRow.id,
            api_key_name: keyRow.name,
            order_id: order_id || null,
            sender_name: sender_name || keyRow.name,
          },
        }).select("id").single();

        if (notifErr) throw notifErr;

        result = { message_id: notif?.id, status: "sent" };
        break;
      }

      // ─── Get Messages (replies from admin) ───
      case "get-messages": {
        const { data } = await supabase.from("admin_notifications")
          .select("id, title, body, type, created_at, metadata, is_read")
          .or(`type.eq.api_reply,metadata->api_key_id.eq.${keyRow.id}`)
          .order("created_at", { ascending: false })
          .limit(50);

        // Filter only messages relevant to this API key
        const filtered = (data || []).filter((n: any) =>
          n.metadata?.api_key_id === keyRow.id
        );

        result = filtered;
        break;
      }

      default:
        return new Response(JSON.stringify({
          error: "Unknown endpoint",
          available: ["categories", "subcategories", "brands", "products", "product", "order-status", "send-message", "get-messages"],
        }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
