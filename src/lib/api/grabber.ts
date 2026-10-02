import { supabase } from '@/integrations/supabase/client';

export interface GrabbedProduct {
  name: string;
  price: number;
  original_price: number | null;
  currency: string;
  description: string;
  images: string[];
  specifications: { key: string; value: string }[];
  variants: { type: string; options: string[] }[];
  category: string;
  rating: number | null;
  reviews_count: number;
  seller_name: string;
  brand: string;
  price_unit?: string;
}

export interface GrabResult {
  success: boolean;
  error?: string;
  source?: 'daraz' | 'medex' | 'aroggo' | 'other';
  method?: 'direct' | 'firecrawl';
  product?: GrabbedProduct;
}

export const grabberApi = {
  async grabProduct(url: string): Promise<GrabResult> {
    const { data, error } = await supabase.functions.invoke('grab-product', {
      body: { url },
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  async importProduct(product: {
    name: string;
    price: number;
    original_price?: number | null;
    description: string;
    category?: string;
    subcategory?: string;
    image_url?: string;
    vendor_id?: string;
    brand_id?: string;
    stock?: number;
    images?: string[];
    specifications?: { key: string; value: string }[];
    price_unit?: string;
    variants?: { type: string; options: string[] }[];
  }) {
    const sku = `GRB-${Date.now().toString(36).toUpperCase()}`;

    // Build specs HTML table if specs exist
    let fullDescription = '';
    if (product.specifications && product.specifications.length > 0) {
      const specsRows = product.specifications
        .map(s => `<tr><td style="padding:6px 12px;border:1px solid #e5e7eb;color:#6b7280;width:40%">${s.key}</td><td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:500">${s.value}</td></tr>`)
        .join('');
      fullDescription = `<table style="width:100%;border-collapse:collapse;margin-bottom:16px"><tbody>${specsRows}</tbody></table>`;
    }
    if (product.description) {
      fullDescription += product.description;
    }

    const { data, error } = await supabase.from('products').insert({
      name: product.name,
      price: product.price,
      original_price: product.original_price || null,
      description: fullDescription,
      category: product.category || null,
      subcategory: product.subcategory || null,
      image_url: product.image_url || null,
      vendor_id: product.vendor_id || null,
      brand_id: product.brand_id || null,
      stock: product.stock ?? 0,
      sku,
      is_active: false,
      price_unit: product.price_unit || null,
    }).select().single();

    if (error) throw error;

    // Insert additional images
    if (product.images && product.images.length > 0 && data) {
      const imageRows = product.images.map((url, i) => ({
        product_id: data.id,
        image_url: url,
        sort_order: i,
      }));
      await supabase.from('product_images').insert(imageRows);
    }

    // Insert variants
    if (product.variants && product.variants.length > 0 && data) {
      const variantRows: { product_id: string; variant_name: string; variant_value: string; sort_order: number; stock: number; price_adjustment: number }[] = [];
      let sortOrder = 0;
      for (const v of product.variants) {
        for (const opt of v.options) {
          variantRows.push({
            product_id: data.id,
            variant_name: v.type,
            variant_value: opt,
            sort_order: sortOrder++,
            stock: 0,
            price_adjustment: 0,
          });
        }
      }
      await supabase.from('product_variants').insert(variantRows);
    }

    return data;
  },
};
