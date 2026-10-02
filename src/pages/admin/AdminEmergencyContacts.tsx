import { useState } from "react";
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
import { Plus, Pencil, Trash2, Phone, Siren } from "lucide-react";
import BackButton from "@/components/BackButton";
import { normalizeBdPhone } from "@/lib/phone";

type Contact = {
  id: string;
  name: string;
  phone: string;
  location: string | null;
  icon: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

const empty = { name: "", phone: "", location: "", icon: "", sort_order: 0, is_active: true };

const AdminEmergencyContacts = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-emergency-contacts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("emergency_contacts")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as Contact[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      // Emergency numbers are often short codes (999, 333, 16263) — save EXACTLY as entered.
      // Only strip spaces/dashes; do NOT prepend 0 or normalize as a BD mobile number.
      const phone = (form.phone || "").replace(/[\s-]/g, "").trim();
      if (!form.name.trim()) throw new Error("Name required");
      if (!phone) throw new Error("Phone required");
      const payload = {
        name: form.name.trim(),
        phone,
        location: form.location.trim() || null,
        icon: form.icon.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await (supabase as any)
          .from("emergency_contacts").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("emergency_contacts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-emergency-contacts"] });
      qc.invalidateQueries({ queryKey: ["emergency-contacts"] });
      toast.success(editing ? "Updated" : "Created");
      setOpen(false); setEditing(null); setForm(empty);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("emergency_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-emergency-contacts"] });
      qc.invalidateQueries({ queryKey: ["emergency-contacts"] });
      toast.success("Deleted");
    },
  });

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (it: Contact) => {
    setEditing(it);
    setForm({
      name: it.name, phone: it.phone, location: it.location || "",
      icon: it.icon || "", sort_order: it.sort_order || 0, is_active: it.is_active ?? true,
    });
    setOpen(true);
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Siren className="h-6 w-6 text-red-600" /> Emergency Contacts
          </h1>
          <p className="text-sm text-muted-foreground">
            Users will see these as tabs and can tap to call directly.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Contact</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No emergency contacts yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it) => (
            <div key={it.id} className="rounded-lg border bg-card p-3 flex items-center gap-3">
              <div className="h-12 w-12 rounded-md bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                {it.icon ? <span className="text-2xl">{it.icon}</span> : <Phone className="h-5 w-5 text-red-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-1">{it.name}</p>
                <p className="text-xs text-muted-foreground">{it.phone}</p>
                {it.location && <p className="text-xs text-muted-foreground line-clamp-1">📍 {it.location}</p>}
                <p className="text-[10px] text-muted-foreground">
                  Order: {it.sort_order || 0} • {it.is_active ? "Active" : "Hidden"}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(it)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                  onClick={() => { if (confirm("Delete this contact?")) remove.mutate(it.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "New"} Emergency Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Police, Fire Service, Ambulance" />
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="999, 333, 16263 or 01XXXXXXXXX" />
              <p className="text-[11px] text-muted-foreground mt-1">
                Saved exactly as you type. Short codes like 999 / 333 will NOT get a leading 0.
              </p>
            </div>
            <div>
              <Label>Location (optional)</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Dhaka HQ" />
            </div>
            <div>
              <Label>Icon / Emoji (optional)</Label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🚓 🚑 🚒" />
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

export default AdminEmergencyContacts;
