import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Upload, Download, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/logActivity";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from "xlsx";

interface ExcelRow {
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  stock: number;
  category?: string;
  subcategory?: string;
  image_url?: string;
  sku?: string;
  price_unit?: string;
  specification?: string;
  delivery_time?: string;
  sold_count?: number;
  is_active?: boolean;
  brand?: string;
  generic_name?: string;
  slug?: string;
}


interface ParseResult {
  row: number;
  data: ExcelRow;
  valid: boolean;
  error?: string;
}

// Column alias map: internal key -> possible header names (lowercase)
const COLUMN_ALIASES: Record<string, string[]> = {
  name: ["name", "product name", "product_name", "title", "medicine", "medicine name", "নাম"],
  price: ["price", "strip price", "strip_price", "selling price", "selling_price", "মূল্য"],
  stock: ["stock", "quantity", "qty", "স্টক"],
  description: ["description", "details", "বিবরণ"],
  original_price: ["original_price", "original price", "unit price", "unit_price", "mrp", "compare price", "compare_price"],
  category: ["category", "cat", "ক্যাটাগরি"],
  subcategory: ["subcategory", "sub_category", "sub category"],
  image_url: ["image_url", "image", "img", "photo", "ছবি"],
  sku: ["sku", "product code", "code"],
  price_unit: [
    "price_unit",
    "price unit",
    "price unite",
    "price-unit",
    "unit",
    "unit type",
    "per unit",
    "price per",
  ],
  pack_size: ["pack size", "pack_size", "pack price", "pack_price", "packsize"],
  generic_name: ["generic name", "generic_name", "generic"],
  composition: ["composition"],
  indications: ["indications", "indication"],
  pharmacology: ["pharmacology"],
  dosage: ["dosage administration", "dosage and administration", "dosage & administration", "dosage", "administration"],
  side_effects: ["side effects", "side_effects", "side effect"],
  specification: ["specification", "specifications", "specs", "spec"],
  delivery_time: ["delivery_time", "delivery time", "delivery"],
  sold_count: ["sold", "sold_count", "sold count"],
  is_active: ["active", "is_active", "status"],
  brand: ["brand", "brand name", "brand_name", "brand-name", "brandname", "manufacturer", "company", "mfg", "ব্র্যান্ড"],
};


const REQUIRED_COLUMNS = ["name", "price"];

const SAMPLE_COLUMNS = [
  "Image", "Name", "SKU", "Brand", "Category", "Price", "Original Price",
  "Stock", "Sold", "Active", "Specification", "Description", "Delivery Time"
];

function normalizeHeader(header: any): string {
  if (!header) return "";
  return String(header)
    .replace(/\u00A0/g, " ")
    .replace(/\uFEFF/g, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapHeaderToKey(header: string): string | null {
  const h = normalizeHeader(header);
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    // Exact match
    if (aliases.map(normalizeHeader).includes(h)) return key;
  }
  // Starts-with fallback
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some(a => h.startsWith(normalizeHeader(a)))) return key;
  }
  // Contains fallback
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some(a => h.includes(normalizeHeader(a)))) return key;
  }
  return null;
}

function normalizeRowHeaders(row: Record<string, any>): Record<string, any> {
  const obj: Record<string, any> = {};
  Object.keys(row).forEach((key) => {
    const mapped = mapHeaderToKey(key);
    const targetKey = mapped || normalizeHeader(key);
    const incomingValue = row[key];
    const existingValue = obj[targetKey];

    const existingText = existingValue === undefined || existingValue === null ? "" : String(existingValue).trim();
    const incomingText = incomingValue === undefined || incomingValue === null ? "" : String(incomingValue).trim();

    // Don't overwrite a meaningful value with empty/placeholder values from duplicate columns
    if (existingText && !incomingText) return;
    if (existingText && ["n/a", "na", "none", "null", "undefined", "-"].includes(incomingText.toLowerCase())) return;

    obj[targetKey] = incomingValue;
  });
  return obj;
}

function cleanText(value: any): string {
  if (value === undefined || value === null) return "";
  const text = String(value).replace(/\u00A0/g, " ").trim();
  if (!text) return "";
  const lower = text.toLowerCase();
  if (["n/a", "na", "none", "null", "undefined", "-"].includes(lower)) return "";
  return text;
}

function pickFirstValue(obj: Record<string, any>, keys: string[]): string {
  const normalizedEntries = Object.entries(obj).map(([k, v]) => [normalizeHeader(k), v] as const);

  for (const key of keys) {
    const directValue = cleanText(obj[key]);
    if (directValue) return directValue;

    const normalizedKey = normalizeHeader(key);
    const matched = normalizedEntries.find(([k]) => k === normalizedKey);
    if (matched) {
      const value = cleanText(matched[1]);
      if (value) return value;
    }
  }
  return "";
}

// Extract image URL from HTML img tags or return as-is if already a URL
function extractImageUrl(value: any): string {
  if (!value) return "";
  const str = String(value).trim();
  // Check if it contains an <img> tag
  const imgMatch = str.match(/src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];
  // If it's already a URL
  if (str.startsWith("http://") || str.startsWith("https://")) return str;
  return str;
}

// Parse active/status field
function parseActive(value: any): boolean {
  if (value === undefined || value === null || value === "") return true;
  const str = String(value).trim().toLowerCase();
  if (["yes", "true", "1", "active", "হ্যাঁ"].includes(str)) return true;
  if (["no", "false", "0", "inactive", "না"].includes(str)) return false;
  return true;
}

// Auto-detect price_unit from product name or description
function detectPriceUnit(name: string, description?: string): string | undefined {
  const text = `${name} ${description || ""}`.toLowerCase();
  
  const patterns: { regex: RegExp; unit: string }[] = [
    { regex: /per\s*strip\s*\(?\s*(\d+)\s*(?:pcs?|pieces?|টি)?\s*\)?/i, unit: "" },
    { regex: /per\s*strip/i, unit: "per strip" },
    { regex: /per\s*box\s*\(?\s*(\d+)\s*(?:pcs?|pieces?|টি)?\s*\)?/i, unit: "" },
    { regex: /per\s*box/i, unit: "per box" },
    { regex: /per\s*pack\s*\(?\s*(\d+)\s*(?:pcs?|pieces?|টি)?\s*\)?/i, unit: "" },
    { regex: /per\s*pack/i, unit: "per pack" },
    { regex: /per\s*bottle/i, unit: "per bottle" },
    { regex: /per\s*tube/i, unit: "per tube" },
    { regex: /per\s*vial/i, unit: "per vial" },
    { regex: /per\s*piece/i, unit: "per piece" },
    { regex: /per\s*unit/i, unit: "per unit" },
    { regex: /per\s*tablet/i, unit: "per tablet" },
    { regex: /per\s*capsule/i, unit: "per capsule" },
    { regex: /per\s*sachet/i, unit: "per sachet" },
    { regex: /per\s*ampou?le/i, unit: "per ampoule" },
    { regex: /per\s*injection/i, unit: "per injection" },
    { regex: /per\s*syrup/i, unit: "per syrup" },
    { regex: /(\d+)\s*(?:pcs?|pieces?|টি)\s*(?:\/\s*(?:strip|box|pack))?/i, unit: "" },
  ];

  for (const p of patterns) {
    const match = text.match(p.regex);
    if (match) {
      if (p.unit === "") {
        // Build dynamic unit from match
        const fullMatch = match[0].trim();
        // Extract "per strip (10 pcs)" style
        const perMatch = fullMatch.match(/per\s*(\w+)\s*\(?\s*(\d+)\s*(?:pcs?|pieces?|টি)?\s*\)?/i);
        if (perMatch) {
          return `per ${perMatch[1]} (${perMatch[2]} pcs)`;
        }
        // Extract "10 pcs/strip" style
        const pcsMatch = fullMatch.match(/(\d+)\s*(?:pcs?|pieces?|টি)\s*\/?\s*(strip|box|pack)?/i);
        if (pcsMatch) {
          const container = pcsMatch[2] || "strip";
          return `per ${container} (${pcsMatch[1]} pcs)`;
        }
        return fullMatch;
      }
      return p.unit;
    }
  }
  return undefined;
}

const SKU_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const generateSKU = () => {
  let out = "";
  for (let i = 0; i < 8; i++) out += SKU_CHARS[Math.floor(Math.random() * SKU_CHARS.length)];
  return `SKP-${out}`;
};

function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\u0980-\u09FF\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "product"
  );
}

function parseMoney(value: any): number | undefined {
  const text = cleanText(value).replace(/[^\d.]/g, "");
  if (!text) return undefined;
  const num = parseFloat(text);
  return isNaN(num) ? undefined : num;
}

const SECTION_FIELDS: { key: string; label: string }[] = [
  { key: "composition", label: "Composition" },
  { key: "indications", label: "Indications" },
  { key: "pharmacology", label: "Pharmacology" },
  { key: "dosage", label: "Dosage & Administration" },
  { key: "side_effects", label: "Side Effects" },
];

/** Build a sectioned HTML description from medicine columns */
function buildSectionedDescription(obj: Record<string, any>, baseDescription: string): string {
  const parts: string[] = [];
  if (baseDescription) parts.push(`<p>${baseDescription}</p>`);
  for (const f of SECTION_FIELDS) {
    const val = cleanText(obj[f.key]);
    if (!val) continue;
    parts.push(
      `<section class="product-section"><h3 style="font-size:16px;font-weight:600;margin:16px 0 6px">${f.label}</h3><div style="white-space:pre-line">${val}</div></section>`
    );
  }
  return parts.join("");
}

function validateRow(obj: Record<string, any>, rowIndex: number): ParseResult {
  const name = cleanText(obj["name"]);
  const unitPrice = parseMoney(obj["original_price"]);
  const stripPrice = parseMoney(obj["price"]);
  const price = stripPrice ?? unitPrice ?? NaN;
  const stockRaw = cleanText(obj["stock"]);
  const stock = stockRaw ? parseInt(stockRaw, 10) : 100;

  if (!name) return { row: rowIndex, data: {} as ExcelRow, valid: false, error: "নাম খালি" };
  if (isNaN(price) || price <= 0) return { row: rowIndex, data: {} as ExcelRow, valid: false, error: "মূল্য সঠিক নয়" };
  if (isNaN(stock) || stock < 0) return { row: rowIndex, data: {} as ExcelRow, valid: false, error: "স্টক সঠিক নয়" };

  const soldCount = obj["sold_count"] ? parseInt(obj["sold_count"], 10) : undefined;
  const baseDescription = cleanText(obj["description"]);
  const description = buildSectionedDescription(obj, baseDescription);
  const packSize = cleanText(obj["pack_size"]);
  const priceUnit = pickFirstValue(obj, ["price_unit", "price unit", "price unite", "unit", "unit type", "per unit", "price per"]);
  const brand = pickFirstValue(obj, ["brand", "brand name", "brandname", "manufacturer", "company", "mfg"]);
  const specification = cleanText(obj["specification"]) || (packSize ? `Pack Size: ${packSize}` : "");

  return {
    row: rowIndex,
    valid: true,
    data: {
      name,
      description: description || undefined,
      price,
      original_price: unitPrice && unitPrice !== price ? unitPrice : undefined,
      stock,
      category: cleanText(obj["category"]) || undefined,
      subcategory: cleanText(obj["subcategory"]) || undefined,
      image_url: extractImageUrl(obj["image_url"]) || undefined,
      sku: cleanText(obj["sku"]) || undefined,
      price_unit: priceUnit || (stripPrice ? "strip" : undefined) || detectPriceUnit(name, baseDescription) || undefined,
      specification: specification || undefined,
      delivery_time: cleanText(obj["delivery_time"]) || undefined,
      sold_count: soldCount && !isNaN(soldCount) ? soldCount : undefined,
      is_active: parseActive(obj["is_active"]),
      brand: brand || undefined,
      generic_name: cleanText(obj["generic_name"]) || undefined,
      slug: slugifyName(name),
    },
  };
}


interface Props {
  onComplete: () => void;
}

const ExcelProductUpload = ({ onComplete }: Props) => {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParseResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParsed([]);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls"].includes(ext || "")) {
      toast.error("শুধুমাত্র .xlsx বা .xls ফাইল সাপোর্ট করে");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rawArrayBuffer = ev.target?.result as ArrayBuffer;
        const data = new Uint8Array(rawArrayBuffer);
        
        // Also read as text to extract image URLs from HTML-based XLS files
        const textDecoder = new TextDecoder("utf-8");
        const rawText = textDecoder.decode(data);
        
        // Extract image URLs from HTML img tags per row
        const htmlImageUrls: string[] = [];
        if (rawText.includes("<img")) {
          const rowMatches = rawText.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
          // Skip first row (header)
          for (let i = 1; i < rowMatches.length; i++) {
            const imgMatch = rowMatches[i].match(/<img[^>]+src=["']([^"']+)["']/i);
            htmlImageUrls.push(imgMatch ? imgMatch[1] : "");
          }
        }
        
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (jsonData.length === 0) {
          toast.error("ফাইলে কোনো ডাটা পাওয়া যায়নি");
          return;
        }

        // Normalize headers using alias mapping
        const normalized = jsonData.map((row, idx) => {
          const mapped = normalizeRowHeaders(row);
          // If image_url is empty but we have HTML-extracted URL, use it
          if ((!mapped["image_url"] || String(mapped["image_url"]).trim() === "") && htmlImageUrls[idx]) {
            mapped["image_url"] = htmlImageUrls[idx];
          }
          // Debug: log first row mapping
          if (idx === 0) {
            console.log("[ExcelUpload] Raw keys:", Object.keys(row));
            console.log("[ExcelUpload] Mapped keys:", Object.keys(mapped));
            console.log("[ExcelUpload] brand=", mapped["brand"], "price_unit=", mapped["price_unit"]);
          }
          return mapped;
        });

        const headers = Object.keys(normalized[0]);
        const missingRequired = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
        if (missingRequired.length > 0) {
          toast.error(`প্রয়োজনীয় কলাম পাওয়া যায়নি: ${missingRequired.join(", ")}`);
          return;
        }

        const results = normalized.map((row, i) => validateRow(row, i + 2));
        setParsed(results);
        setImportResult(null);

        const validCount = results.filter((r) => r.valid).length;
        const invalidCount = results.filter((r) => !r.valid).length;
        toast.info(`${validCount} টি সঠিক, ${invalidCount} টি ত্রুটিপূর্ণ রো পাওয়া গেছে`);
      } catch {
        toast.error("ফাইল পড়তে সমস্যা হয়েছে। সঠিক Excel ফাইল দিন।");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    const validRows = parsed.filter((r) => r.valid);
    if (validRows.length === 0) { toast.error("কোনো সঠিক রো নেই"); return; }

    setImporting(true);
    let success = 0;
    let failed = 0;

    // Fetch all brands to map brand name -> brand_id
    const { data: allBrands } = await supabase.from("brands").select("id, name");
    const brandMap = new Map<string, string>();
    (allBrands || []).forEach((b) => brandMap.set(b.name.toLowerCase().trim(), b.id));

    // Auto-create missing brands
    const newBrandNames: string[] = [];
    const uniqueBrands = new Set<string>();
    validRows.forEach((r) => {
      const brandName = r.data.brand?.trim();
      if (brandName && !brandMap.has(brandName.toLowerCase()) && !uniqueBrands.has(brandName.toLowerCase())) {
        uniqueBrands.add(brandName.toLowerCase());
      }
    });

    const createdBrands: string[] = [];
    for (const brandKey of uniqueBrands) {
      const originalName = validRows.find((r) => r.data.brand?.toLowerCase().trim() === brandKey)?.data.brand?.trim() || brandKey;
      const { data: newBrand, error: brandErr } = await supabase
        .from("brands")
        .insert({ name: originalName, status: "approved", is_active: true })
        .select("id, name")
        .single();
      if (!brandErr && newBrand) {
        brandMap.set(newBrand.name.toLowerCase().trim(), newBrand.id);
        createdBrands.push(newBrand.name);
        newBrandNames.push(newBrand.name);
      }
    }

    // Notify admin about new brands via notification + SMS
    if (createdBrands.length > 0) {
      const brandList = createdBrands.join(", ");
      const notifBody = `Excel ইম্পোর্টের মাধ্যমে ${createdBrands.length}টি নতুন ব্র্যান্ড তৈরি হয়েছে: ${brandList}`;

      // Insert admin notification
      await supabase.from("admin_notifications").insert({
        title: "নতুন ব্র্যান্ড তৈরি হয়েছে",
        body: notifBody,
        type: "brand_auto_created",
      });

      // Send SMS to admin
      try {
        const { data: smsSettings } = await (supabase.from("sms_settings" as any) as any)
          .select("admin_phone, is_enabled")
          .limit(1)
          .single();

        if (smsSettings?.is_enabled && smsSettings.admin_phone) {
          const { data: siteSettings } = await supabase.from("site_settings").select("site_name").limit(1).single();
          const siteName = siteSettings?.site_name || "QweekBD";
          const smsMsg = `${siteName}: Excel ইম্পোর্টে ${createdBrands.length}টি নতুন ব্র্যান্ড তৈরি হয়েছে - ${createdBrands.slice(0, 5).join(", ")}${createdBrands.length > 5 ? ` ও আরো ${createdBrands.length - 5}টি` : ""}`;
          await supabase.functions.invoke("send-sms", {
            body: { phone: smsSettings.admin_phone, message: smsMsg, event_type: "brand_auto_created" },
          });
        }
      } catch (e) {
        console.error("SMS send error for new brands:", e);
      }

      toast.info(`${createdBrands.length}টি নতুন ব্র্যান্ড তৈরি হয়েছে: ${createdBrands.slice(0, 3).join(", ")}${createdBrands.length > 3 ? "..." : ""}`);
    }

    const chunkSize = 50;
    for (let i = 0; i < validRows.length; i += chunkSize) {
      const chunk = validRows.slice(i, i + chunkSize);
      const payload = chunk.map((r) => {
        const brandName = r.data.brand?.toLowerCase().trim() || "";
        const brand_id = brandMap.get(brandName) || null;
        return {
          name: r.data.name,
          description: r.data.description || null,
          price: r.data.price,
          original_price: r.data.original_price || null,
          stock: r.data.stock,
          category: r.data.category || null,
          subcategory: r.data.subcategory || null,
          image_url: r.data.image_url || null,
          sku: r.data.sku || generateSKU(),
          generic_name: r.data.generic_name || null,

          price_unit: r.data.price_unit || null,
          specification: r.data.specification || null,
          delivery_time: r.data.delivery_time || null,
          sold_count: r.data.sold_count ?? 0,
          is_active: r.data.is_active ?? true,
          brand_id,
        };
      });

      const { data, error } = await supabase.from("products").insert(payload).select("id");
      if (error) {
        failed += chunk.length;
      } else {
        success += data.length;
      }
    }

    setImportResult({ success, failed });
    setImporting(false);

    if (success > 0) {
      toast.success(`${success} টি প্রোডাক্ট যোগ হয়েছে!`);
      logActivity({ action: "excel_product_import", details: `Imported ${success} products via Excel`, entity_type: "product" });
      onComplete();
    }
    if (failed > 0) {
      toast.error(`${failed} টি প্রোডাক্ট যোগ করা যায়নি`);
    }
  };

  const downloadSample = () => {
    const wsData = [
      SAMPLE_COLUMNS,
      [
        "https://example.com/image1.jpg",
        "Sample Product 1",
        "SKU-001",
        "Brand A",
        "electronics",
        500,
        600,
        10,
        0,
        "Yes",
        "Weight: 100g",
        "This is a sample product description",
        "3-5 Days",
      ],
      [
        "https://example.com/image2.jpg",
        "Sample Product 2",
        "SKU-002",
        "Brand B",
        "clothing",
        1200,
        1500,
        25,
        5,
        "Yes",
        "",
        "Another product description",
        "5-7 Days",
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Set column widths
    ws["!cols"] = [
      { wch: 35 }, { wch: 30 }, { wch: 15 }, { wch: 12 },
      { wch: 10 }, { wch: 15 }, { wch: 8 }, { wch: 8 },
      { wch: 8 }, { wch: 30 }, { wch: 40 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "products_sample.xlsx");
  };

  const validCount = parsed.filter((r) => r.valid).length;
  const invalidCount = parsed.filter((r) => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Excel দিয়ে প্রোডাক্ট আপলোড</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="rounded-md border bg-muted/50 p-3 space-y-2">
            <p className="text-sm font-medium">Excel ফাইলে নিচের কলামগুলো সাপোর্ট করে:</p>
            <div className="flex flex-wrap gap-1.5">
              {["Medicine/Name *", "Strip Price *"].map((c) => (
                <Badge key={c} variant="default" className="text-xs">{c}</Badge>
              ))}
              {["Unit Price → Original Price", "Strip Price → Price", "Pack Size", "Generic Name", "Brand (Manufacturer)", "Composition", "Indications", "Pharmacology", "Dosage & Administration", "Side Effects", "Image", "SKU", "Category", "Stock", "Sold", "Active", "Description", "Delivery Time"].map((c) => (
                <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">* চিহ্নিত কলামগুলো আবশ্যক। প্রথম রো হবে কলামের নাম।</p>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={downloadSample}>
              <Download className="mr-1 h-3 w-3" /> নমুনা Excel ডাউনলোড করুন
            </Button>
          </div>

          {/* File input */}
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-4 py-3 text-sm text-muted-foreground hover:bg-muted transition-colors">
            <Upload className="h-4 w-4" />
            Excel ফাইল নির্বাচন করুন (.xlsx / .xls)
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
          </label>

          {/* Preview */}
          {parsed.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-primary">
                  <CheckCircle2 className="h-4 w-4" /> {validCount} সঠিক
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-4 w-4" /> {invalidCount} ত্রুটি
                  </span>
                )}
              </div>

              <ScrollArea className="h-[300px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">রো</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>ছবি</TableHead>
                      <TableHead>নাম</TableHead>
                      <TableHead>ব্র্যান্ড</TableHead>
                      <TableHead className="text-right">মূল্য</TableHead>
                      <TableHead>ইউনিট</TableHead>
                      <TableHead className="text-right">স্টক</TableHead>
                      <TableHead>ক্যাটাগরি</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.map((r) => (
                      <TableRow key={r.row} className={!r.valid ? "bg-destructive/5" : ""}>
                        <TableCell className="text-xs">{r.row}</TableCell>
                        <TableCell>
                          {r.valid ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <span className="text-xs text-destructive">{r.error}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.data.image_url ? (
                            <img src={r.data.image_url} alt="" className="h-8 w-8 rounded object-cover" />
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[150px]">{r.data.name || "—"}</TableCell>
                        <TableCell className="text-sm truncate max-w-[120px]">{r.data.brand || "—"}</TableCell>
                        <TableCell className="text-right text-sm">{r.valid ? r.data.price : "—"}</TableCell>
                        <TableCell className="text-xs">{r.data.price_unit || "—"}</TableCell>
                        <TableCell className="text-right text-sm">{r.valid ? r.data.stock : "—"}</TableCell>
                        <TableCell className="text-sm">{r.data.category || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {importResult && (
                <div className="rounded-md border bg-muted/50 p-3 text-sm">
                  <p>✅ সফল: {importResult.success} | ❌ ব্যর্থ: {importResult.failed}</p>
                </div>
              )}

              {!importResult && (
                <Button onClick={handleImport} disabled={importing || validCount === 0} className="w-full">
                  {importing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> ইম্পোর্ট হচ্ছে...</>
                  ) : (
                    <>{validCount} টি প্রোডাক্ট ইম্পোর্ট করুন</>
                  )}
                </Button>
              )}

              {importResult && (
                <Button variant="outline" onClick={() => { reset(); setOpen(false); }} className="w-full">
                  বন্ধ করুন
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExcelProductUpload;
