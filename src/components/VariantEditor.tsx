import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export interface VariantRow {
  id?: string;
  variant_name: string;
  variant_value: string;
  price_adjustment: number;
  stock: number;
  sku: string;
}

interface VariantEditorProps {
  variants: VariantRow[];
  onChange: (variants: VariantRow[]) => void;
}

const COMMON_VARIANT_NAMES = ["Size", "Color", "Material", "Style", "Weight"];

const VariantEditor = ({ variants, onChange }: VariantEditorProps) => {
  const [newVariant, setNewVariant] = useState<VariantRow>({
    variant_name: "",
    variant_value: "",
    price_adjustment: 0,
    stock: 0,
    sku: "",
  });

  const addVariant = () => {
    if (!newVariant.variant_name.trim() || !newVariant.variant_value.trim()) return;
    onChange([...variants, { ...newVariant }]);
    setNewVariant({ variant_name: newVariant.variant_name, variant_value: "", price_adjustment: 0, stock: 0, sku: "" });
  };

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof VariantRow, value: string | number) => {
    const updated = [...variants];
    (updated[index] as any)[field] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        Variants
        <span className="text-xs text-muted-foreground font-normal">(Size, Color, etc.)</span>
      </Label>

      {/* Existing variants */}
      {variants.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {variants.map((v, i) => (
            <div key={i} className="rounded-md border p-2 bg-muted/30 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={v.variant_name}
                  onChange={(e) => updateVariant(i, "variant_name", e.target.value)}
                  placeholder="Type"
                  className="h-7 text-xs"
                />
                <Input
                  value={v.variant_value}
                  onChange={(e) => updateVariant(i, "variant_value", e.target.value)}
                  placeholder="Value"
                  className="h-7 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={v.price_adjustment}
                  onChange={(e) => updateVariant(i, "price_adjustment", Number(e.target.value))}
                  placeholder="Price +/-"
                  className="h-7 text-xs flex-1"
                />
                <Input
                  type="number"
                  value={v.stock}
                  onChange={(e) => updateVariant(i, "stock", Number(e.target.value))}
                  placeholder="Stock"
                  className="h-7 text-xs flex-1"
                />
                <Input
                  value={v.sku}
                  onChange={(e) => updateVariant(i, "sku", e.target.value)}
                  placeholder="SKU"
                  className="h-7 text-xs flex-1"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeVariant(i)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new variant */}
      <div className="rounded-md border p-3 space-y-2 bg-card">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Type</Label>
            <Input
              value={newVariant.variant_name}
              onChange={(e) => setNewVariant({ ...newVariant, variant_name: e.target.value })}
              placeholder="e.g. Size"
              list="variant-name-suggestions"
              className="h-8 text-sm"
            />
            <datalist id="variant-name-suggestions">
              {COMMON_VARIANT_NAMES.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <Input
              value={newVariant.variant_value}
              onChange={(e) => setNewVariant({ ...newVariant, variant_value: e.target.value })}
              placeholder="e.g. XL, Red"
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Price +/-</Label>
            <Input
              type="number"
              value={newVariant.price_adjustment}
              onChange={(e) => setNewVariant({ ...newVariant, price_adjustment: Number(e.target.value) })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Stock</Label>
            <Input
              type="number"
              value={newVariant.stock}
              onChange={(e) => setNewVariant({ ...newVariant, stock: Number(e.target.value) })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">SKU</Label>
            <Input
              value={newVariant.sku}
              onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
              placeholder="Optional"
              className="h-8 text-sm"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1"
          onClick={addVariant}
          disabled={!newVariant.variant_name.trim() || !newVariant.variant_value.trim()}
        >
          <Plus className="h-3.5 w-3.5" /> Add Variant
        </Button>
      </div>
    </div>
  );
};

export default VariantEditor;
