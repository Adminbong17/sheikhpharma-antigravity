import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import BackButton from "@/components/BackButton";

interface SlideForm {
  title: string;
  subtitle: string;
  link_url: string;
  sort_order: number;
  is_active: boolean;
}

const AdminHeroSlides = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SlideForm>({ title: "", subtitle: "", link_url: "", sort_order: 0, is_active: true });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ["admin-hero-slides"],
    queryFn: async () => {
      const { data } = await supabase
        .from("hero_slides")
        .select("*")
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let image_url = editingId ? slides.find(s => s.id === editingId)?.image_url || "" : "";

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("hero-slides").upload(path, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("hero-slides").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }

      if (!image_url) throw new Error("Image is required");

      if (editingId) {
        const { error } = await supabase.from("hero_slides").update({
          title: form.title || null,
          subtitle: form.subtitle || null,
          link_url: form.link_url || null,
          sort_order: form.sort_order,
          is_active: form.is_active,
          ...(imageFile ? { image_url } : {}),
        }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hero_slides").insert({
          title: form.title || null,
          subtitle: form.subtitle || null,
          image_url,
          link_url: form.link_url || null,
          sort_order: form.sort_order,
          is_active: form.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      toast.success(editingId ? "Slide updated!" : "Slide added!");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const slide = slides?.find((s: any) => s.id === id);
      if (slide) {
        const { moveToTrash } = await import("@/lib/trash");
        await moveToTrash("hero_slides", id, slide);
      }
      const { error } = await supabase.from("hero_slides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      toast.success("Slide deleted!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm({ title: "", subtitle: "", link_url: "", sort_order: 0, is_active: true });
    setImageFile(null);
    setEditingId(null);
    setDialogOpen(false);
  };

  const openEdit = (slide: any) => {
    setEditingId(slide.id);
    setForm({
      title: slide.title || "",
      subtitle: slide.subtitle || "",
      link_url: slide.link_url || "",
      sort_order: slide.sort_order,
      is_active: slide.is_active,
    });
    setImageFile(null);
    setDialogOpen(true);
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hero Slides</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogTrigger asChild>
            <Button className="gap-1"><Plus className="h-4 w-4" /> Add Slide</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Slide" : "Add New Slide"}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
            >
              <div>
                <Label>Image (1000×432 recommended)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  required={!editingId}
                />
                {editingId && !imageFile && (
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to keep current image</p>
                )}
              </div>
              <div>
                <Label>Title (optional)</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Subtitle (optional)</Label>
                <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
              </div>
              <div>
                <Label>Link URL (optional)</Label>
                <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/category/electronics" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Sort Order</Label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? "Uploading..." : editingId ? "Update Slide" : "Add Slide"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : slides.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hero slides yet. Add your first slide!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {slides.map((slide) => (
            <Card key={slide.id} className={`overflow-hidden ${!slide.is_active ? "opacity-50" : ""}`}>
              <div className="relative" style={{ aspectRatio: "1000/432" }}>
                <img src={slide.image_url} alt={slide.title || "Slide"} className="h-full w-full object-cover" />
                {!slide.is_active && (
                  <div className="absolute top-2 left-2 rounded bg-muted px-2 py-0.5 text-xs font-medium">Inactive</div>
                )}
              </div>
              <CardContent className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{slide.title || "No title"}</p>
                  <p className="text-xs text-muted-foreground">Order: {slide.sort_order}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(slide)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(slide.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminHeroSlides;
