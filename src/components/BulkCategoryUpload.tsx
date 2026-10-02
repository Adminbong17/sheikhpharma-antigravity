import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ParsedRow {
  category: string;
  subcategory?: string;
  slug?: string;
  subSlug?: string;
  sortOrder?: number;
}

interface BulkCategoryUploadProps {
  onComplete: () => void;
}

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, "-").replace(/(^-|-$)/g, "");

const BulkCategoryUpload = ({ onComplete }: BulkCategoryUploadProps) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const parsed: ParsedRow[] = json
          .filter((r) => {
            const cat = String(r["Category"] || r["category"] || r["Name"] || r["name"] || "").trim();
            return cat.length > 0;
          })
          .map((r) => {
            const category = String(r["Category"] || r["category"] || r["Name"] || r["name"] || "").trim();
            const subcategory = String(r["Subcategory"] || r["subcategory"] || r["Sub Category"] || r["sub_category"] || "").trim() || undefined;
            const slug = String(r["Slug"] || r["slug"] || "").trim() || undefined;
            const subSlug = String(r["Sub Slug"] || r["sub_slug"] || r["Subcategory Slug"] || "").trim() || undefined;
            const sortOrder = Number(r["Sort Order"] || r["sort_order"] || r["Order"] || 0) || 0;
            return { category, subcategory, slug, subSlug, sortOrder };
          });

        setRows(parsed);
        if (parsed.length === 0) toast.error("No valid rows found in file");
      } catch {
        toast.error("Failed to parse file");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (rows.length === 0) return;
    setUploading(true);

    try {
      // Get existing categories
      const { data: existingCats } = await supabase.from("categories").select("id, name, slug");
      const catMap = new Map((existingCats || []).map((c) => [c.name.toLowerCase(), c]));

      // Get existing subcategories
      const { data: existingSubs } = await supabase.from("subcategories").select("id, name, slug, category_id");
      const subMap = new Map((existingSubs || []).map((s) => [`${s.category_id}:${s.name.toLowerCase()}`, s]));

      // Unique categories from rows
      const uniqueCats = [...new Set(rows.map((r) => r.category))];
      let newCatCount = 0;
      let newSubCount = 0;

      // Create missing categories
      for (const catName of uniqueCats) {
        if (!catMap.has(catName.toLowerCase())) {
          const row = rows.find((r) => r.category === catName);
          const slug = row?.slug || generateSlug(catName);
          const { data, error } = await supabase
            .from("categories")
            .insert({ name: catName, slug, sort_order: row?.sortOrder || 0 })
            .select()
            .single();
          if (error) {
            console.error("Cat insert error:", error.message);
            continue;
          }
          catMap.set(catName.toLowerCase(), data);
          newCatCount++;
        }
      }

      // Create missing subcategories
      for (const row of rows) {
        if (!row.subcategory) continue;
        const cat = catMap.get(row.category.toLowerCase());
        if (!cat) continue;
        const key = `${cat.id}:${row.subcategory.toLowerCase()}`;
        if (!subMap.has(key)) {
          const slug = row.subSlug || generateSlug(row.subcategory);
          const { error } = await supabase
            .from("subcategories")
            .insert({ name: row.subcategory, slug, category_id: cat.id, sort_order: row.sortOrder || 0 });
          if (error) {
            console.error("Sub insert error:", error.message);
            continue;
          }
          subMap.set(key, { id: "", name: row.subcategory, slug, category_id: cat.id });
          newSubCount++;
        }
      }

      toast.success(`আপলোড সম্পন্ন! ${newCatCount} নতুন ক্যাটাগরি, ${newSubCount} নতুন সাব-ক্যাটাগরি তৈরি হয়েছে।`);
      setOpen(false);
      setRows([]);
      if (fileRef.current) fileRef.current.value = "";
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setRows([]); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Categories & Subcategories</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              CSV/Excel ফাইল আপলোড করুন। কলাম: <strong>Category</strong>, <strong>Subcategory</strong> (optional), <strong>Slug</strong> (optional), <strong>Sort Order</strong> (optional)
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFile}
              className="text-sm"
            />
          </div>

          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{rows.length} rows found</p>
                <Badge variant="secondary">
                  {new Set(rows.map((r) => r.category)).size} categories, {rows.filter((r) => r.subcategory).length} subcategories
                </Badge>
              </div>
              <div className="rounded-lg border max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Subcategory</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 50).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.category}</TableCell>
                        <TableCell>{r.subcategory || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{r.slug || generateSlug(r.category)}</TableCell>
                        <TableCell>{r.sortOrder || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 50 && <p className="text-xs text-muted-foreground">Showing first 50 of {rows.length} rows</p>}
              <Button onClick={handleUpload} disabled={uploading} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "আপলোড হচ্ছে..." : `Upload ${rows.length} rows`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkCategoryUpload;
