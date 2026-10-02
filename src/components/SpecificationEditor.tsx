import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export interface SpecRow {
  key: string;
  value: string;
}

interface SpecificationEditorProps {
  specs: SpecRow[];
  onChange: (specs: SpecRow[]) => void;
}

/** Parse an HTML specs table (prepended to description) back into SpecRow[] */
export function parseSpecsFromDescription(description: string | null): { specs: SpecRow[]; restDescription: string } {
  if (!description) return { specs: [], restDescription: "" };
  const match = description.match(/^<table[\s\S]*?<\/table>([\s\S]*)$/i);
  if (!match) return { specs: [], restDescription: description };

  const tableHtml = description.slice(0, description.indexOf(match[1]));
  const restDescription = match[1].trim();

  const specs: SpecRow[] = [];
  const rowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
  let m;
  while ((m = rowRegex.exec(tableHtml)) !== null) {
    const key = m[1].replace(/<[^>]*>/g, "").trim();
    const value = m[2].replace(/<[^>]*>/g, "").trim();
    if (key) specs.push({ key, value });
  }
  return { specs, restDescription };
}

/** Build an HTML specs table string from SpecRow[] */
export function buildSpecsTable(specs: SpecRow[]): string {
  if (specs.length === 0) return "";
  const rows = specs
    .filter(s => s.key.trim())
    .map(s => `<tr><td style="padding:6px 12px;border:1px solid #e5e7eb;width:40%">${s.key}</td><td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:500">${s.value}</td></tr>`)
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:16px"><tbody>${rows}</tbody></table>`;
}

const SpecificationEditor = ({ specs, onChange }: SpecificationEditorProps) => {
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Specifications</Label>
        <Button type="button" variant="outline" size="sm" onClick={addSpec}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>

      {specs.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Key</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Value</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {specs.map((spec, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-2 py-1.5">
                    <Input
                      value={spec.key}
                      onChange={(e) => updateSpec(i, "key", e.target.value)}
                      placeholder="e.g. Weight"
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={spec.value}
                      onChange={(e) => updateSpec(i, "value", e.target.value)}
                      placeholder="e.g. 500g"
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeSpec(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {specs.length === 0 && (
        <p className="text-xs text-muted-foreground">কোনো স্পেসিফিকেশন নেই। + Add বাটনে ক্লিক করে যোগ করুন।</p>
      )}
    </div>
  );
};

export default SpecificationEditor;
