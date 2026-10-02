const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---- Site-specific parsers ----

function extractJsonLd(html: string): any[] {
  const results: any[] = [];
  const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch { /* ignore */ }
  }
  return results;
}

function extractMeta(html: string, property: string): string {
  const regex = new RegExp(`<meta[^>]*(?:property|name)\\s*=\\s*["']${property}["'][^>]*content\\s*=\\s*["']([^"']*)["']`, 'i');
  const match = regex.exec(html);
  if (match) return match[1];
  // Try reversed attribute order
  const regex2 = new RegExp(`<meta[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*(?:property|name)\\s*=\\s*["']${property}["']`, 'i');
  const match2 = regex2.exec(html);
  return match2 ? match2[1] : '';
}

function extractAllImages(html: string): string[] {
  const imgs: string[] = [];
  const regex = /<img[^>]*src\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const src = m[1];
    if (/\.(jpg|jpeg|png|webp|gif)/i.test(src) && !/icon|logo|sprite|avatar|flag|pixel|tracking/i.test(src)) {
      imgs.push(src.startsWith('//') ? `https:${src}` : src);
    }
  }
  return [...new Set(imgs)];
}

function stripScriptsTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
}

function sanitizeSpecValue(val: string): string | null {
  const trimmed = val.trim();
  if (!trimmed || trimmed.length > 200 || trimmed.includes('"') || trimmed.includes('{') || trimmed.includes('\\')) return null;
  return trimmed;
}

function parseDaraz(html: string): any {
  const product: any = { name: '', price: 0, images: [], specifications: [], variants: [] };

  // Try __NEXT_DATA__ or window.pageData
  const nextDataMatch = /window\.__NEXT_DATA__\s*=\s*({[\s\S]*?});\s*<\/script>/i.exec(html);
  const pageDataMatch = /var\s+__moduleData__\s*=\s*({[\s\S]*?});\s*<\/script>/i.exec(html) 
    || /window\.pageData\s*=\s*({[\s\S]*?});\s*<\/script>/i.exec(html);

  // Try JSON-LD
  const jsonLds = extractJsonLd(html);
  const productLd = jsonLds.find((j: any) => j['@type'] === 'Product');
  if (productLd) {
    product.name = productLd.name || '';
    product.description = productLd.description || '';
    product.brand = productLd.brand?.name || productLd.brand || '';
    if (productLd.image) {
      product.images = Array.isArray(productLd.image) ? productLd.image : [productLd.image];
    }
    if (productLd.offers) {
      const offer = Array.isArray(productLd.offers) ? productLd.offers[0] : productLd.offers;
      product.price = parseFloat(offer?.price) || 0;
      product.currency = offer?.priceCurrency || 'BDT';
    }
    if (productLd.aggregateRating) {
      product.rating = parseFloat(productLd.aggregateRating.ratingValue) || null;
      product.reviews_count = parseInt(productLd.aggregateRating.reviewCount) || 0;
    }
  }

  // Fallback: meta tags
  if (!product.name) product.name = extractMeta(html, 'og:title');
  if (!product.price) {
    const priceStr = extractMeta(html, 'product:price:amount');
    product.price = parseFloat(priceStr) || 0;
  }
  if (!product.currency) product.currency = extractMeta(html, 'product:price:currency') || 'BDT';
  if (!product.description) product.description = extractMeta(html, 'og:description');
  
  const ogImage = extractMeta(html, 'og:image');
  if (ogImage && product.images.length === 0) product.images = [ogImage];

  // Try to extract more images from gallery
  const galleryImages = extractAllImages(html).filter(img => 
    img.includes('img.lazcdn') || img.includes('laz-img') || img.includes('slatic')
  );
  if (galleryImages.length > 0) {
    product.images = [...new Set([...product.images, ...galleryImages])];
  }

  // Extract original price and seller from clean HTML
  const cleanHtml = stripScriptsTags(html);
  
  // Multiple patterns for original/was price on Daraz
  const origPatterns = [
    /pdp-product-price--original[^>]*>.*?(\d[\d,.]+)/is,
    /originPrice['"]\s*:\s*['""]?([\d.]+)/i,
    /originalPrice['"]\s*:\s*['""]?([\d.]+)/i,
    /was[:\s]*(?:৳|BDT|Tk\.?)?\s*([\d,.]+)/i,
    /price_was['"]\s*:\s*['""]?([\d,.]+)/i,
    /<del[^>]*>.*?(?:৳|BDT|Tk\.?)?\s*([\d,.]+).*?<\/del>/is,
    /<s[^a-z][^>]*>.*?(?:৳|BDT|Tk\.?)?\s*([\d,.]+).*?<\/s>/is,
    /line-through[^>]*>.*?(?:৳|BDT|Tk\.?)?\s*([\d,.]+)/is,
    /compare_at_price['"]\s*:\s*['""]?([\d,.]+)/i,
    /MRP[:\s]*(?:৳|BDT|Tk\.?)?\s*([\d,.]+)/i,
  ];
  for (const pat of origPatterns) {
    const m = pat.exec(html) || pat.exec(cleanHtml);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (val > (product.price || 0)) {
        product.original_price = val;
        break;
      }
    }
  }

  const sellerMatch = /seller[_-]?name['"]\s*:\s*['"]([^'"]+)/i.exec(html);
  if (sellerMatch) product.seller_name = sellerMatch[1];

  return product;
}

function parseMedex(html: string): any {
  const product: any = { name: '', price: 0, original_price: null, images: [], specifications: [], variants: [], currency: 'BDT' };

  // Strip scripts for clean parsing
  const cleanHtml = stripScriptsTags(html);

  // Medicine name - typically in h1
  const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(cleanHtml);
  if (h1Match) product.name = h1Match[1].replace(/<[^>]+>/g, '').trim();

  // Price - current price
  const priceMatch = /(?:Price|Unit Price|৳)\s*[:\s]*(?:৳\s*)?([\d,.]+)/i.exec(cleanHtml);
  if (priceMatch) product.price = parseFloat(priceMatch[1].replace(/,/g, '')) || 0;

  // Original / MRP price
  const mrpMatch = /MRP[:\s]*(?:৳\s*)?([\d,.]+)/i.exec(cleanHtml)
    || /<del[^>]*>.*?(?:৳\s*)?([\d,.]+).*?<\/del>/is.exec(cleanHtml)
    || /<s[^a-z][^>]*>.*?(?:৳\s*)?([\d,.]+).*?<\/s>/is.exec(cleanHtml);
  if (mrpMatch) {
    const mrpVal = parseFloat(mrpMatch[1].replace(/,/g, ''));
    if (mrpVal > (product.price || 0)) product.original_price = mrpVal;
  }

  // Generic name from clean HTML
  const genericMatch = /Generic\s*(?:Name)?\s*[:\s]*<[^>]*>\s*([^<]{2,80})/i.exec(cleanHtml)
    || /Generic\s*(?:Name)?\s*[:\s]*([^<\n]{2,80})/i.exec(cleanHtml);
  if (genericMatch) {
    const val = sanitizeSpecValue(genericMatch[1]);
    if (val) product.specifications.push({ key: 'Generic Name', value: val });
  }

  // Manufacturer
  const mfgMatch = /Manufacturer\s*[:\s]*<[^>]*>\s*([^<]{2,80})/i.exec(cleanHtml)
    || /Manufacturer\s*[:\s]*([^<\n]{2,80})/i.exec(cleanHtml);
  if (mfgMatch) {
    const val = sanitizeSpecValue(mfgMatch[1]);
    if (val) {
      product.brand = val;
      product.specifications.push({ key: 'Manufacturer', value: val });
    }
  }

  // Dosage form
  const dosageMatch = /Dosage\s*Form\s*[:\s]*<[^>]*>\s*([^<]{2,80})/i.exec(cleanHtml)
    || /Dosage\s*Form\s*[:\s]*([^<\n]{2,80})/i.exec(cleanHtml);
  if (dosageMatch) {
    const val = sanitizeSpecValue(dosageMatch[1]);
    if (val) product.specifications.push({ key: 'Dosage Form', value: val });
  }

  // Description
  product.description = extractMeta(html, 'og:description') || extractMeta(html, 'description');

  const ogImage = extractMeta(html, 'og:image');
  if (ogImage) product.images = [ogImage];

  return product;
}

function parseAroggo(html: string): any {
  const product: any = { name: '', price: 0, original_price: null, images: [], specifications: [], variants: [], currency: 'BDT' };

  // Try JSON-LD first (most reliable)
  const jsonLds = extractJsonLd(html);
  const productLd = jsonLds.find((j: any) => j['@type'] === 'Product');
  if (productLd) {
    product.name = productLd.name || '';
    if (productLd.offers) {
      const offer = Array.isArray(productLd.offers) ? productLd.offers[0] : productLd.offers;
      product.price = parseFloat(offer?.price) || 0;
    }
    if (productLd.image) {
      product.images = Array.isArray(productLd.image) ? productLd.image : [productLd.image];
    }
    if (productLd.brand) product.brand = productLd.brand?.name || productLd.brand || '';
    if (productLd.description) product.description = productLd.description;
  }

  // Fallback name from meta/h1
  if (!product.name) product.name = extractMeta(html, 'og:title');
  if (!product.name) {
    const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
    if (h1Match) product.name = h1Match[1].replace(/<[^>]+>/g, '').trim();
  }

  // Price fallback from meta
  if (!product.price) {
    const priceStr = extractMeta(html, 'product:price:amount');
    product.price = parseFloat(priceStr) || 0;
  }

  if (!product.description) {
    product.description = extractMeta(html, 'og:description') || extractMeta(html, 'description');
  }

  const ogImage = extractMeta(html, 'og:image');
  if (ogImage && product.images.length === 0) product.images = [ogImage];

  // Extract images from cdn2.arogga.com
  const aroggaImages = extractAllImages(html).filter(img => img.includes('cdn2.arogga.com') || img.includes('arogga'));
  if (aroggaImages.length > 0) {
    product.images = [...new Set([...product.images, ...aroggaImages])];
  }

  // Extract clean specs from visible HTML only
  const cleanHtml = stripScriptsTags(html);
  
  const genericMatch = /Generic\s*(?:Name)?\s*[:\s]*<[^>]*>\s*([^<]{2,80})/i.exec(cleanHtml);
  if (genericMatch) {
    const val = genericMatch[1].trim();
    if (val && !val.includes('"') && !val.includes('{')) {
      product.specifications.push({ key: 'Generic Name', value: val });
    }
  }

  const mfgMatch = /Manufacturer\s*[:\s]*<[^>]*>\s*([^<]{2,80})/i.exec(cleanHtml);
  if (mfgMatch) {
    const val = mfgMatch[1].trim();
    if (val && !val.includes('"') && !val.includes('{')) {
      if (!product.brand) product.brand = val;
      product.specifications.push({ key: 'Manufacturer', value: val });
    }
  }

  // Extract original price for Aroggo
  if (!product.original_price) {
    const origPatterns = [
      /MRP[:\s]*(?:৳\s*)?([\d,.]+)/i,
      /<del[^>]*>.*?(?:৳\s*)?([\d,.]+).*?<\/del>/is,
      /<s[^a-z][^>]*>.*?(?:৳\s*)?([\d,.]+).*?<\/s>/is,
      /original[_-]?price['"]\s*:\s*['""]?([\d,.]+)/i,
    ];
    for (const pat of origPatterns) {
      const m = pat.exec(html) || pat.exec(cleanHtml);
      if (m) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (val > (product.price || 0)) {
          product.original_price = val;
          break;
        }
      }
    }
  }

  return product;
}

async function resolveRedirects(url: string): Promise<string> {
  return url;
}

function parseGeneric(html: string): any {
  const product: any = { name: '', price: 0, images: [], specifications: [], variants: [], original_price: null };

  // Try JSON-LD first
  const jsonLds = extractJsonLd(html);
  const productLd = jsonLds.find((j: any) => j['@type'] === 'Product');
  if (productLd) {
    product.name = productLd.name || '';
    product.description = productLd.description || '';
    product.brand = productLd.brand?.name || productLd.brand || '';
    if (productLd.image) {
      product.images = Array.isArray(productLd.image) ? productLd.image : [productLd.image];
    }
    if (productLd.offers) {
      const offer = Array.isArray(productLd.offers) ? productLd.offers[0] : productLd.offers;
      product.price = parseFloat(offer?.price || offer?.lowPrice) || 0;
      product.currency = offer?.priceCurrency || 'BDT';
    }
    if (productLd.aggregateRating) {
      product.rating = parseFloat(productLd.aggregateRating.ratingValue) || null;
      product.reviews_count = parseInt(productLd.aggregateRating.reviewCount) || 0;
    }
  }

  // Fallback to meta tags
  if (!product.name) product.name = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title');
  if (!product.name) {
    const cleanHtml = stripScriptsTags(html);
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(cleanHtml);
    if (h1) product.name = h1[1].replace(/<[^>]+>/g, '').trim();
  }
  // Only use <title> as last resort, and mark it so we can detect generic titles
  if (!product.name) {
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    if (titleMatch) {
      const titleText = titleMatch[1].trim();
      // Skip generic site titles (too long or containing common site-wide phrases)
      if (titleText.length < 100 && !/online\s+(pharmacy|shop|store)|home\s+delivery|welcome\s+to/i.test(titleText)) {
        product.name = titleText;
      }
    }
  }
  if (!product.price) product.price = parseFloat(extractMeta(html, 'product:price:amount')) || 0;
  if (!product.currency) product.currency = extractMeta(html, 'product:price:currency') || 'BDT';
  if (!product.description) product.description = extractMeta(html, 'og:description') || extractMeta(html, 'description');

  const ogImage = extractMeta(html, 'og:image');
  if (ogImage && product.images.length === 0) product.images = [ogImage];

  // Try to find more product images
  if (product.images.length < 3) {
    const moreImages = extractAllImages(html);
    product.images = [...new Set([...product.images, ...moreImages])].slice(0, 20);
  }

  // Extract original price (strikethrough / was price)
  if (!product.original_price) {
    const cleanHtml = stripScriptsTags(html);
    // Common patterns: "was ৳500", "MRP ৳500", line-through price, originalPrice in JSON
    const origPatterns = [
      /original[_-]?price['"]\s*:\s*['""]?([\d,.]+)/i,
      /was[:\s]*(?:৳|BDT|Tk\.?)?\s*([\d,.]+)/i,
      /MRP[:\s]*(?:৳|BDT|Tk\.?)?\s*([\d,.]+)/i,
      /line-through[^>]*>.*?(?:৳|BDT|Tk\.?)?\s*([\d,.]+)/is,
      /oldPrice['"]\s*:\s*['""]?([\d,.]+)/i,
      /compareAtPrice['"]\s*:\s*['""]?([\d,.]+)/i,
      /compare_at_price['"]\s*:\s*['""]?([\d,.]+)/i,
    ];
    for (const pat of origPatterns) {
      const m = pat.exec(html) || pat.exec(cleanHtml);
      if (m) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (val > (product.price || 0)) {
          product.original_price = val;
          break;
        }
      }
    }
  }

  // Also try JSON-LD offers for original price (highPrice or listPrice)
  if (!product.original_price) {
    const jsonLds2 = extractJsonLd(html);
    const productLd2 = jsonLds2.find((j: any) => j['@type'] === 'Product');
    if (productLd2?.offers) {
      const offer = Array.isArray(productLd2.offers) ? productLd2.offers[0] : productLd2.offers;
      const highPrice = parseFloat(offer?.highPrice) || 0;
      if (highPrice > (product.price || 0)) {
        product.original_price = highPrice;
      }
    }
  }

  return product;
}

async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    return { html: await res.text(), finalUrl: res.url };
  } catch {
    return null;
  }
}

async function tryDirectParse(url: string, source: string): Promise<any | null> {
  try {
    // Resolve short/redirect URLs first
    const resolvedUrl = await resolveRedirects(url);
    console.log(`Attempting direct HTML fetch for: ${resolvedUrl}`);

    const result = await fetchHtml(resolvedUrl);
    if (!result) { console.log('Direct fetch failed'); return null; }

    const { html } = result;
    console.log(`Fetched HTML length: ${html.length}`);

    let product: any;
    switch (source) {
      case 'daraz': product = parseDaraz(html); break;
      case 'medex': product = parseMedex(html); break;
      case 'aroggo': product = parseAroggo(html); break;
      default: product = parseGeneric(html); break;
    }

    if (product && product.name && product.name.trim()) {
      console.log(`Direct parse successful: ${product.name}`);
      return product;
    }

    // If site-specific parser failed, try generic as fallback
    if (source !== 'other') {
      console.log('Site-specific parser failed, trying generic parser...');
      product = parseGeneric(html);
      if (product && product.name && product.name.trim()) {
        console.log(`Generic parse successful: ${product.name}`);
        return product;
      }
    }

    console.log('Direct parse did not find product name');
    return null;
  } catch (err) {
    console.error('Direct fetch error:', err);
    return null;
  }
}

// ---- Main handler ----

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const userRoles = (roles || []).map((r: any) => r.role);
    if (!userRoles.includes('admin') && !userRoles.includes('vendor')) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden: admin or vendor role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Detect source
    const isDaraz = /daraz\.(com|pk|bd|lk|com\.np|com\.mm)/i.test(formattedUrl);
    const isMedex = /medex\.com\.bd/i.test(formattedUrl);
    const isAroggo = /arogga\.com/i.test(formattedUrl);
    const isAliExpress = /aliexpress\.(com|us|ru)|a\.ali/i.test(formattedUrl);

    if (isAliExpress) {
      return new Response(
        JSON.stringify({ success: false, error: 'AliExpress সাপোর্ট করা হয় না। Daraz, Medex, Aroggo অথবা অন্য সাইট ব্যবহার করুন।' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const source = isDaraz ? 'daraz' : isMedex ? 'medex' : isAroggo ? 'aroggo' : 'other';
    console.log(`Scraping URL: ${formattedUrl} (source: ${source})`);

    // Try direct parse (works for ALL sites)
    let product = await tryDirectParse(formattedUrl, source);
    let method = 'direct';

    // Fallback: use Firecrawl for JS-rendered sites
    if (!product) {
      const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
      if (firecrawlKey) {
        console.log('Direct parse failed, trying Firecrawl...');
        try {
          const fcRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: formattedUrl,
              formats: ['html', 'markdown'],
              waitFor: 5000,
            }),
          });
          const fcData = await fcRes.json();
          const fcHtml = fcData?.data?.html || fcData?.html || '';
          if (fcHtml && fcHtml.length > 500) {
            console.log(`Firecrawl returned HTML length: ${fcHtml.length}`);
            // Parse the rendered HTML
            switch (source) {
              case 'daraz': product = parseDaraz(fcHtml); break;
              case 'medex': product = parseMedex(fcHtml); break;
              case 'aroggo': product = parseAroggo(fcHtml); break;
              default: product = parseGeneric(fcHtml); break;
            }
            if (!product || !product.name?.trim()) {
              product = parseGeneric(fcHtml);
            }
            if (product && product.name?.trim()) {
              method = 'firecrawl';
              console.log(`Firecrawl parse successful: ${product.name}`);
            } else {
              product = null;
            }
          }
        } catch (fcErr) {
          console.error('Firecrawl error:', fcErr);
        }
      }
    }

    if (product) {
      // Auto-detect price_unit from product name or specs
      let price_unit = '';
      const nameAndDesc = `${product.name || ''} ${product.description || ''}`;
      const specsText = (product.specifications || []).map((s: any) => `${s.key} ${s.value}`).join(' ');
      const allText = `${nameAndDesc} ${specsText}`;
      
      // Detect unit type and pcs count
      const stripMatch = /(\d+)\s*(?:pcs?|tablets?|capsules?|pills?)?\s*(?:\/|per)?\s*strip/i.exec(allText)
        || /strip\s*(?:of)?\s*(\d+)/i.exec(allText);
      const boxMatch = /(\d+)\s*(?:pcs?|tablets?|capsules?)?\s*(?:\/|per)?\s*box/i.exec(allText)
        || /box\s*(?:of)?\s*(\d+)/i.exec(allText);
      const packMatch = /(\d+)\s*(?:pcs?|pieces?)?\s*(?:\/|per)?\s*pack/i.exec(allText)
        || /pack\s*(?:of)?\s*(\d+)/i.exec(allText);
      const unitMatch = /(\d+)\s*(?:pcs?|pieces?)\s*(?:\/|per)?\s*unit/i.exec(allText);
      
      if (stripMatch) {
        price_unit = `per strip (${stripMatch[1]} pcs)`;
      } else if (boxMatch) {
        price_unit = `per box (${boxMatch[1]} pcs)`;
      } else if (packMatch) {
        price_unit = `per pack (${packMatch[1]} pcs)`;
      } else if (unitMatch) {
        price_unit = `per unit (${unitMatch[1]} pcs)`;
      }

      const result = {
        success: true,
        source,
        method,
        product: {
          name: product.name || '',
          price: product.price || 0,
          original_price: product.original_price || null,
          currency: product.currency || 'BDT',
          description: product.description || '',
          images: (product.images || []).slice(0, 20),
          specifications: product.specifications || [],
          variants: product.variants || [],
          category: product.category || '',
          rating: product.rating || null,
          reviews_count: product.reviews_count || 0,
          seller_name: product.seller_name || '',
          brand: product.brand || '',
          price_unit,
        },
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: false, error: 'প্রোডাক্ট grab করা যায়নি। সাইটটি সাপোর্ট করা হচ্ছে না অথবা প্রোডাক্ট তথ্য পাওয়া যায়নি।' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in grab-product:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
