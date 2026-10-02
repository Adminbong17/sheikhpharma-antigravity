import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FileText, Save, ChevronDown, ChevronUp, ArrowLeft, Plus, Trash2, Upload, CreditCard } from "lucide-react";
import DefaultEditor from "react-simple-wysiwyg";
import { Link } from "react-router-dom";
import BackButton from "@/components/BackButton";

type StaticPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_active: boolean;
};

type PaymentMethod = {
  id: string;
  name: string;
  logo_url: string;
  sort_order: number;
  is_active: boolean;
};

const AdminStaticPages = () => {
  const queryClient = useQueryClient();
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["admin-static-pages"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("static_pages" as any) as any)
        .select("*")
        .order("title");
      if (error) throw error;
      return data as StaticPage[];
    },
  });

  const { data: paymentMethods = [], isLoading: pmLoading } = useQuery({
    queryKey: ["payment-methods-admin"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("payment_methods" as any) as any)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as PaymentMethod[];
    },
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", is_active: true });
  const [saving, setSaving] = useState(false);
  const [newPmName, setNewPmName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startEdit = (page: StaticPage) => {
    if (editingId === page.id) {
      setEditingId(null);
      return;
    }
    setEditingId(page.id);
    setForm({ title: page.title, content: page.content, is_active: page.is_active });
  };

  const handleSave = async (page: StaticPage) => {
    setSaving(true);
    const { error } = await (supabase.from("static_pages" as any) as any)
      .update({ title: form.title, content: form.content, is_active: form.is_active })
      .eq("id", page.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`"${form.title}" saved!`);
      queryClient.invalidateQueries({ queryKey: ["admin-static-pages"] });
      setEditingId(null);
    }
    setSaving(false);
  };

  const handleAddPaymentMethod = async () => {
    if (!newPmName.trim()) {
      toast.error("Please enter a name");
      return;
    }
    if (!fileInputRef.current?.files?.[0]) {
      toast.error("Please select a logo image");
      return;
    }

    setUploading(true);
    const file = fileInputRef.current.files[0];
    const ext = file.name.split(".").pop();
    const filePath = `${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-icons")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("payment-icons")
      .getPublicUrl(filePath);

    const { error } = await (supabase.from("payment_methods" as any) as any)
      .insert({
        name: newPmName.trim(),
        logo_url: urlData.publicUrl,
        sort_order: paymentMethods.length,
      });

    if (error) toast.error(error.message);
    else {
      toast.success("Payment method added!");
      setNewPmName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["payment-methods-admin"] });
    }
    setUploading(false);
  };

  const handleDeletePm = async (pm: PaymentMethod) => {
    if (!confirm(`Delete "${pm.name}"?`)) return;
    const { error } = await (supabase.from("payment_methods" as any) as any)
      .delete()
      .eq("id", pm.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted!");
      queryClient.invalidateQueries({ queryKey: ["payment-methods-admin"] });
    }
  };

  const togglePmActive = async (pm: PaymentMethod) => {
    const { error } = await (supabase.from("payment_methods" as any) as any)
      .update({ is_active: !pm.is_active })
      .eq("id", pm.id);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["payment-methods-admin"] });
  };

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="p-3 sm:p-6">
      <BackButton className="mb-2" />
      <div className="mb-6 flex items-center gap-3">
        <Link to="/admin/site-settings">
          <Button variant="ghost" size="icon" className="mr-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Footer Settings</h1>
      </div>

      {/* Payment Methods Section */}
      <div className="mb-8 max-w-3xl">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Payment Methods</h2>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Existing payment methods */}
            {pmLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : paymentMethods.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment methods added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className={`relative group flex flex-col items-center gap-1 rounded-lg border p-3 min-w-[80px] ${
                      !pm.is_active ? "opacity-50" : ""
                    }`}
                  >
                    <img
                      src={pm.logo_url}
                      alt={pm.name}
                      className="h-8 w-8 object-contain"
                    />
                    <span className="text-xs text-muted-foreground truncate max-w-[70px]">{pm.name}</span>
                    <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => togglePmActive(pm)}
                        className={`rounded-full p-1 text-xs ${
                          pm.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                        title={pm.is_active ? "Hide" : "Show"}
                      >
                        {pm.is_active ? "✓" : "○"}
                      </button>
                      <button
                        onClick={() => handleDeletePm(pm)}
                        className="rounded-full bg-destructive/10 p-1 text-destructive hover:bg-destructive/20"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new */}
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-medium">Add Payment Method</Label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="e.g. bKash, Visa, Nagad"
                  value={newPmName}
                  onChange={(e) => setNewPmName(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>Logo</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                  <Button onClick={handleAddPaymentMethod} disabled={uploading} size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    {uploading ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload small icon/logo images (PNG recommended, transparent background).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Static Pages Section */}
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Footer Pages</h2>
      </div>
      <div className="grid gap-4 max-w-3xl">
        {pages.map((page) => (
          <Card key={page.id}>
            <CardHeader className="cursor-pointer pb-3" onClick={() => startEdit(page)}>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  {page.title}
                  {!page.is_active && <span className="text-xs text-muted-foreground">(Hidden)</span>}
                </span>
                {editingId === page.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
              <p className="text-xs text-muted-foreground">/page/{page.slug}</p>
            </CardHeader>
            {editingId === page.id && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <DefaultEditor
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    style={{ minHeight: "250px" }}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">Active</span>
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                </div>
                <Button onClick={() => handleSave(page)} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminStaticPages;
