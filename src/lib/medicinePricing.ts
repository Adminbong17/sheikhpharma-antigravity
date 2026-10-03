// Parse medicine pack/strip pricing from product data.
// Supports allopathic (e.g. "Pack Size: 51 x 10: ৳ 612.00"),
// herbal/Unani/Hamdard (e.g. "Unit Price: ৳ 5.00 (5 x 10: ৳ 250.00) Strip Price: ৳ 50.00"),
// container/bottle packs (e.g. "60's pack: ৳ 130.00"), and active/inert combinations.

export interface MedicinePricing {
  isTabletOrCapsule: boolean;
  unitPrice: number | null;            // original unit/piece price (MRP)
  discountedUnitPrice: number | null;  // unit price with 10% off
  stripPrice: number | null;           // original strip price (MRP)
  pcsPerStrip: number | null;          // e.g. 10 for "6 x 10"
  stripsPerPack: number | null;        // e.g. 6 for "6 x 10"
  totalPcsPerPack: number | null;      // stripsPerPack * pcsPerStrip
  packSizeLabel: string | null;        // e.g. "6 x 10"
  packPrice: number | null;            // e.g. 180
}

export function getMedicinePricing(product: {
  price: number;
  original_price?: number | null;
  specification?: string | null;
  name?: string | null;
  price_unit?: string | null;
}): MedicinePricing | null {
  if (!product) return null;

  const spec = (product.specification || "").replace(/&#039;/g, "'");
  const name = product.name || "";
  const priceUnit = (product.price_unit || "").toLowerCase();

  const isTabletOrCapsule =
    /tablet|capsule|caplet|pellet|softgel|\btab\b|\bcap\b|ট্যাবলেট|ক্যাপসুল/i.test(name) ||
    /strip|tablet|capsule/i.test(spec) ||
    priceUnit === "strip" ||
    priceUnit.includes("tablet") ||
    priceUnit.includes("capsule");

  // Regex 1: Explicit Strip Price: "Strip Price: ৳ 50.00"
  const stripMatch = spec.match(/Strip Price:\s*৳?\s*([\d,.]+)/i);
  // Regex 2: Explicit Unit Price: "Unit Price: ৳ 5.00"
  const unitMatch = spec.match(/Unit Price:\s*৳?\s*([\d,.]+)/i);
  // Regex 3: Pack Size like "Pack Size: 5 x 10: ৳ 250" or "(5 x 10: ৳ 250)"
  const packMatch = spec.match(/(?:Pack Size:|\(|\s|^)\s*(\d+)\s*[x×*]\s*(\d+)\s*(?::\s*৳?\s*([\d,.]+))?/i);
  // Regex 4: Single Pack / Container like "60's pack: ৳ 130" or "50's container: ৳ 125"
  const singlePackMatch = spec.match(/(\d+)(?:'s|\s*pcs)?\s*(?:pack|container)(?::\s*৳?\s*([\d,.]+))?/i);
  // Regex 5: Active + Inert tablets like "(24 active+4 inert) tablet"
  const activeInertMatch = (spec + " " + priceUnit).match(/(\d+)\s*active\s*\+\s*(\d+)\s*inert/i);

  let stripsPerPack: number | null = packMatch ? parseInt(packMatch[1], 10) : null;
  let pcsPerStrip: number | null = packMatch ? parseInt(packMatch[2], 10) : null;
  let packPrice: number | null = packMatch && packMatch[3] ? parseFloat(packMatch[3].replace(/,/g, "")) : null;

  if (activeInertMatch && !pcsPerStrip) {
    pcsPerStrip = parseInt(activeInertMatch[1], 10) + parseInt(activeInertMatch[2], 10);
  }

  if (!pcsPerStrip && singlePackMatch) {
    pcsPerStrip = parseInt(singlePackMatch[1], 10);
  }
  if (!packPrice && singlePackMatch && singlePackMatch[2]) {
    packPrice = parseFloat(singlePackMatch[2].replace(/,/g, ""));
  }

  const explicitStripPrice = stripMatch ? parseFloat(stripMatch[1].replace(/,/g, "")) : null;
  const explicitUnitPrice = unitMatch ? parseFloat(unitMatch[1].replace(/,/g, "")) : null;

  let unitPrice: number | null = explicitUnitPrice;
  let stripPrice: number | null = explicitStripPrice;

  // If unitPrice not in spec
  if (!unitPrice) {
    if (product.original_price && product.original_price > 0 && product.original_price < product.price) {
      unitPrice = product.original_price;
    } else if (priceUnit === "piece" || priceUnit === "pcs" || priceUnit === "pc") {
      unitPrice = product.price;
    }
  }

  // If stripPrice not in spec
  if (!stripPrice) {
    if (priceUnit === "strip" && product.price > 0) {
      stripPrice = product.price;
    } else if (unitPrice && product.price > unitPrice * 1.5) {
      stripPrice = product.price;
    }
  }

  // Derive pcsPerStrip if both prices exist
  if (!pcsPerStrip && stripPrice && unitPrice && stripPrice > unitPrice) {
    pcsPerStrip = Math.round(stripPrice / unitPrice);
  }

  // For tablets or capsules: guarantee stripPrice, unitPrice, and pcsPerStrip
  if (isTabletOrCapsule) {
    if (!pcsPerStrip) pcsPerStrip = 10; // Standard Bangladesh pharmacy strip size

    // If we have unitPrice but no stripPrice
    if (unitPrice && !stripPrice) {
      if (packPrice && stripsPerPack && stripsPerPack > 0) {
        stripPrice = Number((packPrice / stripsPerPack).toFixed(2));
      } else {
        stripPrice = Number((unitPrice * pcsPerStrip).toFixed(2));
      }
    }

    // If we have stripPrice but no unitPrice
    if (stripPrice && !unitPrice) {
      unitPrice = Number((stripPrice / pcsPerStrip).toFixed(2));
    }

    // If neither was found from spec, use product.price
    if (!stripPrice && !unitPrice && product.price > 0) {
      if (product.price <= 20 && (!product.original_price || product.original_price === product.price)) {
        unitPrice = product.price;
        stripPrice = Number((unitPrice * pcsPerStrip).toFixed(2));
      } else {
        stripPrice = product.price;
        unitPrice = Number((stripPrice / pcsPerStrip).toFixed(2));
      }
    }
  } else {
    // Non-tablet (syrup, ointment, drops, etc.)
    if (!stripPrice && product.price > 0) {
      stripPrice = product.price;
    }
    if (!unitPrice) {
      unitPrice = product.price;
    }
  }

  if (!stripPrice && !unitPrice) return null;

  let packSizeLabel = stripsPerPack && pcsPerStrip ? `${stripsPerPack} x ${pcsPerStrip}` : null;
  if (!packSizeLabel && singlePackMatch) {
    packSizeLabel = `${singlePackMatch[1]} pcs pack`;
  }
  const totalPcsPerPack =
    stripsPerPack && pcsPerStrip
      ? stripsPerPack * pcsPerStrip
      : singlePackMatch
      ? parseInt(singlePackMatch[1], 10)
      : null;

  return {
    isTabletOrCapsule,
    unitPrice,
    discountedUnitPrice: unitPrice ? Number((unitPrice * 0.9).toFixed(2)) : null,
    stripPrice: isTabletOrCapsule ? stripPrice : null,
    pcsPerStrip: isTabletOrCapsule ? pcsPerStrip : null,
    stripsPerPack,
    totalPcsPerPack,
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
