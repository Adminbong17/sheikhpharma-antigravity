import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FileText, Save, ChevronDown, ChevronUp, ArrowLeft, Plus, Trash2, Upload, CreditCard, ArrowUp, ArrowDown } from "lucide-react";
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
  const [newPmLogoUrl, setNewPmLogoUrl] = useState("");
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

    let logoUrl = newPmLogoUrl.trim();

    if (fileInputRef.current?.files?.[0]) {
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

      logoUrl = urlData.publicUrl;
    }

    if (!logoUrl) {
      toast.error("Please select a logo image or enter a logo URL");
      setUploading(false);
      return;
    }

    setUploading(true);
    const { error } = await (supabase.from("payment_methods" as any) as any)
      .insert({
        name: newPmName.trim(),
        logo_url: logoUrl,
        sort_order: paymentMethods.length,
        is_active: true,
      });

    if (error) toast.error(error.message);
    else {
      toast.success("Payment method added!");
      setNewPmName("");
      setNewPmLogoUrl("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["payment-methods-admin"] });
      queryClient.invalidateQueries({ queryKey: ["payment-methods-footer"] });
    }
    setUploading(false);
  };

  const handleMovePm = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= paymentMethods.length) return;

    const updated = [...paymentMethods];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    try {
      for (let i = 0; i < updated.length; i++) {
        await (supabase.from("payment_methods" as any) as any)
          .update({ sort_order: i })
          .eq("id", updated[i].id);
      }
      queryClient.invalidateQueries({ queryKey: ["payment-methods-admin"] });
      queryClient.invalidateQueries({ queryKey: ["payment-methods-footer"] });
      toast.success(`Position updated: ${moved.name}`);
    } catch (err: any) {
      toast.error("Failed to update position: " + err.message);
    }
  };

  const handleDeletePm = async (pm: PaymentMethod) => {
    if (!confirm(`Are you sure you want to delete payment method "${pm.name}"?`)) return;
    const { error } = await (supabase.from("payment_methods" as any) as any)
      .delete()
      .eq("id", pm.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`"${pm.name}" deleted!`);
      queryClient.invalidateQueries({ queryKey: ["payment-methods-admin"] });
      queryClient.invalidateQueries({ queryKey: ["payment-methods-footer"] });
    }
  };

  const togglePmActive = async (pm: PaymentMethod) => {
    const { error } = await (supabase.from("payment_methods" as any) as any)
      .update({ is_active: !pm.is_active })
      .eq("id", pm.id);
    if (error) toast.error(error.message);
    else {
      toast.success(pm.is_active ? `"${pm.name}" hidden from footer` : `"${pm.name}" active in footer`);
      queryClient.invalidateQueries({ queryKey: ["payment-methods-admin"] });
      queryClient.invalidateQueries({ queryKey: ["payment-methods-footer"] });
    }
  };

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
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
      <div className="mb-8 max-w-4xl">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Payment Methods ({paymentMethods.length})</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Use Up/Down buttons to re-order icons in the website footer
          </span>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Existing payment methods */}
            {pmLoading ? (
              <p className="text-sm text-muted-foreground">Loading payment methods...</p>
            ) : paymentMethods.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment methods added yet.</p>
            ) : (
              <div className="divide-y rounded-lg border">
                {paymentMethods.map((pm, index) => (
                  <div
                    key={pm.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/40 ${
                      !pm.is_active ? "opacity-60 bg-muted/20" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-medium text-muted-foreground w-6 text-center shrink-0">
                        #{index + 1}
                      </span>
                      <div className="h-10 w-16 shrink-0 flex items-center justify-center rounded border bg-white p-1 shadow-2xs">
                        <img
                          src={pm.logo_url}
                          alt={pm.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{pm.name}</p>
                        <span
                          className={`inline-block text-[11px] font-medium ${
                            pm.is_active ? "text-green-600" : "text-amber-600"
                          }`}
                        >
                          {pm.is_active ? "● Active in Footer" : "○ Hidden from Footer"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {/* Position Up / Down */}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={index === 0}
                        onClick={() => handleMovePm(index, "up")}
                        title="Move Up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={index === paymentMethods.length - 1}
                        onClick={() => handleMovePm(index, "down")}
                        title="Move Down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>

                      {/* Active Toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePmActive(pm)}
                        className={`h-8 px-2.5 text-xs font-medium ${
                          pm.is_active
                            ? "text-green-700 hover:text-green-800 hover:bg-green-50"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                        title={pm.is_active ? "Click to Hide" : "Click to Show"}
                      >
                        {pm.is_active ? "Visible" : "Hidden"}
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeletePm(pm)}
                        title={`Delete ${pm.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                  className="sm:w-1/3"
                />
                <Input
                  placeholder="Logo URL (optional if uploading file)"
                  value={newPmLogoUrl}
                  onChange={(e) => setNewPmLogoUrl(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors whitespace-nowrap">
                    <Upload className="h-4 w-4" />
                    <span>Upload Logo</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.svg"
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
                Upload image/vector icon (PNG or SVG recommended with transparent background) or paste direct logo URL.
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
