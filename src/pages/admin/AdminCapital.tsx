import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Search, Wallet, Send } from "lucide-react";
import { sendToCashBook } from "@/lib/cashbook";
import PrintExportButtons from "@/components/PrintExportButtons";
import type { PrintColumn } from "@/lib/printExport";
import BackButton from "@/components/BackButton";

interface CapitalEntry {
  id: string;
  amount: number;
  description: string | null;
  source: string | null;
  entry_date: string;
  notes: string | null;
  created_at: string;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });

const printColumns: PrintColumn[] = [
  { header: "Date", accessor: (r: any) => formatDate(r.entry_date) },
  { header: "Description", accessor: (r: any) => r.description || "-" },
  { header: "Source", accessor: (r: any) => r.source || "-" },
  { header: "Amount", accessor: (r: any) => `৳${Number(r.amount).toLocaleString()}` },
];

const AdminCapital = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    description: "",
    source: "",
    entry_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["capital_entries"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("capital_entries" as any) as any)
        .select("*")
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data as CapitalEntry[];
    },
  });

  const filtered = entries.filter((e) =>
    (e.description || "").toLowerCase().includes(search.toLowerCase()) ||
    (e.source || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalCapital = filtered.reduce((s, e) => s + Number(e.amount), 0);

  const addEntry = useMutation({
    mutationFn: async () => {
      if (!form.amount || parseFloat(form.amount) <= 0) throw new Error("Amount is required");
      const { error } = await (supabase.from("capital_entries" as any) as any).insert({
        amount: parseFloat(form.amount),
        description: form.description || null,
        source: form.source || null,
        entry_date: form.entry_date,
        notes: form.notes || null,
        created_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capital_entries"] });
      setShowAdd(false);
      setForm({ amount: "", description: "", source: "", entry_date: new Date().toISOString().split("T")[0], notes: "" });
      toast.success("পুঁজি এন্ট্রি যোগ হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("capital_entries" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capital_entries"] });
      toast.success("এন্ট্রি ডিলিট হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSendToCashBook = async (entry: CapitalEntry) => {
    try {
      await sendToCashBook({
        type: "cash_in",
        amount: Number(entry.amount),
        transaction_id: `CAP-${entry.id.slice(0, 8)}`,
        description: entry.description || "ব্যবসায়িক পুঁজি",
        category: "Capital",
        transaction_date: entry.entry_date,
        created_by: user?.id || null,
      });
      qc.invalidateQueries({ queryKey: ["cash_transactions"] });
      toast.success("Cash Book এ পাঠানো হয়েছে!");
    } catch (err: any) {
      toast.error(err.message || "Cash Book এ পাঠাতে ব্যর্থ");
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" /> ব্যবসায়িক পুঁজি
          </h1>
          <p className="text-sm text-muted-foreground">হাতে থাকা পুঁজি ট্র্যাক করুন</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">পুঁজি যোগ করুন</span><span className="sm:hidden">যোগ</span>
        </Button>
      </div>

      {/* Summary */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <div className="text-xs sm:text-sm text-muted-foreground">মোট পুঁজি (হাতে)</div>
          <div className="text-2xl sm:text-3xl font-bold text-primary">৳{totalCapital.toLocaleString()}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{filtered.length}টি এন্ট্রি</p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <PrintExportButtons title="Capital / পুঁজি" columns={printColumns} data={filtered} />
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">কোনো পুঁজি এন্ট্রি নেই</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {filtered.map((e) => (
              <div key={e.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{e.description || "পুঁজি"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(e.entry_date)}</p>
                    {e.source && <p className="text-[10px] text-muted-foreground">উৎস: {e.source}</p>}
                    {e.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{e.notes}</p>}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-semibold text-sm text-primary">৳{Number(e.amount).toLocaleString()}</p>
                    <div className="flex gap-0.5 justify-end mt-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" title="Send to Cash Book" onClick={() => handleSendToCashBook(e)}>
                        <Send className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => { if (confirm("ডিলিট করবেন?")) deleteEntry.mutate(e.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-lg border bg-muted/50 p-3 flex items-center justify-between font-bold text-sm">
              <span>মোট পুঁজি</span>
              <span className="text-primary">৳{totalCapital.toLocaleString()}</span>
            </div>
          </div>

          {/* Desktop table */}
          <Card className="hidden sm:block overflow-hidden shadow-xs">
            <CardContent className="pt-6">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">তারিখ</th>
                      <th className="pb-3 font-medium">বিবরণ</th>
                      <th className="pb-3 font-medium">উৎস</th>
                      <th className="pb-3 font-medium">নোট</th>
                      <th className="pb-3 font-medium text-right">পরিমাণ</th>
                      <th className="pb-3 w-[80px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e) => (
                      <tr key={e.id} className="border-b last:border-0">
                        <td className="py-3">{formatDate(e.entry_date)}</td>
                        <td className="py-3">{e.description || "-"}</td>
                        <td className="py-3">{e.source || "-"}</td>
                        <td className="py-3 text-muted-foreground text-xs">{e.notes || "-"}</td>
                        <td className="py-3 text-right font-semibold text-primary">৳{Number(e.amount).toLocaleString()}</td>
                        <td className="py-3">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Send to Cash Book" onClick={() => handleSendToCashBook(e)}>
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("ডিলিট করবেন?")) deleteEntry.mutate(e.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-bold">
                      <td className="py-3" colSpan={4}>মোট পুঁজি</td>
                      <td className="py-3 text-right text-primary">৳{totalCapital.toLocaleString()}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>পুঁজি যোগ করুন</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>পরিমাণ (৳) *</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label>বিবরণ</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="যেমন: নগদ পুঁজি, ব্যাংক থেকে" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>উৎস</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="যেমন: নিজস্ব, ঋণ" />
              </div>
              <div>
                <Label>তারিখ</Label>
                <Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>নোট</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ঐচ্ছিক নোট" />
            </div>
            <Button className="w-full" onClick={() => addEntry.mutate()} disabled={addEntry.isPending}>
              {addEntry.isPending ? "সেভ হচ্ছে..." : "পুঁজি যোগ করুন"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCapital;
