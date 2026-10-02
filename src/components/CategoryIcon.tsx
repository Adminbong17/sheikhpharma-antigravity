import * as LucideIcons from "lucide-react";

export interface CategoryMeta {
  nameBn: string;
  nameEn: string;
  bgGradient: string;
  badgeBorder: string;
  accentColor: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  medicine: {
    nameBn: "ওষুধ ও প্রেসক্রিপশন",
    nameEn: "Medicine",
    bgGradient: "from-rose-500/10 to-red-500/15",
    badgeBorder: "border-rose-200/80 dark:border-rose-800/40",
    accentColor: "#EF4444",
  },
  healthcare: {
    nameBn: "স্বাস্থ্যসেবা ও ডিভাইস",
    nameEn: "Healthcare",
    bgGradient: "from-sky-500/10 to-blue-500/15",
    badgeBorder: "border-sky-200/80 dark:border-sky-800/40",
    accentColor: "#0284C7",
  },
  beauty: {
    nameBn: "সৌন্দর্য ও রূপচর্চা",
    nameEn: "Beauty & Skin",
    bgGradient: "from-pink-500/10 to-rose-500/15",
    badgeBorder: "border-pink-200/80 dark:border-pink-800/40",
    accentColor: "#EC4899",
  },
  "sexual-wellness": {
    nameBn: "যৌন স্বাস্থ্য ও সুস্থতা",
    nameEn: "Sexual Wellness",
    bgGradient: "from-purple-500/10 to-pink-500/15",
    badgeBorder: "border-purple-200/80 dark:border-purple-800/40",
    accentColor: "#9333EA",
  },
  "baby-and-mom-care": {
    nameBn: "মা ও শিশুর যত্ন",
    nameEn: "Baby & Mom care",
    bgGradient: "from-amber-500/10 to-pink-500/15",
    badgeBorder: "border-amber-200/80 dark:border-amber-800/40",
    accentColor: "#F59E0B",
  },
  herbal: {
    nameBn: "ভেষজ ও হারবাল",
    nameEn: "Herbal & Ayur",
    bgGradient: "from-emerald-500/10 to-teal-500/15",
    badgeBorder: "border-emerald-200/80 dark:border-emerald-800/40",
    accentColor: "#10B981",
  },
  "home-care": {
    nameBn: "হোম ও হাইজিন",
    nameEn: "Home care",
    bgGradient: "from-teal-500/10 to-cyan-500/15",
    badgeBorder: "border-teal-200/80 dark:border-teal-800/40",
    accentColor: "#0D9488",
  },
  supplement: {
    nameBn: "সাপ্লিমেন্ট ও ভিটামিন",
    nameEn: "Supplement",
    bgGradient: "from-amber-500/10 to-orange-500/15",
    badgeBorder: "border-amber-200/80 dark:border-amber-800/40",
    accentColor: "#F59E0B",
  },
  "food-and-nutrition": {
    nameBn: "পুষ্টিকর খাদ্য",
    nameEn: "Food & Nutrition",
    bgGradient: "from-lime-500/10 to-green-500/15",
    badgeBorder: "border-lime-200/80 dark:border-lime-800/40",
    accentColor: "#84CC16",
  },
  "pet-care": {
    nameBn: "পোষা প্রাণীর যত্ন",
    nameEn: "Pet care",
    bgGradient: "from-orange-500/10 to-amber-500/15",
    badgeBorder: "border-orange-200/80 dark:border-orange-800/40",
    accentColor: "#EA580C",
  },
  veterinary: {
    nameBn: "ভেটেরিনারি",
    nameEn: "Veterinary",
    bgGradient: "from-cyan-500/10 to-indigo-500/15",
    badgeBorder: "border-cyan-200/80 dark:border-cyan-800/40",
    accentColor: "#0891B2",
  },
  homeopathy: {
    nameBn: "হোমিওপ্যাথি",
    nameEn: "Homeopathy",
    bgGradient: "from-indigo-500/10 to-violet-500/15",
    badgeBorder: "border-indigo-200/80 dark:border-indigo-800/40",
    accentColor: "#6366F1",
  },
};

export const getCategoryMeta = (slug?: string, name?: string): CategoryMeta | null => {
  const key = (slug || name || "").toLowerCase().trim();
  if (key.includes("medicine")) return CATEGORY_META.medicine;
  if (key.includes("health")) return CATEGORY_META.healthcare;
  if (key.includes("beauty") || key.includes("cosmetic") || key.includes("skin")) return CATEGORY_META.beauty;
  if (key.includes("sexual") || key.includes("wellness")) return CATEGORY_META["sexual-wellness"];
  if (key.includes("baby") || key.includes("mom") || key.includes("mother")) return CATEGORY_META["baby-and-mom-care"];
  if (key.includes("herb") || key.includes("ayur")) return CATEGORY_META.herbal;
  if (key.includes("home") && (key.includes("care") || key.includes("hygiene"))) return CATEGORY_META["home-care"];
  if (key.includes("supple") || key.includes("vitamin")) return CATEGORY_META.supplement;
  if (key.includes("food") || key.includes("nutri")) return CATEGORY_META["food-and-nutrition"];
  if (key.includes("pet")) return CATEGORY_META["pet-care"];
  if (key.includes("vet")) return CATEGORY_META.veterinary;
  if (key.includes("homeo")) return CATEGORY_META.homeopathy;
  return null;
};

/* -------------------------------------------------------------
   BESPOKE 3D VECTOR STICKERS FOR HEALTHCARE & PHARMACY
   Each sticker is designed with smooth gradients, soft drop-shadow,
   depth layers, glossy specular highlights, and category accents.
------------------------------------------------------------- */

// 1. Medicine: Dual-tone capsule + blister pill tablet + sparkle
export const MedicineSticker = ({ className = "h-full w-full" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="med-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FEE2E2" />
        <stop offset="1" stopColor="#FECDD3" />
      </linearGradient>
      <linearGradient id="med-capsule-red" x1="16" y1="18" x2="36" y2="38" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EF4444" />
        <stop offset="1" stopColor="#B91C1C" />
      </linearGradient>
      <linearGradient id="med-capsule-white" x1="28" y1="30" x2="48" y2="50" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#E2E8F0" />
      </linearGradient>
      <linearGradient id="med-tablet" x1="38" y1="12" x2="54" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38BDF8" />
        <stop offset="1" stopColor="#0284C7" />
      </linearGradient>
      <filter id="med-drop" x="4" y="6" width="56" height="56" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#DC2626" floodOpacity="0.22" />
      </filter>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#med-bg)" />
    <rect x="4" y="4" width="56" height="56" rx="16" stroke="#FDA4AF" strokeWidth="1.5" strokeOpacity="0.6" />

    {/* Round blister tablet in top right */}
    <g filter="url(#med-drop)">
      <circle cx="45" cy="20" r="8.5" fill="url(#med-tablet)" />
      <circle cx="45" cy="20" r="7.5" stroke="#BAE6FD" strokeWidth="1" strokeOpacity="0.8" />
      <line x1="41" y1="16" x2="49" y2="24" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.8" />
    </g>

    {/* Big 3D Capsule tilted 45 deg */}
    <g transform="rotate(-45 32 35)" filter="url(#med-drop)">
      {/* Red half */}
      <path d="M22 25 C22 19 26 15 32 15 C38 15 42 19 42 25 L42 35 L22 35 Z" fill="url(#med-capsule-red)" />
      {/* White half */}
      <path d="M22 35 L42 35 L42 45 C42 51 38 55 32 55 C26 55 22 51 22 45 Z" fill="url(#med-capsule-white)" />
      {/* Center belt */}
      <line x1="22" y1="35" x2="42" y2="35" stroke="#991B1B" strokeWidth="1.5" strokeOpacity="0.3" />
      {/* Specular shine */}
      <path d="M25 20 C25 18 27 17 30 17 L30 47 C28 47 26 46 25 44 Z" fill="#FFFFFF" fillOpacity="0.45" />
    </g>

    {/* Golden sparkle */}
    <path d="M14 20 L16 14 L22 16 L17 19 L19 25 L15 21 L10 23 L13 18 Z" fill="#F59E0B" />
    {/* Micro medical cross */}
    <path d="M47 45 H53 M50 42 V48" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// 2. Healthcare: Stethoscope + pulsing heart + ECG monitor rhythm
export const HealthcareSticker = ({ className = "h-full w-full" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="hc-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E0F2FE" />
        <stop offset="1" stopColor="#BAE6FD" />
      </linearGradient>
      <linearGradient id="hc-heart" x1="18" y1="20" x2="46" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F43F5E" />
        <stop offset="1" stopColor="#E11D48" />
      </linearGradient>
      <linearGradient id="hc-tube" x1="16" y1="22" x2="48" y2="54" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0284C7" />
        <stop offset="1" stopColor="#0369A1" />
      </linearGradient>
      <filter id="hc-drop" x="4" y="6" width="56" height="56" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#0284C7" floodOpacity="0.22" />
      </filter>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#hc-bg)" />
    <rect x="4" y="4" width="56" height="56" rx="16" stroke="#7DD3FC" strokeWidth="1.5" strokeOpacity="0.6" />

    {/* Glowing Heart with Pulse */}
    <g filter="url(#hc-drop)">
      <path d="M32 46 C24 38 18 31 18 24 C18 19 22 15 27 15 C29.8 15 31.5 16.5 32 17.5 C32.5 16.5 34.2 15 37 15 C42 15 46 19 46 24 C46 31 40 38 32 46 Z" fill="url(#hc-heart)" />
      {/* Specular gloss */}
      <ellipse cx="24" cy="20" rx="3" ry="1.5" transform="rotate(-30 24 20)" fill="#FFFFFF" fillOpacity="0.4" />
      {/* Pulse line */}
      <path d="M21 27 H26 L28.5 21 L32.5 32 L35.5 25 L38 28 H43" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </g>

    {/* Stethoscope */}
    <g filter="url(#hc-drop)">
      <path d="M16 28 C14 44 26 53 38 52 C46 51 50 44 50 37 L50 32" stroke="url(#hc-tube)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="30" r="5" fill="#E2E8F0" stroke="#0284C7" strokeWidth="2" />
      <circle cx="50" cy="30" r="2" fill="#0284C7" />
    </g>

    {/* Medical floating cross */}
    <path d="M12 16 H18 M15 13 V19" stroke="#0284C7" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

// 3. Beauty: Luxury cosmetic serum bottle with dropper + golden sparkles
export const BeautySticker = ({ className = "h-full w-full" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="bt-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FCE7F3" />
        <stop offset="1" stopColor="#FBCFE8" />
      </linearGradient>
      <linearGradient id="bt-bottle" x1="20" y1="24" x2="44" y2="52" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F43F5E" />
        <stop offset="1" stopColor="#EC4899" />
      </linearGradient>
      <linearGradient id="bt-gold" x1="24" y1="16" x2="40" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FBBF24" />
        <stop offset="1" stopColor="#D97706" />
      </linearGradient>
      <filter id="bt-drop" x="4" y="6" width="56" height="56" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#EC4899" floodOpacity="0.22" />
      </filter>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#bt-bg)" />
    <rect x="4" y="4" width="56" height="56" rx="16" stroke="#F472B6" strokeWidth="1.5" strokeOpacity="0.6" />

    {/* Cosmetic Bottle */}
    <g filter="url(#bt-drop)">
      {/* Pipette Cap Top */}
      <rect x="29" y="10" width="6" height="7" rx="3" fill="#FB7185" />
      {/* Gold Ring Collar */}
      <rect x="26" y="17" width="12" height="6" rx="2" fill="url(#bt-gold)" />
      {/* Bottle Body */}
      <rect x="20" y="23" width="24" height="28" rx="8" fill="url(#bt-bottle)" />
      {/* Bottle Inner Label */}
      <rect x="24" y="29" width="16" height="15" rx="3" fill="#FFFFFF" fillOpacity="0.9" />
      <line x1="27" y1="34" x2="37" y2="34" stroke="#FB7185" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="29" y1="38" x2="35" y2="38" stroke="#F43F5E" strokeWidth="1.2" strokeLinecap="round" />
      {/* Gloss bar */}
      <path d="M22 28 C22 26 24 25 26 25 L26 49 C23 49 22 47 22 45 Z" fill="#FFFFFF" fillOpacity="0.35" />
    </g>

    {/* Sparkles */}
    <path d="M48 15 Q52 15 52 11 Q52 15 56 15 Q52 15 52 19 Q52 15 48 15 Z" fill="#F59E0B" />
    <path d="M12 28 Q15 28 15 25 Q15 28 18 28 Q15 28 15 31 Q15 28 12 28 Z" fill="#EC4899" />
    <circle cx="48" cy="46" r="2.5" fill="#F43F5E" />
  </svg>
);

// 4. Sexual Wellness: Protective wellness shield + passionate heart & vitality glow
export const SexualWellnessSticker = ({ className = "h-full w-full" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="sw-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F5D0FE" />
        <stop offset="1" stopColor="#E9D5FF" />
      </linearGradient>
      <linearGradient id="sw-shield" x1="16" y1="14" x2="48" y2="52" gradientUnits="userSpaceOnUse">
        <stop stopColor="#9333EA" />
        <stop offset="1" stopColor="#C026D3" />
      </linearGradient>
      <linearGradient id="sw-heart" x1="22" y1="22" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF4B72" />
        <stop offset="1" stopColor="#E11D48" />
      </linearGradient>
      <filter id="sw-drop" x="4" y="6" width="56" height="56" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#9333EA" floodOpacity="0.22" />
      </filter>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#sw-bg)" />
    <rect x="4" y="4" width="56" height="56" rx="16" stroke="#D8B4FE" strokeWidth="1.5" strokeOpacity="0.6" />

    {/* Wellness Shield */}
    <g filter="url(#sw-drop)">
      <path d="M32 12 C40 16 47 18 47 26 C47 38 39 48 32 52 C25 48 17 38 17 26 C17 18 24 16 32 12 Z" fill="url(#sw-shield)" />
      {/* Heart */}
      <path d="M32 40 C28 35 24 30.5 24 26 C24 23 26 21 29 21 C30.8 21 31.6 22 32 22.8 C32.4 22 33.2 21 35 21 C38 21 40 23 40 26 C40 30.5 36 35 32 40 Z" fill="url(#sw-heart)" />
      {/* Gloss curve */}
      <path d="M22 20 C24 18 28 16 32 14 L32 48 C28 44 22 36 22 26 Z" fill="#FFFFFF" fillOpacity="0.22" />
    </g>

    {/* Sparkle */}
    <path d="M49 14 Q52 14 52 11 Q52 14 55 14 Q52 14 52 17 Q52 14 49 14 Z" fill="#F43F5E" />
    <circle cx="14" cy="40" r="2" fill="#9333EA" />
  </svg>
);

// 5. Baby and Mom care: Baby feeding bottle with measurements + loving heart
export const BabyCareSticker = ({ className = "h-full w-full" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="bb-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FEF3C7" />
        <stop offset="1" stopColor="#FEE2E2" />
      </linearGradient>
      <linearGradient id="bb-bottle" x1="20" y1="20" x2="44" y2="54" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38BDF8" />
        <stop offset="1" stopColor="#0284C7" />
      </linearGradient>
      <linearGradient id="bb-teat" x1="28" y1="8" x2="36" y2="18" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FBBF24" />
        <stop offset="1" stopColor="#F59E0B" />
      </linearGradient>
      <filter id="bb-drop" x="4" y="6" width="56" height="56" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#0284C7" floodOpacity="0.2" />
      </filter>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#bb-bg)" />
    <rect x="4" y="4" width="56" height="56" rx="16" stroke="#FDE68A" strokeWidth="1.5" strokeOpacity="0.6" />

    {/* Feeder Bottle */}
    <g transform="rotate(15 32 32)" filter="url(#bb-drop)">
      {/* Silicone Nipple */}
      <path d="M29 14 C29 11 31 9 32 9 C33 9 35 11 35 14 L36 18 L28 18 Z" fill="url(#bb-teat)" />
      {/* Collar */}
      <rect x="25" y="18" width="14" height="5" rx="2" fill="#F472B6" />
      {/* Body */}
      <rect x="23" y="23" width="18" height="28" rx="6" fill="url(#bb-bottle)" />
      {/* Milk line */}
      <path d="M24 33 C27 32 37 34 40 33 L40 45 C40 48 38 50 35 50 L29 50 C26 50 24 48 24 45 Z" fill="#FFFFFF" fillOpacity="0.9" />
      {/* Measurement markers */}
      <line x1="26" y1="28" x2="30" y2="28" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="34" x2="32" y2="34" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="40" x2="30" y2="40" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M38 26 L38 47" stroke="#BAE6FD" strokeWidth="1.5" strokeLinecap="round" />
    </g>

    {/* Mother's caring heart */}
    <path d="M16 22 C14 19 14 16 16 14 C18 12 21 13 22 15 C23 13 26 12 28 14 C30 16 30 19 28 22 L22 27 Z" fill="#FB7185" />
    <circle cx="51" cy="43" r="2" fill="#F59E0B" />
  </svg>
);

// 6. Herbal: Botanical leaf + apothecary mortar and pestle
export const HerbalSticker = ({ className = "h-full w-full" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="hb-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#D1FAE5" />
        <stop offset="1" stopColor="#A7F3D0" />
      </linearGradient>
      <linearGradient id="hb-leaf" x1="18" y1="12" x2="48" y2="42" gradientUnits="userSpaceOnUse">
        <stop stopColor="#34D399" />
        <stop offset="1" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="hb-mortar" x1="18" y1="34" x2="46" y2="54" gradientUnits="userSpaceOnUse">
        <stop stopColor="#047857" />
        <stop offset="1" stopColor="#064E3B" />
      </linearGradient>
      <filter id="hb-drop" x="4" y="6" width="56" height="56" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#047857" floodOpacity="0.22" />
      </filter>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#hb-bg)" />
    <rect x="4" y="4" width="56" height="56" rx="16" stroke="#6EE7B7" strokeWidth="1.5" strokeOpacity="0.6" />

    {/* Leaves & Mortar */}
    <g filter="url(#hb-drop)">
      {/* Primary leaf */}
      <path d="M32 34 C26 22 28 12 44 10 C46 26 38 32 32 34 Z" fill="url(#hb-leaf)" />
      <path d="M34 26 C37 20 41 15 44 10" stroke="#A7F3D0" strokeWidth="1.5" strokeLinecap="round" />
      {/* Secondary leaf */}
      <path d="M28 32 C20 28 16 18 28 16 C30 24 29 28 28 32 Z" fill="#10B981" />
      {/* Pestle */}
      <line x1="24" y1="24" x2="38" y2="44" stroke="#D1FAE5" strokeWidth="4" strokeLinecap="round" />
      {/* Mortar Bowl */}
      <path d="M16 36 H48 C48 46 41 52 32 52 C23 52 16 46 16 36 Z" fill="url(#hb-mortar)" />
      <ellipse cx="32" cy="36" rx="16" ry="3.5" fill="#10B981" />
      <path d="M20 42 C23 48 30 50 34 50" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />
    </g>

    <circle cx="48" cy="22" r="2" fill="#38BDF8" />
  </svg>
);

// 7. Home care: Hygiene trigger spray bottle + sparkling clean home
export const HomeCareSticker = ({ className = "h-full w-full" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="hc-care-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#CCFBF1" />
        <stop offset="1" stopColor="#99F6E4" />
      </linearGradient>
      <linearGradient id="hc-spray" x1="20" y1="22" x2="44" y2="54" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0D9488" />
        <stop offset="1" stopColor="#0F766E" />
      </linearGradient>
      <filter id="hc-care-drop" x="4" y="6" width="56" height="56" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#0D9488" floodOpacity="0.22" />
      </filter>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#hc-care-bg)" />
    <rect x="4" y="4" width="56" height="56" rx="16" stroke="#5EEAD4" strokeWidth="1.5" strokeOpacity="0.6" />

    {/* Spray Bottle */}
    <g filter="url(#hc-care-drop)">
      {/* Trigger Head */}
      <path d="M26 18 L26 14 C26 12 28 11 31 11 L35 11 C37 11 39 12 39 14 L39 18 Z" fill="#0284C7" />
      {/* Nozzle */}
      <rect x="21" y="13" width="6" height="4" rx="1" fill="#38BDF8" />
      {/* Trigger lever */}
      <path d="M25 18 C23 20 22 23 24 25" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
      {/* Collar */}
      <rect x="28" y="18" width="8" height="4" fill="#0E7490" />
      {/* Bottle Body */}
      <path d="M28 22 L24 28 C23 30 22 32 22 35 L22 48 C22 51 24 53 27 53 L37 53 C40 53 42 51 42 48 L42 35 C42 32 41 30 40 28 L36 22 Z" fill="url(#hc-spray)" />
      {/* Home Silhouette */}
      <path d="M32 34 L27 38 V45 H37 V38 Z" fill="#FFFFFF" fillOpacity="0.9" />
      <polygon points="32,32 25,38 27,38 32,34 37,38 39,38" fill="#5EEAD4" />
      <path d="M24 35 L24 47" stroke="#5EEAD4" strokeWidth="1.5" strokeLinecap="round" />
    </g>

    {/* Sparkling Mist */}
    <circle cx="15" cy="14" r="2.5" fill="#38BDF8" fillOpacity="0.8" />
    <circle cx="12" cy="19" r="1.8" fill="#38BDF8" fillOpacity="0.6" />
    <path d="M48 20 Q51 20 51 17 Q51 20 54 20 Q51 20 51 23 Q51 20 48 20 Z" fill="#F59E0B" />
  </svg>
);

// 8. Supplement: Vitamin bottle with energy lightning + golden omega capsule
export const SupplementSticker = ({ className = "h-full w-full" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="sp-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FEF3C7" />
        <stop offset="1" stopColor="#FDE68A" />
      </linearGradient>
      <linearGradient id="sp-bottle" x1="18" y1="18" x2="46" y2="52" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#D97706" />
      </linearGradient>
      <linearGradient id="sp-zap" x1="28" y1="28" x2="36" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FEF08A" />
        <stop offset="1" stopColor="#FACC15" />
      </linearGradient>
      <filter id="sp-drop" x="4" y="6" width="56" height="56" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#D97706" floodOpacity="0.22" />
      </filter>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#sp-bg)" />
    <rect x="4" y="4" width="56" height="56" rx="16" stroke="#FCD34D" strokeWidth="1.5" strokeOpacity="0.6" />

    {/* Vitamin Bottle */}
    <g filter="url(#sp-drop)">
      {/* Cap */}
      <rect x="25" y="11" width="14" height="6" rx="2" fill="#78350F" />
      <rect x="23" y="16" width="18" height="3" rx="1" fill="#92400E" />
      {/* Bottle Body */}
      <rect x="20" y="19" width="24" height="32" rx="7" fill="url(#sp-bottle)" />
      {/* Label */}
      <rect x="23" y="25" width="18" height="20" rx="3" fill="#FFFFFF" />
      {/* Lightning energy */}
      <polygon points="33,27 28,35 32,35 31,43 36,34 32,34" fill="url(#sp-zap)" stroke="#CA8A04" strokeWidth="0.8" />
      <path d="M22 24 C22 22 24 21 26 21 L26 48 C23 48 22 46 22 44 Z" fill="#FFFFFF" fillOpacity="0.3" />
    </g>

    {/* Floating Golden Bead */}
    <circle cx="48" cy="20" r="5" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.5" />
    <ellipse cx="46.5" cy="18.5" rx="1.5" ry="0.8" fill="#FFFFFF" fillOpacity="0.6" />
    <path d="M12 24 Q15 24 15 21 Q15 24 18 24 Q15 24 15 27 Q15 24 12 24 Z" fill="#D97706" />
  </svg>
);

// 9. Food and nutrition: Organic crisp apple + wholesome nutrition bowl
export const FoodNutritionSticker = ({ className = "h-full w-full" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="fn-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ECFCCB" />
        <stop offset="1" stopColor="#D9F99D" />
      </linearGradient>
      <linearGradient id="fn-apple" x1="20" y1="20" x2="44" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EF4444" />
        <stop offset="1" stopColor="#B91C1C" />
      </linearGradient>
      <filter id="fn-drop" x="4" y="6" width="56" height="56" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#15803D" floodOpacity="0.22" />
      </filter>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#fn-bg)" />
    <rect x="4" y="4" width="56" height="56" rx="16" stroke="#BEF264" strokeWidth="1.5" strokeOpacity="0.6" />

    {/* Crisp Apple & Nutrient Bowl */}
    <g filter="url(#fn-drop)">
      {/* Stem */}
      <path d="M32 17 C32 13 35 11 37 10" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
      {/* Leaf */}
      <path d="M34 14 C39 12 43 14 42 18 C37 19 35 16 34 14 Z" fill="#22C55E" />
      {/* Apple body */}
      <path d="M32 23 C28 19 20 20 20 28 C20 38 27 47 32 47 C37 47 44 38 44 28 C44 20 36 19 32 23 Z" fill="url(#fn-apple)" />
      {/* Gloss shine */}
      <ellipse cx="25" cy="27" rx="3" ry="1.5" transform="rotate(-30 25 27)" fill="#FFFFFF" fillOpacity="0.45" />
    </g>

    {/* Nutrition Bowl arc in front */}
    <path d="M16 39 C16 48 23 53 32 53 C41 53 48 48 48 39 Z" fill="#16A34A" />
    <ellipse cx="32" cy="39" rx="16" ry="3.5" fill="#4ADE80" />
    <circle cx="49" cy="28" r="2" fill="#EA580C" />
  </svg>
);

// 10. Pet care: 3D Glossy paw print with heart pad + health cross
export const PetCareSticker = ({ className = "h-full w-full" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="pet-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFEDD5" />
        <stop offset="1" stopColor="#FED7AA" />
      </linearGradient>
      <linearGradient id="pet-paw" x1="18" y1="18" x2="46" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EA580C" />
        <stop offset="1" stopColor="#C2410C" />
      </linearGradient>
      <filter id="pet-drop" x="4" y="6" width="56" height="56" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#C2410C" floodOpacity="0.22" />
      </filter>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#pet-bg)" />
    <rect x="4" y="4" width="56" height="56" rx="16" stroke="#FDBA74" strokeWidth="1.5" strokeOpacity="0.6" />

    {/* Glossy Paw Print */}
    <g filter="url(#pet-drop)">
      <circle cx="21" cy="22" r="4.5" fill="url(#pet-paw)" />
      <circle cx="28" cy="15" r="5" fill="url(#pet-paw)" />
      <circle cx="36" cy="15" r="5" fill="url(#pet-paw)" />
      <circle cx="43" cy="22" r="4.5" fill="url(#pet-paw)" />
      <ellipse cx="28" cy="14" rx="1.8" ry="1" fill="#FFFFFF" fillOpacity="0.4" />
      <ellipse cx="36" cy="14" rx="1.8" ry="1" fill="#FFFFFF" fillOpacity="0.4" />

      {/* Main Heart Pad */}
      <path d="M32 47 C23 39 19 33 22 28 C24 24 28 25 32 29 C36 25 40 24 42 28 C45 33 41 39 32 47 Z" fill="url(#pet-paw)" />
      <ellipse cx="26" cy="30" rx="2.5" ry="1.2" transform="rotate(-20 26 30)" fill="#FFFFFF" fillOpacity="0.4" />
    </g>

    {/* Medical cross badge */}
    <circle cx="48" cy="46" r="6" fill="#0284C7" />
    <path d="M45 46 H51 M48 43 V49" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// 11. Veterinary: Medical cross shield with animal health V badge
export const VeterinarySticker = ({ className = "h-full w-full" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="vet-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#CFFAFE" />
        <stop offset="1" stopColor="#A5F3FC" />
      </linearGradient>
      <linearGradient id="vet-shield" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0891B2" />
        <stop offset="1" stopColor="#0E7490" />
      </linearGradient>
      <filter id="vet-drop" x="4" y="6" width="56" height="56" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#0891B2" floodOpacity="0.22" />
      </filter>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#vet-bg)" />
    <rect x="4" y="4" width="56" height="56" rx="16" stroke="#67E8F9" strokeWidth="1.5" strokeOpacity="0.6" />

    {/* Shield & Vet Cross */}
    <g filter="url(#vet-drop)">
      <path d="M32 11 C42 14 47 16 47 26 C47 39 39 49 32 53 C25 49 17 39 17 26 C17 16 22 14 32 11 Z" fill="url(#vet-shield)" />
      {/* White Cross */}
      <path d="M28 20 H36 V28 H44 V36 H36 V44 H28 V36 H20 V28 H28 Z" fill="#FFFFFF" />
      {/* V Caduceus Mark */}
      <path d="M29 29 L32 37 L35 29" stroke="#0891B2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Gloss */}
      <path d="M20 20 C24 16 28 14 32 13 L32 50 C26 46 20 38 20 26 Z" fill="#FFFFFF" fillOpacity="0.18" />
    </g>

    <circle cx="50" cy="16" r="3" fill="#0E7490" />
  </svg>
);

// 12. Homeopathy: Pure apothecary dropper vial + potent holistic droplet
export const HomeopathySticker = ({ className = "h-full w-full" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="hm-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EDE9FE" />
        <stop offset="1" stopColor="#DDD6FE" />
      </linearGradient>
      <linearGradient id="hm-vial" x1="20" y1="20" x2="44" y2="52" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#4F46E5" />
      </linearGradient>
      <linearGradient id="hm-drop-grad" x1="28" y1="36" x2="36" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38BDF8" />
        <stop offset="1" stopColor="#0284C7" />
      </linearGradient>
      <filter id="hm-drop" x="4" y="6" width="56" height="56" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#6366F1" floodOpacity="0.22" />
      </filter>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#hm-bg)" />
    <rect x="4" y="4" width="56" height="56" rx="16" stroke="#C4B5FD" strokeWidth="1.5" strokeOpacity="0.6" />

    {/* Dropper Bottle */}
    <g filter="url(#hm-drop)">
      <rect x="29" y="9" width="6" height="6" rx="3" fill="#312E81" />
      <rect x="26" y="15" width="12" height="4" rx="1" fill="#4338CA" />
      <rect x="22" y="19" width="20" height="32" rx="6" fill="url(#hm-vial)" />
      <rect x="25" y="25" width="14" height="20" rx="3" fill="#FFFFFF" />
      <path d="M32 30 C30 33 28 35 28 38 C32 38 34 35 34 32 Z" fill="#10B981" />
      <line x1="32" y1="31" x2="32" y2="40" stroke="#059669" strokeWidth="1" strokeLinecap="round" />
      <path d="M24 22 L24 47" stroke="#A5B4FC" strokeWidth="1.5" strokeLinecap="round" />
    </g>

    {/* Falling Pure Droplet */}
    <g filter="url(#hm-drop)">
      <path d="M47 32 C47 32 52 38 52 41 C52 44 49.8 46 47 46 C44.2 46 42 41 47 32 Z" fill="url(#hm-drop-grad)" />
      <circle cx="46" cy="42" r="1" fill="#FFFFFF" fillOpacity="0.8" />
    </g>

    <path d="M14 18 Q16 18 16 16 Q16 18 18 18 Q16 18 16 20 Q16 18 14 18 Z" fill="#8B5CF6" />
  </svg>
);

// Universal Pharmacy Cross Sticker (Fallback for any unknown category)
export const PharmacySticker = ({ className = "h-full w-full" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="ph-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E0F2FE" />
        <stop offset="1" stopColor="#BAE6FD" />
      </linearGradient>
      <linearGradient id="ph-cross" x1="20" y1="20" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0284C7" />
        <stop offset="1" stopColor="#0369A1" />
      </linearGradient>
      <filter id="ph-drop" x="4" y="6" width="56" height="56" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#0284C7" floodOpacity="0.22" />
      </filter>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#ph-bg)" />
    <rect x="4" y="4" width="56" height="56" rx="16" stroke="#7DD3FC" strokeWidth="1.5" strokeOpacity="0.6" />
    <g filter="url(#ph-drop)">
      <path d="M26 16 H38 V26 H48 V38 H38 V48 H26 V38 H16 V26 H26 Z" fill="url(#ph-cross)" />
      <circle cx="32" cy="32" r="4" fill="#FFFFFF" />
    </g>
  </svg>
);

/* -------------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------------- */
export interface CategoryIconProps {
  iconUrl?: string | null;
  name: string;
  slug?: string;
  className?: string;
  iconClassName?: string;
}

const CategoryIcon = ({
  iconUrl,
  name,
  slug,
  className = "h-8 w-8",
}: CategoryIconProps) => {
  // 1. If explicit lucide icon string is saved in DB
  if (iconUrl?.startsWith("lucide:")) {
    const iconName = iconUrl.replace("lucide:", "");
    const Icon = (LucideIcons as Record<string, any>)[iconName];
    if (Icon && (typeof Icon === "function" || (typeof Icon === "object" && Icon.$$typeof))) {
      return <Icon className={className} />;
    }
  }

  // 2. If explicit custom image URL is provided in DB
  if (iconUrl) {
    return <img src={iconUrl} alt={name} className={`${className} object-contain`} />;
  }

  // 3. Fallback: Render premium bespoke category sticker based on slug/name
  const key = (slug || name || "").toLowerCase().trim();

  if (key.includes("medicine")) return <MedicineSticker className={className} />;
  if (key.includes("health")) return <HealthcareSticker className={className} />;
  if (key.includes("beauty") || key.includes("cosmetic") || key.includes("skin")) return <BeautySticker className={className} />;
  if (key.includes("sexual") || key.includes("wellness")) return <SexualWellnessSticker className={className} />;
  if (key.includes("baby") || key.includes("mom") || key.includes("mother")) return <BabyCareSticker className={className} />;
  if (key.includes("herb") || key.includes("ayur")) return <HerbalSticker className={className} />;
  if (key.includes("home") && (key.includes("care") || key.includes("hygiene"))) return <HomeCareSticker className={className} />;
  if (key.includes("supple") || key.includes("vitamin")) return <SupplementSticker className={className} />;
  if (key.includes("food") || key.includes("nutri")) return <FoodNutritionSticker className={className} />;
  if (key.includes("pet")) return <PetCareSticker className={className} />;
  if (key.includes("vet")) return <VeterinarySticker className={className} />;
  if (key.includes("homeo")) return <HomeopathySticker className={className} />;

  // Default pharmacy sticker
  return <PharmacySticker className={className} />;
};

export default CategoryIcon;
