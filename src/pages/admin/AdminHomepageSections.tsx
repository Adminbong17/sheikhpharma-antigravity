import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, SmilePlus, PackagePlus } from "lucide-react";
import BackButton from "@/components/BackButton";

const EMOJI_LIST = [
  "⚡", "🔥", "💥", "🎯", "🛒", "🎁", "💎", "🏷️", "✨", "🌟",
  "❤️", "💰", "🎉", "🚀", "👑", "🔔", "📦", "🎊", "💫", "🏆",
  "🛍️", "💸", "🤩", "👍", "🆕", "🔝", "💯", "🎈", "🌈", "⭐",
  "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🩷", "❄️", "☀️",
  "🍎", "🎶", "📱", "💻", "🎮", "👗", "👟", "🧴", "🍕", "☕",
  "🏠", "🚗", "✈️", "📚", "🎬", "🎵", "🏋️", "⚽", "🎨", "🧸",
];

const EmojiPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 w-16 text-xl">
          {value || <SmilePlus className="h-4 w-4 text-muted-foreground" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="grid grid-cols-10 gap-1">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={`flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-muted transition ${value === emoji ? "bg-primary/20 ring-1 ring-primary" : ""}`}
              onClick={() => { onChange(emoji); setOpen(false); }}
            >
              {emoji}
            </button>
          ))}
        </div>
        {value && (
          <Button variant="ghost" size="sm" className="mt-2 w-full text-xs text-muted-foreground" onClick={() => { onChange(""); setOpen(false); }}>
            Remove Icon
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};

const AdminHomepageSections = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editingSection, setEditingSection] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [form, setForm] = useState({ title: "", subtitle: "", section_type: "grid", sort_order: 0, icon: "" });

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["admin-homepage-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: sectionProductCounts = {} } = useQuery({
    queryKey: ["admin-section-product-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_section_products")
        .select("section_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((sp: any) => {
        counts[sp.section_id] = (counts[sp.section_id] || 0) + 1;
      });
      return counts;
    },
  });

  const addSection = useMutation({
    mutationFn: async (f: typeof form) => {
      const payload: any = { title: f.title, subtitle: f.subtitle, section_type: f.section_type, sort_order: f.sort_order };
      if (f.icon) payload.icon = f.icon;
      const { error } = await supabase.from("homepage_sections").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-homepage-sections"] }); setShowAddDialog(false); toast.success("Section added"); },
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, ...vals }: any) => {
      const { error } = await supabase.from("homepage_sections").update(vals).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-homepage-sections"] }); setEditingSection(null); toast.success("Updated"); },
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homepage_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-homepage-sections"] }); toast.success("Deleted"); },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("homepage_sections").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-homepage-sections"] }),
  });

  const resetForm = () => setForm({ title: "", subtitle: "", section_type: "grid", sort_order: 0, icon: "" });

  const formFields = (
    <div className="space-y-4">
      <div>
        <Label>Icon & Title</Label>
        <div className="flex items-center gap-2">
          <EmojiPicker value={form.icon} onChange={(v) => setForm((prev) => ({ ...prev, icon: v }))} />
          <Input className="flex-1" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Flash Sale" />
        </div>
      </div>
      <div>
        <Label>Subtitle (optional)</Label>
        <Input value={form.subtitle} onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))} placeholder="Don't miss out!" />
      </div>
      <div>
        <Label>Display Type</Label>
        <Select value={form.section_type} onValueChange={(v) => setForm((prev) => ({ ...prev, section_type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="carousel">Carousel</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Sort Order</Label>
        <Input type="number" value={form.sort_order} onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))} />
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Homepage Sections</h1>
          <p className="text-sm text-muted-foreground">Create custom sections like Flash Sale, Just For You, etc.</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={(o) => { setShowAddDialog(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Section</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Section</DialogTitle></DialogHeader>
            {formFields}
            <Button className="w-full" onClick={() => addSection.mutate(form)} disabled={!form.title || addSection.isPending}>
              Create Section
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : sections.length === 0 ? (
        <p className="text-muted-foreground">No sections yet. Create one to get started!</p>
      ) : (
        <div className="space-y-4">
          {sections.map((sec: any) => {
            const productCount = sectionProductCounts[sec.id] || 0;
            return (
              <Card key={sec.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <GripVertical className="h-4 w-4 text-muted-foreground hidden sm:block" />
                      {sec.icon && <span className="text-xl">{sec.icon}</span>}
                      <div>
                        <CardTitle className="text-base">{sec.title}</CardTitle>
                        {sec.subtitle && <p className="text-xs text-muted-foreground">{sec.subtitle}</p>}
                      </div>
                      <Badge variant="outline" className="text-[10px]">{sec.section_type}</Badge>
                      <Badge variant="outline" className="text-[10px]">#{sec.sort_order}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{productCount} products</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Switch checked={sec.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: sec.id, is_active: v })} />
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate(`/admin/homepage-sections/${sec.id}/products`)}>
                        <PackagePlus className="h-3 w-3 mr-1" /> Products
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                        setEditingSection(sec);
                        setForm({ title: sec.title, subtitle: sec.subtitle || "", section_type: sec.section_type, sort_order: sec.sort_order, icon: sec.icon || "" });
                      }}>Edit</Button>
                      <Button variant="destructive" size="sm" className="h-7" onClick={() => { if (confirm("Delete?")) deleteSection.mutate(sec.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Section Dialog */}
      <Dialog open={!!editingSection} onOpenChange={(o) => { if (!o) { setEditingSection(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Section</DialogTitle></DialogHeader>
          {formFields}
          <Button className="w-full" onClick={() => updateSection.mutate({ id: editingSection.id, title: form.title, subtitle: form.subtitle, section_type: form.section_type, sort_order: form.sort_order, icon: form.icon || null })} disabled={updateSection.isPending}>
            Save Changes
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminHomepageSections;
