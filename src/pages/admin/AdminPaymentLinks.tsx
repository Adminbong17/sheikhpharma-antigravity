import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus, Trash2, ExternalLink, Loader2, Pencil, Palette } from "lucide-react";
import { toast } from "sonner";

type PaymentLink = {
  id: string;
  token: string;
  title: string;
  description: string | null;
  fixed_amount: number | null;
  is_active: boolean;
  created_at: string;
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_color: string | null;
  brand_website: string | null;
  brand_footer_note: string | null;
  hide_site_chrome: boolean | null;
  require_otp: boolean | null;
  custom_fields: CustomField[] | null;
  mode: string | null;
};

type CustomField = {
  key: string;
  label: string;
  type: "text" | "number" | "textarea";
  placeholder?: string;
  required?: boolean;
};

const genToken = () =>
  Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);

const emptyForm = {
  mode: "payment" as "payment" | "form",
  title: "",
  description: "",
  fixedAmount: "",
  brandName: "",
  brandLogoUrl: "",
  brandColor: "#e2136e",
  brandWebsite: "",
  brandFooterNote: "",
  hideSiteChrome: false,
  requireOtp: false,
  customFields: [] as CustomField[],
};

const AdminPaymentLinks = () => {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addField = () =>
    setForm((f) => ({
      ...f,
      customFields: [...f.customFields, { key: `field_${f.customFields.length + 1}`, label: "", type: "text", placeholder: "", required: false }],
    }));

  const updateField = (idx: number, patch: Partial<CustomField>) =>
    setForm((f) => ({
      ...f,
      customFields: f.customFields.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));

  const removeField = (idx: number) =>
    setForm((f) => ({ ...f, customFields: f.customFields.filter((_, i) => i !== idx) }));

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from("payment_links" as any) as any)
      .select("*")
      .order("created_at", { ascending: false });
    setLinks((data as PaymentLink[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (link: PaymentLink) => {
    setEditingId(link.id);
    setForm({
      mode: (link.mode === "form" ? "form" : "payment") as "payment" | "form",
      title: link.title || "",
      description: link.description || "",
      fixedAmount: link.fixed_amount ? String(link.fixed_amount) : "",
      brandName: link.brand_name || "",
      brandLogoUrl: link.brand_logo_url || "",
      brandColor: link.brand_color || "#e2136e",
      brandWebsite: link.brand_website || "",
      brandFooterNote: link.brand_footer_note || "",
      hideSiteChrome: !!link.hide_site_chrome,
      requireOtp: !!link.require_otp,
      customFields: Array.isArray(link.custom_fields) ? (link.custom_fields as CustomField[]) : [],
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("টাইটেল দিন"); return; }
    setSaving(true);
    const payload: Record<string, any> = {
      mode: form.mode,
      title: form.title.trim(),
      description: form.description.trim() || null,
      fixed_amount: form.fixedAmount ? Number(form.fixedAmount) : null,
      brand_name: form.brandName.trim() || null,
      brand_logo_url: form.brandLogoUrl.trim() || null,
      brand_color: form.brandColor || null,
      brand_website: form.brandWebsite.trim() || null,
      brand_footer_note: form.brandFooterNote.trim() || null,
      hide_site_chrome: form.hideSiteChrome,
      require_otp: form.requireOtp,
      custom_fields: form.customFields.filter((f) => f.key.trim() && f.label.trim()),
    };

    let error;
    if (editingId) {
      ({ error } = await (supabase.from("payment_links" as any) as any)
        .update(payload).eq("id", editingId));
    } else {
      const { data: userData } = await supabase.auth.getUser();
      ({ error } = await (supabase.from("payment_links" as any) as any).insert({
        ...payload,
        token: genToken(),
        created_by: userData?.user?.id || null,
      }));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "আপডেট হয়েছে" : "পেমেন্ট লিংক তৈরি হয়েছে");
    setForm(emptyForm); setEditingId(null); setOpen(false);
    load();
  };

  const toggleActive = async (link: PaymentLink) => {
    const { error } = await (supabase.from("payment_links" as any) as any)
      .update({ is_active: !link.is_active })
      .eq("id", link.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const remove = async (link: PaymentLink) => {
    if (!confirm("লিংকটি ডিলিট করবেন?")) return;
    const { error } = await (supabase.from("payment_links" as any) as any).delete().eq("id", link.id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে");
    load();
  };

  const urlFor = (t: string) => `${window.location.origin}/pay/${t}`;

  const copy = async (t: string) => {
    await navigator.clipboard.writeText(urlFor(t));
    toast.success("লিংক কপি হয়েছে");
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Payment Links</h1>
          <p className="text-sm text-muted-foreground">bKash পেমেন্ট লিংক তৈরি করে কাস্টমারকে পাঠান — প্রতিটি লিংকের আলাদা ব্র্যান্ড/UI সেট করা যায়</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> নতুন লিংক</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "লিংক এডিট করুন" : "নতুন পেমেন্ট লিংক"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>লিংকের ধরন</Label>
              <select
                value={form.mode}
                onChange={(e) => set("mode", e.target.value as "payment" | "form")}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="payment">পেমেন্ট লিংক (bKash গেটওয়ে)</option>
                <option value="form">শুধু ফর্ম (তথ্য সংগ্রহ, পেমেন্ট নেই)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                "শুধু ফর্ম" নির্বাচন করলে টাকার অংক ও bKash বাটন থাকবে না — OTP যাচাইয়ের পর তথ্য সংরক্ষণ হবে।
              </p>
            </div>
            <div className="space-y-2">
              <Label>টাইটেল</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="যেমন: ওষুধের বিল পেমেন্ট" />
            </div>
            <div className="space-y-2">
              <Label>বিবরণ (ঐচ্ছিক)</Label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            {form.mode === "payment" && (
              <div className="space-y-2">
                <Label>নির্দিষ্ট টাকার অংক (ঐচ্ছিক)</Label>
                <Input type="number" value={form.fixedAmount} onChange={(e) => set("fixedAmount", e.target.value)} placeholder="খালি রাখলে কাস্টমার নিজে লিখবে" />
              </div>
            )}

            <div className="rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm">মোবাইল OTP যাচাই বাধ্যতামূলক</Label>
                  <p className="text-xs text-muted-foreground">চালু থাকলে ৪ ডিজিটের কোড দিয়ে নম্বর যাচাইয়ের পরই পেমেন্ট বাটন আসবে</p>
                </div>
                <Switch checked={form.requireOtp} onCheckedChange={(v) => set("requireOtp", v)} />
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">কাস্টম ফিল্ড</div>
                <Button type="button" size="sm" variant="outline" onClick={addField}>
                  <Plus className="h-4 w-4 mr-1" /> ফিল্ড যোগ
                </Button>
              </div>
              {form.customFields.length === 0 && (
                <p className="text-xs text-muted-foreground">ফর্মে অতিরিক্ত তথ্য নিতে চাইলে ফিল্ড যোগ করুন (যেমন: রোগীর নাম, ইনভয়েস নম্বর)</p>
              )}
              {form.customFields.map((f, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} placeholder="লেবেল (যেমন: রোগীর নাম)" />
                    <Input value={f.key} onChange={(e) => updateField(i, { key: e.target.value.replace(/\s+/g, "_") })} placeholder="key (ইংরেজি)" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={f.placeholder || ""} onChange={(e) => updateField(i, { placeholder: e.target.value })} placeholder="প্লেসহোল্ডার" />
                    <select
                      value={f.type}
                      onChange={(e) => updateField(i, { type: e.target.value as CustomField["type"] })}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="text">টেক্সট</option>
                      <option value="number">নম্বর</option>
                      <option value="textarea">বড় টেক্সট</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs">
                      <Switch checked={!!f.required} onCheckedChange={(v) => updateField(i, { required: v })} />
                      বাধ্যতামূলক
                    </label>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeField(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Palette className="h-4 w-4 text-primary" /> ব্র্যান্ড / UI কাস্টমাইজেশন
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm">অন্য ওয়েবসাইটের জন্য (হোয়াইট-লেবেল)</Label>
                  <p className="text-xs text-muted-foreground">চালু করলে Sheikh Pharma হেডার/ফুটার লুকানো থাকবে</p>
                </div>
                <Switch checked={form.hideSiteChrome} onCheckedChange={(v) => set("hideSiteChrome", v)} />
              </div>

              <div className="space-y-2">
                <Label>ব্র্যান্ড নাম</Label>
                <Input value={form.brandName} onChange={(e) => set("brandName", e.target.value)} placeholder="যেমন: ABC Store" />
              </div>
              <div className="space-y-2">
                <Label>লোগো URL</Label>
                <Input value={form.brandLogoUrl} onChange={(e) => set("brandLogoUrl", e.target.value)} placeholder="https://.../logo.png" />
              </div>
              <div className="space-y-2">
                <Label>ব্র্যান্ড কালার</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(form.brandColor) ? form.brandColor : "#e2136e"}
                    onChange={(e) => set("brandColor", e.target.value)}
                    className="h-10 w-14 rounded-md border border-border bg-transparent"
                    aria-label="Brand color"
                  />
                  <Input value={form.brandColor} onChange={(e) => set("brandColor", e.target.value)} placeholder="#e2136e" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ওয়েবসাইট লিংক (ঐচ্ছিক)</Label>
                <Input value={form.brandWebsite} onChange={(e) => set("brandWebsite", e.target.value)} placeholder="https://example.com" />
              </div>
              <div className="space-y-2">
                <Label>ফুটার নোট (ঐচ্ছিক)</Label>
                <Input value={form.brandFooterNote} onChange={(e) => set("brandFooterNote", e.target.value)} placeholder="© 2026 ABC Store" />
              </div>
            </div>

            <Button className="w-full" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} {editingId ? "আপডেট করুন" : "তৈরি করুন"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle className="text-base">সব লিংক ({links.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : links.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">কোনো পেমেন্ট লিংক নেই</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>টাইটেল</TableHead>
                  <TableHead>ব্র্যান্ড</TableHead>
                  <TableHead>লিংক</TableHead>
                  <TableHead>অ্যামাউন্ট</TableHead>
                  <TableHead>সক্রিয়</TableHead>
                  <TableHead className="text-right">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{link.title}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        {link.brand_color && (
                          <span
                            className="h-3 w-3 rounded-full border border-border"
                            style={{ backgroundColor: link.brand_color }}
                          />
                        )}
                        <span>{link.brand_name || "—"}</span>
                        {link.hide_site_chrome && <Badge variant="secondary">White-label</Badge>}
                        {link.require_otp && <Badge variant="outline">OTP</Badge>}
                        {link.mode === "form" && <Badge>ফর্ম</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-xs">{urlFor(link.token)}</TableCell>
                    <TableCell>
                      {link.mode === "form" ? <Badge variant="secondary">—</Badge> : link.fixed_amount ? `৳${link.fixed_amount}` : <Badge variant="secondary">ওপেন</Badge>}
                    </TableCell>
                    <TableCell>
                      <Switch checked={link.is_active} onCheckedChange={() => toggleActive(link)} />
                    </TableCell>
                    <TableCell className="text-right space-x-1 whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(link)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => copy(link.token)}><Copy className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" asChild>
                        <a href={urlFor(link.token)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(link)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPaymentLinks;
