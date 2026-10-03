import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, SlidersHorizontal } from "lucide-react";

export interface SpecRow {
  key: string;
  value: string;
}

interface SpecificationEditorProps {
  specs: SpecRow[];
  onChange: (specs: SpecRow[]) => void;
}

/** Parse an HTML specs table (prepended to description) back into SpecRow[] */
export function parseSpecsFromDescription(description: string | null | undefined): { specs: SpecRow[]; restDescription: string } {
  if (!description || !description.trim()) return { specs: [], restDescription: "" };
  
  const tableMatch = description.match(/^\s*(<table[\s\S]*?<\/table>)([\s\S]*)$/i);
  if (!tableMatch) return { specs: [], restDescription: description.trim() };

  const tableHtml = tableMatch[1];
  const restDescription = tableMatch[2].trim();

  const specs: SpecRow[] = [];
  const rowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRegex.exec(tableHtml)) !== null) {
    const key = m[1].replace(/<[^>]+>/g, "").trim();
    const value = m[2].replace(/<[^>]+>/g, "").trim();
    if (key || value) specs.push({ key, value });
  }
  return { specs, restDescription };
}

/** Build an HTML specs table string from SpecRow[] */
export function buildSpecsTable(specs: SpecRow[]): string {
  const validSpecs = specs.filter(s => s.key.trim() || s.value.trim());
  if (validSpecs.length === 0) return "";
  
  const rows = validSpecs
    .map(s => `<tr><td style="padding:8px 14px;border:1px solid #e2e8f0;width:35%;font-weight:600;color:#334155;background-color:#f8fafc">${s.key.trim()}</td><td style="padding:8px 14px;border:1px solid #e2e8f0;font-weight:500;color:#0f172a">${s.value.trim()}</td></tr>`)
    .join("\n");
    
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:20px;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0"><tbody>\n${rows}\n</tbody></table>\n\n`;
}

const SpecificationEditor: React.FC<SpecificationEditorProps> = ({ specs, onChange }) => {
  const addSpec = () => {
    onChange([...specs, { key: "", value: "" }]);
  };

  const updateSpec = (index: number, field: "key" | "value", val: string) => {
    const updated = specs.map((s, i) => i === index ? { ...s, [field]: val } : s);
    onChange(updated);
  };

  const removeSpec = (index: number) => {
    onChange(specs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <Label className="text-sm font-bold text-foreground">
            পণ্যের বৈশিষ্ট্য ও স্পেসিফিকেশন (Product Specifications)
          </Label>
        </div>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={addSpec}
          className="text-xs h-7 px-2.5 gap-1 border-dashed"
        >
          <Plus className="h-3.5 w-3.5" />
          স্পেসিফিকেশন যোগ করুন
        </Button>
      </div>

      {specs.length > 0 ? (
        <div className="rounded-lg border overflow-hidden bg-background">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/60 border-b">
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-2/5">
                  বৈশিষ্ট্যের নাম (Key / Feature)
                </th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                  মান / বিবরণ (Value / Detail)
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {specs.map((spec, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="p-2">
                    <Input
                      value={spec.key}
                      onChange={(e) => updateSpec(i, "key", e.target.value)}
                      placeholder="যেমন: Dosage Form, Strength, Pack Size..."
                      className="h-8 text-xs bg-background"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={spec.value}
                      onChange={(e) => updateSpec(i, "value", e.target.value)}
                      placeholder="যেমন: Tablet, 500 mg, 10x10 Strips..."
                      className="h-8 text-xs bg-background"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive hover:bg-destructive/10" 
                      onClick={() => removeSpec(i)}
                      title="মুছুন"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          কোনো অতিরিক্ত স্পেসিফিকেশন যোগ করা হয়নি। উপরের "+ স্পেসিফিকেশন যোগ করুন" বাটনে ক্লিক করে যোগ করতে পারেন।
        </p>
      )}
    </div>
  );
};

export default SpecificationEditor;
