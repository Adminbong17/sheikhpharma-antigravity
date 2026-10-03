import React, { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Stethoscope, 
  FlaskConical, 
  Pill, 
  AlertTriangle, 
  ShieldAlert, 
  Ban, 
  FileText, 
  Plus, 
  Trash2, 
  Code2, 
  Eye, 
  Layers 
} from "lucide-react";

export interface CustomMedicalSection {
  id: string;
  title: string;
  content: string;
}

const STANDARD_SECTIONS = [
  { key: "composition", title: "Composition (উপাদান ও মাত্রা)", icon: FlaskConical, placeholder: "যেমন: Each tablet contains Paracetamol USP 500 mg..." },
  { key: "indications", title: "Indications (নির্দেশনা / কোন রোগের জন্য)", icon: Stethoscope, placeholder: "যেমন: জ্বর, মাথা ব্যথা, সর্দি ও শরীর ব্যথার চিকিৎসায় নির্দেশিত..." },
  { key: "dosage", title: "Dosage & Administration (সেবনবিধি ও মাত্রা)", icon: Pill, placeholder: "যেমন: প্রাপ্তবয়স্ক: ১-২টি ট্যাবলেট দিনে ৩-৪ বার খাবারের পর..." },
  { key: "side_effects", title: "Side Effects (পার্শ্বপ্রতিক্রিয়া)", icon: AlertTriangle, placeholder: "যেমন: সাধারণ মাত্রায় কোনো পার্শ্বপ্রতিক্রিয়া দেখা যায় না..." },
  { key: "pharmacology", title: "Pharmacology (কার্যপদ্ধতি)", icon: FlaskConical, placeholder: "যেমন: এটি প্রোস্টাগ্ল্যান্ডিন সংশ্লেষণ রোধ করে ব্যথা ও জ্বর উপশম করে..." },
  { key: "precautions", title: "Precautions & Warnings (সতর্কতা ও সাবধানতা)", icon: ShieldAlert, placeholder: "যেমন: লিভার বা কিডনি রোগীদের ক্ষেত্রে চিকিৎসকের পরামর্শ নিন..." },
  { key: "contraindications", title: "Contraindications (কাদের জন্য নিষিদ্ধ)", icon: Ban, placeholder: "যেমন: প্যারাসিটামলের প্রতি অতিসংবেদনশীল রোগীদের ক্ষেত্রে নিষিদ্ধ..." },
];

/**
 * Converts raw HTML description into individual structured text sections without any HTML tags.
 */
export function parseDescriptionToSections(htmlDescription: string | null | undefined): {
  standardSections: Record<string, string>;
  customSections: CustomMedicalSection[];
  generalDescription: string;
} {
  const standard: Record<string, string> = {
    composition: "",
    indications: "",
    dosage: "",
    side_effects: "",
    pharmacology: "",
    precautions: "",
    contraindications: "",
  };
  const custom: CustomMedicalSection[] = [];
  let general = "";

  if (!htmlDescription || !htmlDescription.trim()) {
    return { standardSections: standard, customSections: custom, generalDescription: general };
  }

  // Helper to strip HTML and preserve clean line breaks
  const cleanHtmlToText = (html: string): string => {
    return html
      .replace(/<br\s*[\/]?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/gi, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  // Check for <section class="product-section">
  const sectionRegex = /<section[^>]*class=["']product-section["'][^>]*>\s*<h3[^>]*>([\s\S]*?)<\/h3>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/section>/gi;
  let hasSections = false;
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(htmlDescription)) !== null) {
    hasSections = true;
    const rawTitle = match[1].replace(/<[^>]+>/g, "").trim();
    const rawBody = match[2];
    const textContent = cleanHtmlToText(rawBody);

    const lowerTitle = rawTitle.toLowerCase().trim();

    // IMPORTANT: Check Contraindications BEFORE Indications because "contraindications" includes the substring "indication"!
    if (
      lowerTitle.includes("contraindicat") || 
      lowerTitle.includes("contra-indicat") || 
      lowerTitle.includes("নিষিদ্ধ") || 
      lowerTitle.includes("প্রতিনির্দেশনা") || 
      lowerTitle.includes("বিরোধিতা")
    ) {
      standard.contraindications = textContent;
    } else if (
      lowerTitle.includes("composition") || 
      lowerTitle.includes("উপাদান") || 
      lowerTitle.includes("ingredient")
    ) {
      standard.composition = textContent;
    } else if (
      lowerTitle.includes("indication") || 
      lowerTitle.includes("নির্দেশনা") || 
      lowerTitle.includes("therapeutic") || 
      lowerTitle.includes("uses")
    ) {
      standard.indications = textContent;
    } else if (
      lowerTitle.includes("dosage") || 
      lowerTitle.includes("administration") || 
      lowerTitle.includes("সেবনবিধি") || 
      lowerTitle.includes("মাত্রা") ||
      lowerTitle.includes("ব্যবহারবিধি")
    ) {
      standard.dosage = textContent;
    } else if (
      lowerTitle.includes("side effect") || 
      lowerTitle.includes("adverse") || 
      lowerTitle.includes("পার্শ্বপ্রতিক্রিয়া") ||
      lowerTitle.includes("পার্শ্ব প্রতিক্রিয়া")
    ) {
      standard.side_effects = textContent;
    } else if (
      lowerTitle.includes("pharmacolog") || 
      lowerTitle.includes("কার্যপদ্ধতি") || 
      lowerTitle.includes("mode of action") ||
      lowerTitle.includes("mechanism")
    ) {
      standard.pharmacology = textContent;
    } else if (
      lowerTitle.includes("precaution") || 
      lowerTitle.includes("warning") || 
      lowerTitle.includes("সতর্কতা") ||
      lowerTitle.includes("সাবধানতা")
    ) {
      standard.precautions = textContent;
    } else if (
      lowerTitle === "description" || 
      lowerTitle === "বিবরণ" || 
      lowerTitle === "general notes" ||
      lowerTitle === "general"
    ) {
      general = textContent;
    } else {
      custom.push({ 
        id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, 
        title: rawTitle, 
        content: textContent 
      });
    }
  }

  if (!hasSections) {
    general = cleanHtmlToText(htmlDescription);
  }

  return { standardSections: standard, customSections: custom, generalDescription: general };
}

/**
 * Builds clean HTML from individual text fields, properly formatting line breaks and spaces.
 */
export function buildDescriptionFromSections(
  standard: Record<string, string>,
  custom: CustomMedicalSection[],
  general: string
): string {
  const sectionsHtml: string[] = [];

  const textToHtmlDiv = (text: string): string => {
    return text
      .trim()
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join("<br>\n");
  };

  // Standard Sections
  if (standard.composition?.trim()) {
    sectionsHtml.push(
      `<section class="product-section"><h3>Composition</h3><div>${textToHtmlDiv(standard.composition)}</div></section>`
    );
  }
  if (standard.indications?.trim()) {
    sectionsHtml.push(
      `<section class="product-section"><h3>Indications</h3><div>${textToHtmlDiv(standard.indications)}</div></section>`
    );
  }
  if (standard.pharmacology?.trim()) {
    sectionsHtml.push(
      `<section class="product-section"><h3>Pharmacology</h3><div>${textToHtmlDiv(standard.pharmacology)}</div></section>`
    );
  }
  if (standard.dosage?.trim()) {
    sectionsHtml.push(
      `<section class="product-section"><h3>Dosage & Administration</h3><div>${textToHtmlDiv(standard.dosage)}</div></section>`
    );
  }
  if (standard.side_effects?.trim()) {
    sectionsHtml.push(
      `<section class="product-section"><h3>Side Effects</h3><div>${textToHtmlDiv(standard.side_effects)}</div></section>`
    );
  }
  if (standard.precautions?.trim()) {
    sectionsHtml.push(
      `<section class="product-section"><h3>Precautions & Warnings</h3><div>${textToHtmlDiv(standard.precautions)}</div></section>`
    );
  }
  if (standard.contraindications?.trim()) {
    sectionsHtml.push(
      `<section class="product-section"><h3>Contraindications</h3><div>${textToHtmlDiv(standard.contraindications)}</div></section>`
    );
  }

  // Custom Sections
  for (const c of custom) {
    if (c.title?.trim() && c.content?.trim()) {
      sectionsHtml.push(
        `<section class="product-section"><h3>${c.title.trim()}</h3><div>${textToHtmlDiv(c.content)}</div></section>`
      );
    }
  }

  // General Description
  if (general?.trim()) {
    if (sectionsHtml.length === 0) {
      return textToHtmlDiv(general);
    } else {
      sectionsHtml.push(
        `<section class="product-section"><h3>Description</h3><div>${textToHtmlDiv(general)}</div></section>`
      );
    }
  }

  return sectionsHtml.join("\n");
}

interface Props {
  value: string;
  onChange: (htmlValue: string) => void;
}

export const MedicalSectionEditor: React.FC<Props> = ({ value, onChange }) => {
  // Initialize state with parsed contents from `value` immediately on mount
  const [standard, setStandard] = useState<Record<string, string>>(() => parseDescriptionToSections(value).standardSections);
  const [custom, setCustom] = useState<CustomMedicalSection[]>(() => parseDescriptionToSections(value).customSections);
  const [general, setGeneral] = useState<string>(() => parseDescriptionToSections(value).generalDescription);
  const [mode, setMode] = useState<"fields" | "raw">("fields");
  const [rawHtml, setRawHtml] = useState<string>(value || "");
  
  // Track last serialized HTML so we know if `value` was changed by external parent (e.g. loading a product in openEdit)
  const lastSerializedHtmlRef = useRef<string | null>(value || null);

  // Sync state only when external `value` prop changes from outside
  useEffect(() => {
    if (lastSerializedHtmlRef.current === null || value !== lastSerializedHtmlRef.current) {
      const parsed = parseDescriptionToSections(value);
      setStandard(parsed.standardSections);
      setCustom(parsed.customSections);
      setGeneral(parsed.generalDescription);
      setRawHtml(value || "");
      lastSerializedHtmlRef.current = value || "";
    }
  }, [value]);

  const emitChanges = (
    newStd: Record<string, string>, 
    newCustom: CustomMedicalSection[], 
    newGeneral: string
  ) => {
    const html = buildDescriptionFromSections(newStd, newCustom, newGeneral);
    lastSerializedHtmlRef.current = html;
    setRawHtml(html);
    onChange(html);
  };

  const updateStandard = (key: string, content: string) => {
    const newStd = { ...standard, [key]: content };
    setStandard(newStd);
    emitChanges(newStd, custom, general);
  };

  const updateCustom = (id: string, field: "title" | "content", val: string) => {
    const newCustom = custom.map(c => c.id === id ? { ...c, [field]: val } : c);
    setCustom(newCustom);
    emitChanges(standard, newCustom, general);
  };

  const addCustomSection = () => {
    const newSection: CustomMedicalSection = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: "",
      content: "",
    };
    setCustom(prev => [...prev, newSection]);
  };

  const removeCustomSection = (id: string) => {
    const newCustom = custom.filter(c => c.id !== id);
    setCustom(newCustom);
    emitChanges(standard, newCustom, general);
  };

  const updateGeneral = (text: string) => {
    setGeneral(text);
    emitChanges(standard, custom, text);
  };

  const handleRawHtmlChange = (raw: string) => {
    setRawHtml(raw);
    lastSerializedHtmlRef.current = raw;
    onChange(raw);
    const parsed = parseDescriptionToSections(raw);
    setStandard(parsed.standardSections);
    setCustom(parsed.customSections);
    setGeneral(parsed.generalDescription);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
        <div>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            মেডিকেল বিবরণ ও সেবনবিধি (Medical Description)
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            নিচের ঘরগুলোতে সাধারণ লেখার মতো লিখুন। কোনো HTML কোড লিখতে হবে না, প্যারাগ্রাফ ও লাইন ব্রেক স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে।
          </p>
        </div>

        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md text-xs self-start sm:self-auto shrink-0">
          <Button
            type="button"
            variant={mode === "fields" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("fields")}
            className="h-7 text-xs px-2.5"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            সহজ ফর্ম (Easy)
          </Button>
          <Button
            type="button"
            variant={mode === "raw" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("raw")}
            className="h-7 text-xs px-2.5"
          >
            <Code2 className="h-3.5 w-3.5 mr-1" />
            HTML কোড
          </Button>
        </div>
      </div>

      {mode === "raw" ? (
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Raw HTML কোড এডিটর:</Label>
          <Textarea
            value={rawHtml}
            onChange={(e) => handleRawHtmlChange(e.target.value)}
            rows={12}
            className="font-mono text-xs leading-relaxed"
            placeholder="<section class='product-section'>..."
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STANDARD_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const val = standard[sec.key] || "";
              return (
                <div 
                  key={sec.key} 
                  className={`space-y-1.5 p-3 rounded-lg border transition-all ${
                    val.trim() ? "bg-primary/[0.03] border-primary/30" : "bg-muted/10 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{sec.title}</span>
                    </Label>
                    {val.trim() && (
                      <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-950/40 px-1.5 py-0.2 rounded font-medium shrink-0">
                        ✓ তথ্য আছে
                      </span>
                    )}
                  </div>
                  <Textarea
                    value={val}
                    onChange={(e) => updateStandard(sec.key, e.target.value)}
                    placeholder={sec.placeholder}
                    rows={3}
                    className="text-xs leading-relaxed resize-y bg-background"
                  />
                </div>
              );
            })}

            {/* General / Other Notes (Spans cleanly as 8th item in 2 cols grid) */}
            <div className={`space-y-1.5 p-3 rounded-lg border transition-all ${
              general.trim() ? "bg-primary/[0.03] border-primary/30" : "bg-muted/10 border-border"
            }`}>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>General Notes (অন্যান্য সাধারণ বিবরণ)</span>
                </Label>
                {general.trim() && (
                  <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-950/40 px-1.5 py-0.2 rounded font-medium shrink-0">
                    ✓ তথ্য আছে
                  </span>
                )}
              </div>
              <Textarea
                value={general}
                onChange={(e) => updateGeneral(e.target.value)}
                placeholder="ওষুধ বা পণ্যের অতিরিক্ত কোনো তথ্য বা সাধারণ নোট থাকলে এখানে লিখুন..."
                rows={3}
                className="text-xs leading-relaxed bg-background"
              />
            </div>
          </div>

          {/* Custom Sections */}
          {custom.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <h5 className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                অতিরিক্ত কাস্টম সেকশন সমূহ:
              </h5>
              <div className="space-y-3">
                {custom.map((c) => (
                  <div key={c.id} className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="সেকশনের নাম (যেমন: Storage Condition, Special Note)"
                        value={c.title}
                        onChange={(e) => updateCustom(c.id, "title", e.target.value)}
                        className="h-8 text-xs font-semibold max-w-sm bg-background"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomSection(c.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 ml-auto shrink-0"
                        title="সেকশন ডিলিট করুন"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder="এই সেকশনের বিস্তারিত বিবরণ লিখুন..."
                      value={c.content}
                      onChange={(e) => updateCustom(c.id, "content", e.target.value)}
                      rows={2}
                      className="text-xs leading-relaxed bg-background"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-start pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomSection}
              className="text-xs gap-1.5 border-dashed"
            >
              <Plus className="h-3.5 w-3.5" />
              নতুন কাস্টম সেকশন যোগ করুন (Add Custom Section)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalSectionEditor;
