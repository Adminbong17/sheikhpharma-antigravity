import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Microscope, Search } from "lucide-react";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";

interface LabTest {
  id: string;
  name: string;
  name_bn: string | null;
  price: number;
  category: string | null;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

const AdminLabTests = () => {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [form, setForm] = useState({ name: "", name_bn: "", price: 0, category: "", is_popular: false, is_active: true, sort_order: 0 });

  const fetchTests = async () => {
    const { data } = await (supabase.from("lab_tests" as any) as any).select("*").order("sort_order", { ascending: true });
    if (data) setTests(data as LabTest[]);
    setLoading(false);
  };

  useEffect(() => { fetchTests(); }, []);

  const openAdd = () => {
    setEditingTest(null);
    setForm({ name: "", name_bn: "", price: 0, category: "", is_popular: false, is_active: true, sort_order: 0 });
    setDialogOpen(true);
  };

  const openEdit = (t: LabTest) => {
    setEditingTest(t);
    setForm({ name: t.name, name_bn: t.name_bn || "", price: t.price, category: t.category || "", is_popular: t.is_popular, is_active: t.is_active, sort_order: t.sort_order });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const payload = { name: form.name.trim(), name_bn: form.name_bn.trim() || null, price: Number(form.price), category: form.category.trim() || null, is_popular: form.is_popular, is_active: form.is_active, sort_order: Number(form.sort_order) };

    if (editingTest) {
      const { error } = await (supabase.from("lab_tests" as any) as any).update(payload).eq("id", editingTest.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Test updated");
    } else {
      const { error } = await (supabase.from("lab_tests" as any) as any).insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Test added");
    }
    setDialogOpen(false);
    fetchTests();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test?")) return;
    await (supabase.from("lab_tests" as any) as any).delete().eq("id", id);
    toast.success("Deleted");
    fetchTests();
  };

  const filtered = tests.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.name_bn && t.name_bn.includes(search)));

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Microscope className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Lab Tests</h1>
          <span className="text-xs text-muted-foreground">({tests.length})</span>
        </div>
        <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Test</Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tests..." className="pl-8 h-9" />
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <>
          {/* Desktop Table */}
          <div className="border rounded-lg overflow-auto hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Name (BN)</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Popular</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t, i) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium text-sm">{t.name}</TableCell>
                    <TableCell className="text-sm">{t.name_bn || "—"}</TableCell>
                    <TableCell className="text-sm">{t.category || "—"}</TableCell>
                    <TableCell className="text-right font-bold text-sm">৳{t.price}</TableCell>
                    <TableCell>{t.is_popular ? "⭐" : "—"}</TableCell>
                    <TableCell><span className={`text-xs font-bold ${t.is_active ? "text-green-600" : "text-destructive"}`}>{t.is_active ? "Yes" : "No"}</span></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No tests found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((t, i) => (
              <div key={t.id} className="border rounded-lg p-3 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{i + 1}.</span>
                    <span className="font-medium text-sm truncate">{t.name}</span>
                    {t.is_popular && <span>⭐</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {t.category && <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t.category}</span>}
                    <span className={`text-xs font-bold ${t.is_active ? "text-green-600" : "text-destructive"}`}>{t.is_active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">৳{t.price}</p>
                  <div className="flex gap-0.5 mt-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No tests found</p>}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingTest ? "Edit Test" : "Add Test"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-bold">Test Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. CBC (Complete Blood Count)" /></div>
            <div><Label className="text-xs font-bold">Name (Bangla)</Label><Input value={form.name_bn} onChange={e => setForm(f => ({ ...f, name_bn: e.target.value }))} placeholder="e.g. সিবিসি" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-bold">Price (৳) *</Label><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} /></div>
              <div><Label className="text-xs font-bold">Category</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Blood" /></div>
            </div>
            <div><Label className="text-xs font-bold">Sort Order</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.is_popular} onCheckedChange={v => setForm(f => ({ ...f, is_popular: v }))} /><Label className="text-xs">Popular</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label className="text-xs">Active</Label></div>
            </div>
            <Button onClick={handleSave} className="w-full">{editingTest ? "Update" : "Add"} Test</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLabTests;
