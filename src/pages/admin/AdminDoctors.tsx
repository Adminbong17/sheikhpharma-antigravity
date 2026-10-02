import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Stethoscope } from "lucide-react";

const emptyForm = { name: "", qualification: "", phone: "", chamber: "", division: "", zilla: "", is_active: true, sort_order: 0, category_ids: [] as string[] };

const AdminDoctors = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["admin-doctors"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("doctors").select("*").order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["doctor-category-assignments"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("doctor_category_assignments").select("*");
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-doctor-categories"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("doctor_categories").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: deliveryZones = [] } = useQuery({
    queryKey: ["delivery-zones-list"],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_zones").select("division, zilla").eq("is_active", true);
      return data || [];
    },
  });

  const uniqueDivisions = [...new Set(deliveryZones.map((z: any) => z.division).filter(Boolean))].sort();
  const uniqueZillas = [...new Set(
    (form.division ? deliveryZones.filter((d: any) => d.division === form.division) : deliveryZones)
      .map((d: any) => d.zilla).filter(Boolean)
  )].sort();

  const getDoctorCategoryIds = (doctorId: string): string[] => {
    return assignments.filter((a: any) => a.doctor_id === doctorId).map((a: any) => a.category_id);
  };

  const getCategoryNames = (doctorId: string): string[] => {
    const catIds = getDoctorCategoryIds(doctorId);
    return catIds.map((id: string) => categories.find((c: any) => c.id === id)?.name).filter(Boolean);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { category_ids, ...doctorData } = data;
      let doctorId: string;

      if (editing) {
        const { error } = await (supabase as any).from("doctors").update(doctorData).eq("id", editing.id);
        if (error) throw error;
        doctorId = editing.id;
      } else {
        const { data: inserted, error } = await (supabase as any).from("doctors").insert(doctorData).select("id").single();
        if (error) throw error;
        doctorId = inserted.id;
      }

      // Update category assignments
      await (supabase as any).from("doctor_category_assignments").delete().eq("doctor_id", doctorId);
      if (category_ids.length > 0) {
        const rows = category_ids.map((cid: string) => ({ doctor_id: doctorId, category_id: cid }));
        await (supabase as any).from("doctor_category_assignments").insert(rows);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-doctors"] });
      qc.invalidateQueries({ queryKey: ["doctor-category-assignments"] });
      toast.success(editing ? "ডাক্তার আপডেট হয়েছে" : "ডাক্তার যোগ হয়েছে");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: () => toast.error("সমস্যা হয়েছে"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("doctors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-doctors"] });
      qc.invalidateQueries({ queryKey: ["doctor-category-assignments"] });
      toast.success("ডাক্তার ডিলিট হয়েছে");
    },
  });

  const openEdit = (doc: any) => {
    setEditing(doc);
    setForm({
      name: doc.name || "",
      qualification: doc.qualification || "",
      phone: doc.phone || "",
      chamber: doc.chamber || "",
      division: doc.division || "",
      zilla: doc.zilla || "",
      is_active: doc.is_active ?? true,
      sort_order: doc.sort_order || 0,
      category_ids: getDoctorCategoryIds(doc.id),
    });
    setOpen(true);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return toast.error("ডাক্তারের নাম দিন");
    saveMutation.mutate(form);
  };

  const toggleCategory = (catId: string) => {
    setForm(f => ({
      ...f,
      category_ids: f.category_ids.includes(catId)
        ? f.category_ids.filter(id => id !== catId)
        : [...f.category_ids, catId],
    }));
  };

  const filtered = doctors.filter((d: any) => !search || d.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">ডাক্তার ম্যানেজমেন্ট</h1>
          <Badge variant="secondary">{doctors.length}</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> ডাক্তার যোগ করুন</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "ডাক্তার এডিট" : "নতুন ডাক্তার"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>নাম *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div>
                <Label className="mb-2 block">বিশেষজ্ঞ ক্যাটাগরি (একাধিক সিলেক্ট করুন)</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                  {categories.map((c: any) => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-accent/50 rounded px-1 py-0.5">
                      <Checkbox
                        checked={form.category_ids.includes(c.id)}
                        onCheckedChange={() => toggleCategory(c.id)}
                      />
                      <span>{c.icon ? `${c.icon} ` : ""}{c.name}</span>
                    </label>
                  ))}
                </div>
                {form.category_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {form.category_ids.map(id => {
                      const cat = categories.find((c: any) => c.id === id);
                      return cat ? <Badge key={id} variant="secondary" className="text-[10px]">{cat.icon} {cat.name}</Badge> : null;
                    })}
                  </div>
                )}
              </div>
              <div><Label>পদবী ও কর্মস্থল</Label><Input value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} placeholder="MBBS, FCPS" /></div>
              <div><Label>ফোন</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>চেম্বার</Label><Input value={form.chamber} onChange={e => setForm(f => ({ ...f, chamber: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>বিভাগ</Label>
                  <Select value={form.division} onValueChange={v => setForm(f => ({ ...f, division: v, zilla: "" }))}>
                    <SelectTrigger><SelectValue placeholder="বিভাগ" /></SelectTrigger>
                    <SelectContent>
                      {uniqueDivisions.map((d: string) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>জেলা</Label>
                  <Select value={form.zilla} onValueChange={v => setForm(f => ({ ...f, zilla: v }))}>
                    <SelectTrigger><SelectValue placeholder="জেলা" /></SelectTrigger>
                    <SelectContent>
                      {uniqueZillas.map((z: string) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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

      <Input placeholder="ডাক্তার খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} />

      {isLoading ? <p className="text-center py-10 text-muted-foreground">লোড হচ্ছে...</p> : (
        <div className="space-y-2">
          {filtered.map((doc: any) => {
            const catNames = getCategoryNames(doc.id);
            return (
              <Card key={doc.id} className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{doc.name}</p>
                  {catNames.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {catNames.map((name: string) => <Badge key={name} variant="outline" className="text-[10px]">{name}</Badge>)}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{doc.qualification}</p>
                  <p className="text-xs text-muted-foreground">{[doc.zilla, doc.division].filter(Boolean).join(", ")}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!doc.is_active && <Badge variant="destructive" className="text-[10px]">নিষ্ক্রিয়</Badge>}
                  <Button size="icon" variant="ghost" onClick={() => openEdit(doc)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("ডিলিট করবেন?")) deleteMutation.mutate(doc.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="text-center py-6 text-muted-foreground">কোনো ডাক্তার নেই</p>}
        </div>
      )}
    </div>
  );
};

export default AdminDoctors;
