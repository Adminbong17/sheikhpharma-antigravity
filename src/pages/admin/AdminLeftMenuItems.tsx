import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, Upload, Loader2, X } from "lucide-react";
import BackButton from "@/components/BackButton";

type Item = {
  id: string;
  name: string;
  icon: string | null;
  image_url: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  link_url: string | null;
  use_link: boolean | null;
  bg_color: string | null;
};

const empty = { name: "", icon: "", image_url: "", sort_order: 0, is_active: true, link_url: "", use_link: false, bg_color: "" };

const AdminLeftMenuItems = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `left-menu/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-left-menu-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_left_menu_items")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as Item[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        icon: form.icon || null,
        image_url: form.image_url || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        link_url: form.use_link ? (form.link_url?.trim() || null) : null,
        use_link: !!form.use_link,
        bg_color: form.bg_color?.trim() || null,
      };
      if (!payload.name) throw new Error("Name required");
      if (editing) {
        const { error } = await supabase
          .from("homepage_left_menu_items")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("homepage_left_menu_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-left-menu-items"] });
      qc.invalidateQueries({ queryKey: ["homepage-left-menu"] });
      toast.success(editing ? "Updated" : "Created");
      setOpen(false);
      setEditing(null);
      setForm(empty);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homepage_left_menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-left-menu-items"] });
      qc.invalidateQueries({ queryKey: ["homepage-left-menu"] });
      toast.success("Deleted");
    },
  });

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (it: Item) => {
    setEditing(it);
    setForm({
      name: it.name,
      icon: it.icon || "",
      image_url: it.image_url || "",
      sort_order: it.sort_order || 0,
      is_active: it.is_active ?? true,
      link_url: it.link_url || "",
      use_link: it.use_link ?? false,
      bg_color: it.bg_color || "",
    });
    setOpen(true);
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Homepage Left Menu</h1>
          <p className="text-sm text-muted-foreground">
            হোমপেজের বাম পাশে দেখানো menu items। প্রতিটিতে products assign করা যাবে।
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Item</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it) => (
            <div key={it.id} className="rounded-lg border bg-card p-3 flex items-center gap-3">
              <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {it.image_url ? (
                  <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
                ) : it.icon ? (
                  <span className="text-2xl">{it.icon}</span>
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-1">{it.name}</p>
                <p className="text-xs text-muted-foreground">
                  Order: {it.sort_order || 0} • {it.is_active ? "Active" : "Hidden"}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                {it.use_link ? (
                  <span className="text-[10px] text-center px-2 py-0.5 rounded bg-primary/10 text-primary truncate max-w-[120px]" title={it.link_url || ""}>
                    🔗 Link mode
                  </span>
                ) : (
                  <Link to={`/admin/left-menu/${it.id}/products`}>
                    <Button size="sm" variant="outline" className="h-7 text-xs px-2">Products</Button>
                  </Link>
                )}
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(it)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    onClick={() => { if (confirm("Delete this item?")) remove.mutate(it.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "New"} Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Icon (emoji, optional)</Label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="💊" />
            </div>
            <div>
              <Label>Image (optional, any format)</Label>
              <div className="flex items-center gap-3 mt-1">
                <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {uploading ? "Uploading..." : form.image_url ? "Change Image" : "Upload Image"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                </Button>
                {form.image_url && (
                  <div className="relative">
                    <img src={form.image_url} alt="Preview" className="h-12 w-12 rounded object-cover border" />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image_url: "" })}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Button Color (optional)</Label>
              <p className="text-xs text-muted-foreground mb-1">
                Khali rakhle automatic colorful gradient ashbe.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={form.bg_color || "#1E6FD9"}
                  onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                  className="h-10 w-16 p-1 cursor-pointer"
                />
                <Input
                  value={form.bg_color}
                  onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                  placeholder="#1E6FD9 or leave empty"
                  className="flex-1"
                />
                {form.bg_color && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setForm({ ...form, bg_color: "" })}
                  >
                    Clear
                  </Button>
                )}
              </div>
              {form.bg_color && (
                <div
                  className="mt-2 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow"
                  style={{ backgroundColor: form.bg_color }}
                >
                  Preview
                </div>
              )}
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>

            <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold">Redirect to Link</Label>
                  <p className="text-xs text-muted-foreground">ON হলে assigned products এর বদলে এই link এ redirect হবে</p>
                </div>
                <Switch
                  checked={form.use_link}
                  onCheckedChange={(v) => setForm({ ...form, use_link: v })}
                />
              </div>
              {form.use_link && (
                <div>
                  <Label className="text-xs">Link URL</Label>
                  <Input
                    value={form.link_url}
                    onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                    placeholder="https://example.com or /category/slug"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeftMenuItems;
