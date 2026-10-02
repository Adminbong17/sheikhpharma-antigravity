// Parse medicine pack/strip pricing from product data.
// specification looks like: "Pack Size: 6 x 10: ৳ 180.00" or "Pack Size: 1 x 30: ৳ 90.30"

export interface MedicinePricing {
  unitPrice: number | null;       // original_price (per pc)
  discountedUnitPrice: number | null; // unit price with 10% off
  stripPrice: number | null;      // price (per strip)
  pcsPerStrip: number | null;     // e.g. 10 for "6 x 10"
  stripsPerPack: number | null;   // e.g. 6 for "6 x 10"
  totalPcsPerPack: number | null; // stripsPerPack * pcsPerStrip
  packSizeLabel: string | null;   // e.g. "6 x 10"
  packPrice: number | null;       // e.g. 180
}

export function getMedicinePricing(product: {
  price: number;
  original_price?: number | null;
  specification?: string | null;
}): MedicinePricing | null {
  const spec = product.specification || "";
  const match = spec.match(/Pack Size:\s*(\d+)\s*[x×*]\s*(\d+)\s*:\s*৳?\s*([\d.]+)/i);

  const unitPrice = product.original_price && product.original_price > 0 ? product.original_price : null;
  const stripPrice = product.price > 0 ? product.price : null;

  if (!match && !unitPrice) return null;

  let stripsPerPack: number | null = null;
  let pcsPerStrip: number | null = null;
  let packPrice: number | null = null;
  let packSizeLabel: string | null = null;

  if (match) {
    stripsPerPack = parseInt(match[1], 10);
    pcsPerStrip = parseInt(match[2], 10);
    packPrice = parseFloat(match[3]);
    packSizeLabel = `${stripsPerPack} x ${pcsPerStrip}`;
  }

  // Fallback: derive pcs per strip from unit price if pack info missing
  if (!pcsPerStrip && unitPrice && stripPrice) {
    pcsPerStrip = Math.round(stripPrice / unitPrice) || null;
  }

  return {
    unitPrice,
    discountedUnitPrice: unitPrice ? Number((unitPrice * 0.9).toFixed(2)) : null,
    stripPrice,
    pcsPerStrip,
    stripsPerPack,
    totalPcsPerPack: stripsPerPack && pcsPerStrip ? stripsPerPack * pcsPerStrip : null,
    packSizeLabel,
    packPrice,
  };
}

// Tiered strip discount: 1 strip = 10%, 2 strips = 12%, 3+ strips = 15%
export function getStripDiscountPercent(qty: number): number {
  if (qty >= 3) return 15;
  if (qty === 2) return 12;
  return 10;
}

export function applyDiscount(price: number, percent: number): number {
  return Number((price * (1 - percent / 100)).toFixed(2));
}

