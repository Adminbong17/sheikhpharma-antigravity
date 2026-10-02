import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_url } = await req.json();
    if (!image_url) throw new Error("image_url is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch the image
    const imgResponse = await fetch(image_url);
    if (!imgResponse.ok) throw new Error("Failed to fetch image");
    
    const imgBuffer = await imgResponse.arrayBuffer();
    const uint8 = new Uint8Array(imgBuffer);
    
    // Convert to base64 in chunks to avoid stack overflow for large images
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      const chunk = uint8.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);
    
    // Detect content type, normalize to jpeg/png for best compatibility
    let contentType = imgResponse.headers.get("content-type") || "image/jpeg";
    // Strip any parameters like charset
    contentType = contentType.split(";")[0].trim();
    
    // If content type is not a standard image type, default to jpeg
    const supportedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff"];
    if (!supportedTypes.includes(contentType)) {
      contentType = "image/jpeg";
    }

    const dataUrl = `data:${contentType};base64,${base64}`;

    // Use a prompt that frames the task as image restoration/cleaning
    const prompt = `You are an image restoration assistant. This is my own product photo that I took myself. During the photo shoot, some unwanted text and overlay marks accidentally appeared on the image. Please restore the image by removing any text overlays, stamps, or marks that are not part of the actual product. Keep the product, background, colors, lighting, and composition exactly the same. Output only the restored clean image.`;

    // Use Gemini image model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    
    // Extract the generated image from the response
    const choice = data.choices?.[0]?.message;
    let resultImageUrl = null;
    
    // Check images array (correct response format for modalities)
    if (choice?.images && Array.isArray(choice.images)) {
      for (const img of choice.images) {
        if (img.type === "image_url" && img.image_url?.url) {
          resultImageUrl = img.image_url.url;
          break;
        }
      }
    }
    
    // Fallback: check content array
    if (!resultImageUrl && Array.isArray(choice?.content)) {
      for (const part of choice.content) {
        if (part.type === "image_url" && part.image_url?.url) {
          resultImageUrl = part.image_url.url;
          break;
        }
      }
    }

    if (!resultImageUrl) {
      // Log partial response for debugging
      const textContent = typeof choice?.content === "string" 
        ? choice.content.slice(0, 300) 
        : JSON.stringify(choice).slice(0, 300);
      console.error("No image returned. Response content:", textContent);
      
      // Try again with pro model as fallback
      console.log("Retrying with gemini-3-pro-image-preview model...");
      const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          modalities: ["image", "text"],
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: dataUrl },
                },
                {
                  type: "text",
                  text: "Clean up this product image by removing any text, stamps, or overlay marks. Keep everything else exactly the same. Output the cleaned image.",
                },
              ],
            },
          ],
        }),
      });

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        const retryChoice = retryData.choices?.[0]?.message;
        
        if (retryChoice?.images && Array.isArray(retryChoice.images)) {
          for (const img of retryChoice.images) {
            if (img.type === "image_url" && img.image_url?.url) {
              resultImageUrl = img.image_url.url;
              break;
            }
          }
        }
        if (!resultImageUrl && Array.isArray(retryChoice?.content)) {
          for (const part of retryChoice.content) {
            if (part.type === "image_url" && part.image_url?.url) {
              resultImageUrl = part.image_url.url;
              break;
            }
          }
        }
      }
    }

    if (!resultImageUrl) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "AI could not process this image. Please try a different image or try again later." 
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, image_url: resultImageUrl }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("remove-watermark error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
