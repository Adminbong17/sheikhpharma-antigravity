import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";

const emptyForm = { name: "", icon: "", sort_order: 0, is_active: true };

const AdminDoctorCategories = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-doctor-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("doctor_categories").select("*").order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        const { error } = await (supabase as any).from("doctor_categories").update(data).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("doctor_categories").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-doctor-categories"] });
      toast.success(editing ? "ক্যাটাগরি আপডেট হয়েছে" : "ক্যাটাগরি যোগ হয়েছে");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: () => toast.error("সমস্যা হয়েছে"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("doctor_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-doctor-categories"] });
      toast.success("ক্যাটাগরি ডিলিট হয়েছে");
    },
  });

  const openEdit = (cat: any) => {
    setEditing(cat);
    setForm({ name: cat.name || "", icon: cat.icon || "", sort_order: cat.sort_order || 0, is_active: cat.is_active ?? true });
    setOpen(true);
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) return toast.error("ক্যাটাগরির নাম দিন");
    saveMutation.mutate(form);
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FolderTree className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">ডাক্তার ক্যাটাগরি</h1>
          <Badge variant="secondary">{categories.length}</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> ক্যাটাগরি যোগ</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing ? "ক্যাটাগরি এডিট" : "নতুন ক্যাটাগরি"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>নাম *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="যেমন: মেডিসিন বিশেষজ্ঞ" /></div>
              <div><Label>আইকন (emoji/text)</Label><Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🩺" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>সিরিয়াল</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                  <Label>সক্রিয়</Label>
                </div>
              </div>
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">{saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-center py-10 text-muted-foreground">লোড হচ্ছে...</p> : (
        <div className="space-y-2">
          {categories.map((cat: any) => (
            <Card key={cat.id} className="p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {cat.icon && <span className="text-xl">{cat.icon}</span>}
                <div>
                  <p className="font-semibold text-sm">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">সিরিয়াল: {cat.sort_order}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!cat.is_active && <Badge variant="destructive" className="text-[10px]">নিষ্ক্রিয়</Badge>}
                <Button size="icon" variant="ghost" onClick={() => openEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("ডিলিট করবেন?")) deleteMutation.mutate(cat.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
          {categories.length === 0 && <p className="text-center py-6 text-muted-foreground">কোনো ক্যাটাগরি নেই</p>}
        </div>
      )}
    </div>
  );
};

export default AdminDoctorCategories;
