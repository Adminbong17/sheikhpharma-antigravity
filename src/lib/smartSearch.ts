import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Common Bangla medicine brand & generic transliterations
const BANGLA_MEDICINE_MAP: Record<string, string> = {
  "নাপা": "napa",
  "নাপা ৫০০": "napa 500",
  "নাপা এক্সট্রা": "napa extra",
  "সারজেল": "sergel",
  "সার্জেল": "sergel",
  "ম্যাক্সপ্রো": "maxpro",
  "প্যারাসিটামল": "paracetamol",
  "প্যানটনিক্স": "pantonix",
  "সেক্লো": "seclo",
  "ফেক্সো": "fexo",
  "মোনাস": "monas",
  "মোনেয়ার": "monas",
  "অ্যান্টাসিড": "antacid",
  "এন্টাসিড": "antacid",
  "অমিপ্রাজল": "omeprazole",
  "এসোমিপ্রাজল": "esomeprazole",
  "আজিম্যাক্স": "azimax",
  "জিথ্রোক্স": "zithrox",
  "টোরল্যাক": "torax",
  "অ্যালার্ট্রল": "alerartrol",
  "রেনিটিডিন": "ranitidine",
  "সিপ্রোসিন": "ciprocin",
  "সেফ৩": "cef3",
};

/**
 * Normalizes query string and resolves common Bengali names to English.
 */
export function normalizeSearchQuery(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (BANGLA_MEDICINE_MAP[trimmed]) {
    return BANGLA_MEDICINE_MAP[trimmed];
  }
  // Check if any map key is at the beginning
  for (const [bn, en] of Object.entries(BANGLA_MEDICINE_MAP)) {
    if (trimmed.startsWith(bn)) {
      return trimmed.replace(bn, en);
    }
  }
  return trimmed;
}

/**
 * Custom React hook for debouncing search input to eliminate lag and network spam.
 */
export function useDebounce<T>(value: T, delay: number = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * High-accuracy medical product relevance scoring.
 * Prevents random substring matches (e.g. Tenapam when searching Napa).
 * Boosts popular presentations (500mg, Extra, Syrup, Rapid, etc.).
 */
export function scoreMedicalProduct(p: any, rawQuery: string): number {
  const normalized = normalizeSearchQuery(rawQuery);
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  const name = (p.name || "").toLowerCase();
  const generic = (p.generic_name || "").toLowerCase();
  let score = 0;

  // 1. Exact match
  if (name === normalized) score += 3000;

  // 2. Name starts with the full query
  if (name.startsWith(normalized)) score += 1500;

  // 3. First word is an exact whole word in title (e.g., "Napa " vs "Tenapam")
  const primaryWord = words[0];
  const regexWholeWord = new RegExp(`\\b${primaryWord}\\b`, "i");
  const isWordMatch = regexWholeWord.test(name);
  if (isWordMatch) {
    score += 800;
  } else if (name.startsWith(primaryWord)) {
    score += 400;
  } else if (name.includes(primaryWord)) {
    // Severe penalty if it's just buried inside an unrelated brand (like Te-napa-m or Lo-napa-m)
    score -= 1500;
  }

  // 4. Query matches all typed words (e.g. "napa 500" or "napa extra")
  const allWordsInName = words.every((w) => name.includes(w));
  if (allWordsInName) {
    score += 1000;
  } else {
    // Partial word penalty if user typed multiple words but product only has 1
    const matchedCount = words.filter((w) => name.includes(w)).length;
    score += matchedCount * 200;
  }

  // 5. Popular medicine presentations boost for common searches
  if (/\b500\s*mg\b/i.test(name)) score += 350;
  if (/\bextra\b/i.test(name)) score += 300;
  if (/\b(rapid|extend|one|plus|mups)\b/i.test(name)) score += 200;
  if (/\b(syrup|suspension|drops?)\b/i.test(name)) score += 150;

  // 6. Generic name match
  if (generic === normalized) score += 900;
  else if (generic.startsWith(normalized)) score += 500;
  else if (words.every((w) => generic.includes(w))) score += 350;

  // 7. Popularity / Sales boost
  if (p.sold_count && p.sold_count > 0) {
    score += Math.min(p.sold_count * 10, 400);
  }

  // 8. Stock availability boost
  if (p.stock && p.stock > 0) {
    score += 50;
  }

  return score;
}

/**
 * Optimized fetch function with broad candidate retrieval and smart client-side ranking.
 */
export async function searchProductsSmart(
  rawQuery: string,
  fields: string = "id, name, generic_name, price, original_price, image_url, slug, sold_count, stock",
  limit: number = 8
) {
  const normalized = normalizeSearchQuery(rawQuery);
  if (!normalized || normalized.length < 1) return [];

  const words = normalized.split(/\s+/).filter(Boolean);
  const primaryWord = words[0];

  // Retrieve candidate pool:
  // - Starts with primary word
  // - Or has a word starting with primary word (space + word)
  // - Or generic name starts with primary word
  // - Or fallback substring match
  const { data, error } = await supabase
    .from("products")
    .select(fields)
    .eq("is_active", true)
    .or(
      `name.ilike.${primaryWord}%,name.ilike.% ${primaryWord}%,generic_name.ilike.${primaryWord}%,name.ilike.%${primaryWord}%`
    )
    .limit(60);

  if (error || !data) return [];

  // Rank by medical relevance
  const scored = data.map((item) => ({
    item,
    score: scoreMedicalProduct(item, normalized),
  }));

  // Filter out negative scores (e.g. false substring hits when true matches exist)
  const hasStrongMatches = scored.some((s) => s.score >= 500);
  const valid = hasStrongMatches ? scored.filter((s) => s.score > 0) : scored;

  valid.sort((a, b) => b.score - a.score);

  return valid.slice(0, limit).map((s) => s.item);
}
