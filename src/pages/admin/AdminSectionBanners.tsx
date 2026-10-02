import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Image, ExternalLink } from "lucide-react";
import BackButton from "@/components/BackButton";

const AdminSectionBanners = () => {
  const qc = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [form, setForm] = useState({ image_url: "", link_url: "", after_section_id: "" });

  const { data: sections = [] } = useQuery({
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

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-section-banners"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("section_banners" as any)
        .select("*, homepage_sections(title, icon, sort_order)")
        .order("created_at", { ascending: true }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const addBanner = useMutation({
    mutationFn: async (f: typeof form) => {
      const { error } = await (supabase as any).from("section_banners").insert({
        image_url: f.image_url,
        link_url: f.link_url || null,
        after_section_id: f.after_section_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-section-banners"] });
      setShowAddDialog(false);
      resetForm();
      toast.success("Banner added");
    },
  });

  const updateBanner = useMutation({
    mutationFn: async ({ id, ...vals }: any) => {
      const { error } = await (supabase as any).from("section_banners").update(vals).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-section-banners"] });
      setEditingBanner(null);
      resetForm();
      toast.success("Updated");
    },
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("section_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-section-banners"] });
      toast.success("Deleted");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("section_banners").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-section-banners"] }),
  });

  const resetForm = () => setForm({ image_url: "", link_url: "", after_section_id: "" });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `section-banners/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file);
    if (error) {
      toast.error("Upload failed");
      return;
    }
    const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
    setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
    toast.success("Image uploaded");
  };

  const formFields = (
    <div className="space-y-4">
      <div>
        <Label>Banner Image (1000×432)</Label>
        <Input type="file" accept="image/*" onChange={handleImageUpload} />
        {form.image_url && (
          <img src={form.image_url} alt="Preview" className="mt-2 rounded-lg w-full aspect-[1000/432] object-cover border" />
        )}
        <Input className="mt-2" value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} placeholder="Or paste image URL" />
      </div>
      <div>
        <Label>Link URL (optional)</Label>
        <Input value={form.link_url} onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))} placeholder="https://..." />
      </div>
      <div>
        <Label>Show After Section</Label>
        <Select value={form.after_section_id} onValueChange={(v) => setForm((p) => ({ ...p, after_section_id: v }))}>
          <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
          <SelectContent>
            {sections.map((sec: any) => (
              <SelectItem key={sec.id} value={sec.id}>
                {sec.icon ? `${sec.icon} ` : ""}{sec.title} (#{sec.sort_order})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Section Banners</h1>
          <p className="text-sm text-muted-foreground">Add banners between homepage sections (1000×432)</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={(o) => { setShowAddDialog(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Banner</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Section Banner</DialogTitle></DialogHeader>
            {formFields}
            <Button className="w-full" onClick={() => addBanner.mutate(form)} disabled={!form.image_url || !form.after_section_id || addBanner.isPending}>
              Add Banner
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : banners.length === 0 ? (
        <p className="text-muted-foreground">No banners yet.</p>
      ) : (
        <div className="space-y-4">
          {banners.map((b: any) => {
            const sec = b.homepage_sections;
            return (
              <Card key={b.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm">
                        After: {sec?.icon ? `${sec.icon} ` : ""}{sec?.title || "Unknown"} (#{sec?.sort_order})
                      </CardTitle>
                      {b.link_url && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Switch checked={b.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: b.id, is_active: v })} />
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                        setEditingBanner(b);
                        setForm({ image_url: b.image_url, link_url: b.link_url || "", after_section_id: b.after_section_id });
                      }}>Edit</Button>
                      <Button variant="destructive" size="sm" className="h-7" onClick={() => { if (confirm("Delete?")) deleteBanner.mutate(b.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <img src={b.image_url} alt="Banner" className="rounded-lg w-full aspect-[1000/432] object-cover border" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editingBanner} onOpenChange={(o) => { if (!o) { setEditingBanner(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Banner</DialogTitle></DialogHeader>
          {formFields}
          <Button className="w-full" onClick={() => updateBanner.mutate({
            id: editingBanner.id,
            image_url: form.image_url,
            link_url: form.link_url || null,
            after_section_id: form.after_section_id,
          })} disabled={updateBanner.isPending}>
            Save Changes
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSectionBanners;
