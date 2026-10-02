import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { logActivity } from "@/lib/logActivity";
import PrintExportButtons from "@/components/PrintExportButtons";
import type { PrintColumn } from "@/lib/printExport";
import BackButton from "@/components/BackButton";

const AdminCurrencies = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ code: "", name: "", symbol: "", exchange_rate: "1", is_default: false, is_active: true });
  const [searchQuery, setSearchQuery] = useState("");

  const { data: currencies = [], isLoading } = useQuery({
    queryKey: ["admin-currencies"],
    queryFn: async () => {
      const { data } = await supabase.from("currencies").select("*").order("is_default", { ascending: false });
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.toUpperCase(),
        name: form.name,
        symbol: form.symbol,
        exchange_rate: parseFloat(form.exchange_rate),
        is_default: form.is_default,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from("currencies").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("currencies").insert(payload);
        if (error) throw error;
      }
      if (form.is_default && editing?.id) {
        await supabase.from("currencies").update({ is_default: false }).neq("id", editing.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-currencies"] });
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      toast({ title: editing ? "Currency updated" : "Currency added" });
      logActivity({ action: editing ? "currency_updated" : "currency_created", details: `Currency: ${form.code}`, entity_type: "currency" });
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("currencies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-currencies"] });
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      toast({ title: "Currency deleted" });
      logActivity({ action: "currency_deleted", entity_type: "currency" });
    },
  });

  const resetForm = () => {
    setForm({ code: "", name: "", symbol: "", exchange_rate: "1", is_default: false, is_active: true });
    setEditing(null);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ code: c.code, name: c.name, symbol: c.symbol, exchange_rate: String(c.exchange_rate), is_default: c.is_default, is_active: c.is_active });
    setOpen(true);
  };

  const filteredCurrencies = currencies.filter((c: any) => !searchQuery || c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-3 sm:p-6">
      <BackButton className="mb-3" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Currency Management</h1>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <PrintExportButtons
            title="Currencies"
            columns={[
              { header: "Code", accessor: (c) => c.code },
              { header: "Name", accessor: (c) => c.name },
              { header: "Symbol", accessor: (c) => c.symbol },
              { header: "Exchange Rate", accessor: (c) => c.exchange_rate },
              { header: "Default", accessor: (c) => c.is_default ? "Yes" : "No" },
              { header: "Active", accessor: (c) => c.is_active ? "Yes" : "No" },
            ] satisfies PrintColumn[]}
            data={filteredCurrencies}
          />
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Currency</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="USD" maxLength={5} /></div>
                  <div><Label>Symbol</Label><Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="$" maxLength={5} /></div>
                </div>
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="US Dollar" /></div>
                <div><Label>Exchange Rate</Label><Input type="number" step="0.0001" value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })} /></div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2"><Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} /><Label>Default</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
                </div>
                <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {filteredCurrencies.map((c: any) => (
          <Card key={c.id}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm">{c.code}</span>
                    <span className="text-sm text-muted-foreground">{c.symbol}</span>
                    {c.is_default && <Badge variant="default" className="text-[10px]">Default</Badge>}
                    {!c.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.name} • Rate: {c.exchange_rate}</p>
                </div>
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  {!c.is_default && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Exchange Rate</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCurrencies.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-bold">{c.code}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.symbol}</TableCell>
                <TableCell>{c.exchange_rate}</TableCell>
                <TableCell>{c.is_default ? "✅" : ""}</TableCell>
                <TableCell>{c.is_active ? "✅" : "❌"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    {!c.is_default && <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminCurrencies;
