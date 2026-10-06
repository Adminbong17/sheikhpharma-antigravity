import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";

type Submission = {
  id: string;
  link_id: string;
  name: string | null;
  phone: string | null;
  phone_verified: boolean;
  data: Record<string, string> | null;
  created_at: string;
  payment_links?: { title: string; token: string } | null;
};

const AdminFormSubmissions = () => {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("payment_link_submissions" as any) as any)
      .select("*, payment_links(title, token)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setRows((data as Submission[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("এই তথ্যটি ডিলিট করবেন?")) return;
    const { error } = await (supabase.from("payment_link_submissions" as any) as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে");
    load();
  };

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const hay = [r.name, r.phone, r.payment_links?.title, JSON.stringify(r.data || {})].join(" ").toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  const exportCsv = () => {
    const keys = Array.from(new Set(filtered.flatMap((r) => Object.keys(r.data || {}))));
    const header = ["তারিখ", "লিংক", "নাম", "মোবাইল", "যাচাই", ...keys];
    const lines = filtered.map((r) => [
      new Date(r.created_at).toLocaleString("bn-BD"),
      r.payment_links?.title || "",
      r.name || "",
      r.phone || "",
      r.phone_verified ? "হ্যাঁ" : "না",
      ...keys.map((k) => (r.data || {})[k] || ""),
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `form-submissions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Form Submissions</h1>
          <p className="text-sm text-muted-foreground">ফর্ম মোডের লিংক থেকে জমা পড়া তথ্য</p>
        </div>
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="সার্চ..." className="w-48" />
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> CSV</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">মোট ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">কোনো তথ্য জমা পড়েনি</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>লিংক</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>মোবাইল</TableHead>
                  <TableHead>তথ্য</TableHead>
                  <TableHead className="text-right">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("bn-BD")}
                    </TableCell>
                    <TableCell className="text-xs">{r.payment_links?.title || "—"}</TableCell>
                    <TableCell>{r.name || "—"}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {r.phone || "—"}
                        {r.phone_verified && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(r.data || {}).map(([k, v]) => (
                          <Badge key={k} variant="secondary" className="font-normal">
                            {k}: {String(v)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFormSubmissions;
