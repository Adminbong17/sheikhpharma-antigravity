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

interface CsvRow {
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  stock: number;
  category?: string;
  subcategory?: string;
  image_url?: string;
  sku?: string;
}

interface ParseResult {
  row: number;
  data: CsvRow;
  valid: boolean;
  error?: string;
}

const REQUIRED_COLUMNS = ["name", "price", "stock"];
const OPTIONAL_COLUMNS = ["description", "original_price", "category", "subcategory", "image_url", "sku"];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

const generateSKU = () => {
  const prefix = "SKU";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; continue; }
      current += char;
    }
    values.push(current.trim());
    return values;
  });
  return { headers, rows };
}

function validateRow(headers: string[], values: string[], rowIndex: number): ParseResult {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => { obj[h] = values[i] || ""; });

  const name = obj["name"]?.trim();
  const price = parseFloat(obj["price"]);
  const stock = parseInt(obj["stock"], 10);

  if (!name) return { row: rowIndex, data: {} as CsvRow, valid: false, error: "নাম খালি" };
  if (isNaN(price) || price <= 0) return { row: rowIndex, data: {} as CsvRow, valid: false, error: "মূল্য সঠিক নয়" };
  if (isNaN(stock) || stock < 0) return { row: rowIndex, data: {} as CsvRow, valid: false, error: "স্টক সঠিক নয়" };

  const originalPrice = obj["original_price"] ? parseFloat(obj["original_price"]) : undefined;

  return {
    row: rowIndex,
    valid: true,
    data: {
      name,
      description: obj["description"]?.trim() || undefined,
      price,
      original_price: originalPrice && !isNaN(originalPrice) ? originalPrice : undefined,
      stock,
      category: obj["category"]?.trim() || undefined,
      image_url: obj["image_url"]?.trim() || undefined,
      sku: obj["sku"]?.trim() || undefined,
    },
  };
}

interface Props {
  onComplete: () => void;
}

const CsvProductUpload = ({ onComplete }: Props) => {
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
    if (!file.name.endsWith(".csv")) { toast.error("শুধুমাত্র CSV ফাইল সাপোর্ট করে"); return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCsvText(text);

      const missingRequired = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
      if (missingRequired.length > 0) {
        toast.error(`প্রয়োজনীয় কলাম পাওয়া যায়নি: ${missingRequired.join(", ")}`);
        return;
      }

      const results = rows.map((values, i) => validateRow(headers, values, i + 2));
      setParsed(results);
      setImportResult(null);

      const validCount = results.filter((r) => r.valid).length;
      const invalidCount = results.filter((r) => !r.valid).length;
      toast.info(`${validCount} টি সঠিক, ${invalidCount} টি ত্রুটিপূর্ণ রো পাওয়া গেছে`);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validRows = parsed.filter((r) => r.valid);
    if (validRows.length === 0) { toast.error("কোনো সঠিক রো নেই"); return; }

    setImporting(true);
    let success = 0;
    let failed = 0;

    // Batch insert in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < validRows.length; i += chunkSize) {
      const chunk = validRows.slice(i, i + chunkSize);
      const payload = chunk.map((r) => ({
        name: r.data.name,
        description: r.data.description || null,
        price: r.data.price,
        original_price: r.data.original_price || null,
        stock: r.data.stock,
        category: r.data.category || null,
        subcategory: r.data.subcategory || null,
        image_url: r.data.image_url || null,
        sku: r.data.sku || generateSKU(),
      }));

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
      logActivity({ action: "csv_product_import", details: `Imported ${success} products via CSV`, entity_type: "product" });
      onComplete();
    }
    if (failed > 0) {
      toast.error(`${failed} টি প্রোডাক্ট যোগ করা যায়নি`);
    }
  };

  const downloadSample = () => {
    const header = ALL_COLUMNS.join(",");
    const sample1 = 'Sample Product 1,This is a description,500,600,10,electronics,,';
    const sample2 = 'Sample Product 2,Another product,1200,,25,clothing,,';
    const csv = [header, sample1, sample2].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsed.filter((r) => r.valid).length;
  const invalidCount = parsed.filter((r) => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CSV দিয়ে প্রোডাক্ট আপলোড</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="rounded-md border bg-muted/50 p-3 space-y-2">
            <p className="text-sm font-medium">CSV ফাইলে নিচের কলামগুলো থাকতে হবে:</p>
            <div className="flex flex-wrap gap-1.5">
              {REQUIRED_COLUMNS.map((c) => (
                <Badge key={c} variant="default" className="text-xs">{c} *</Badge>
              ))}
              {OPTIONAL_COLUMNS.map((c) => (
                <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">* চিহ্নিত কলামগুলো আবশ্যক। প্রথম রো হবে কলামের নাম।</p>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={downloadSample}>
              <Download className="mr-1 h-3 w-3" /> নমুনা CSV ডাউনলোড করুন
            </Button>
          </div>

          {/* File input */}
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-4 py-3 text-sm text-muted-foreground hover:bg-muted transition-colors">
            <Upload className="h-4 w-4" />
            CSV ফাইল নির্বাচন করুন
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
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
                      <TableHead>নাম</TableHead>
                      <TableHead className="text-right">মূল্য</TableHead>
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
                        <TableCell className="text-sm truncate max-w-[150px]">{r.data.name || "—"}</TableCell>
                        <TableCell className="text-right text-sm">{r.valid ? r.data.price : "—"}</TableCell>
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

export default CsvProductUpload;
