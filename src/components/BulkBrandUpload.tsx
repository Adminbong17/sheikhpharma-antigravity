import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ParsedBrand {
  name: string;
  status: string;
}

interface BulkBrandUploadProps {
  onComplete: () => void;
}

const BulkBrandUpload = ({ onComplete }: BulkBrandUploadProps) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedBrand[]>([]);
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

        const parsed: ParsedBrand[] = json
          .filter((r) => {
            const name = String(r["Brand"] || r["brand"] || r["Name"] || r["name"] || r["Brand Name"] || r["brand_name"] || "").trim();
            return name.length > 0;
          })
          .map((r) => {
            const name = String(r["Brand"] || r["brand"] || r["Name"] || r["name"] || r["Brand Name"] || r["brand_name"] || "").trim();
            const status = String(r["Status"] || r["status"] || "approved").trim().toLowerCase();
            return { name, status: ["approved", "pending", "rejected"].includes(status) ? status : "approved" };
          });

        // Deduplicate
        const seen = new Set<string>();
        const unique = parsed.filter((p) => {
          const key = p.name.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setRows(unique);
        if (unique.length === 0) toast.error("No valid brand names found");
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
      const { data: existing } = await supabase.from("brands").select("name");
      const existingSet = new Set((existing || []).map((b) => b.name.toLowerCase()));

      const newBrands = rows.filter((r) => !existingSet.has(r.name.toLowerCase()));
      const skipped = rows.length - newBrands.length;

      if (newBrands.length > 0) {
        // Insert in batches of 50
        for (let i = 0; i < newBrands.length; i += 50) {
          const batch = newBrands.slice(i, i + 50).map((b) => ({ name: b.name, status: b.status }));
          const { error } = await supabase.from("brands").insert(batch);
          if (error) throw error;
        }
      }

      toast.success(`${newBrands.length} নতুন ব্র্যান্ড তৈরি হয়েছে${skipped > 0 ? `, ${skipped}টি আগে থেকেই ছিল` : ""}`);
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
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Brands</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              CSV/Excel ফাইল আপলোড করুন। কলাম: <strong>Brand</strong> বা <strong>Name</strong>, <strong>Status</strong> (optional)
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
              <p className="text-sm font-medium">{rows.length} unique brands found</p>
              <div className="rounded-lg border max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand Name</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 50).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell><Badge variant={r.status === "approved" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 50 && <p className="text-xs text-muted-foreground">Showing first 50 of {rows.length}</p>}
              <Button onClick={handleUpload} disabled={uploading} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "আপলোড হচ্ছে..." : `Upload ${rows.length} brands`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkBrandUpload;
