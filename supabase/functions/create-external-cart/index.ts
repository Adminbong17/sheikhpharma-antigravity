import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Validate API key
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing x-api-key header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: keyRow } = await supabase
    .from("api_keys")
    .select("id, is_active")
    .eq("api_key", apiKey)
    .single();

  if (!keyRow || !keyRow.is_active) {
    return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update last_used_at
  await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

  try {
    const body = await req.json();
    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "items must be a non-empty array of { product_id, quantity }" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (items.length > 50) {
      return new Response(JSON.stringify({ error: "Maximum 50 items per cart" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate each item
    const productIds: string[] = [];
    for (const item of items) {
      if (!item.product_id || typeof item.product_id !== "string") {
        return new Response(JSON.stringify({ error: "Each item must have a valid product_id (string UUID)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const qty = parseInt(item.quantity);
      if (!qty || qty < 1 || qty > 100) {
        return new Response(JSON.stringify({ error: `Invalid quantity for product ${item.product_id}. Must be 1-100.` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      item.quantity = qty;
      productIds.push(item.product_id);
    }

    // Verify products exist and are active
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, image_url, is_active")
      .in("id", productIds)
      .eq("is_active", true);

    if (!products || products.length !== new Set(productIds).size) {
      const foundIds = new Set((products || []).map((p: any) => p.id));
      const missing = productIds.filter((id) => !foundIds.has(id));
      return new Response(JSON.stringify({ error: "Some products not found or inactive", missing_product_ids: [...new Set(missing)] }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build enriched items for storage
    const enrichedItems = items.map((item: any) => {
      const product = products.find((p: any) => p.id === item.product_id);
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        name: product?.name,
        price: product?.price,
        image_url: product?.image_url,
      };
    });

    // Insert cart
    const { data: cart, error: cartError } = await supabase
      .from("external_carts")
      .insert({
        items: enrichedItems,
        api_key_id: keyRow.id,
      })
      .select("cart_token")
      .single();

    if (cartError) {
      throw cartError;
    }

    // Build checkout URL
    const siteUrl = "https://qweekbd.lovable.app";
    const checkoutUrl = `${siteUrl}/cart/${cart.cart_token}`;

    return new Response(JSON.stringify({
      success: true,
      data: {
        checkout_url: checkoutUrl,
        cart_token: cart.cart_token,
        items: enrichedItems,
        expires_in: "24 hours",
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
