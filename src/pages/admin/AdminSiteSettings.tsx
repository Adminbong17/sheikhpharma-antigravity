import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Upload, X, Image as ImageIcon, Palette, CreditCard, Truck, CheckCircle, XCircle, Loader2, FileText, Store } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "react-router-dom";
import BackButton from "@/components/BackButton";

const COLOR_FIELDS = [
  { key: "primary_color", label: "Primary Color", desc: "বাটন, লিংক, হাইলাইট" },
  { key: "accent_color", label: "Accent Color", desc: "সেকেন্ডারি হাইলাইট" },
  { key: "background_color", label: "Background Color", desc: "পেজ ব্যাকগ্রাউন্ড" },
  { key: "foreground_color", label: "Text Color", desc: "মূল টেক্সট কালার" },
  { key: "card_color", label: "Card Color", desc: "কার্ড ব্যাকগ্রাউন্ড" },
  { key: "border_color", label: "Border Color", desc: "বর্ডার ও ইনপুট" },
  { key: "muted_color", label: "Muted Color", desc: "ম্যাচড/নিষ্ক্রিয় এলিমেন্ট" },
] as const;

const hslToHex = (hslStr: string): string => {
  const parts = hslStr.trim().split(/\s+/);
  if (parts.length < 3) return "#000000";
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHsl = (hex: string): string => {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

type FormState = {
  site_name: string;
  site_title: string;
  office_address: string;
  office_phone: string;
  office_email: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  accent_color: string;
  background_color: string;
  foreground_color: string;
  card_color: string;
  border_color: string;
  muted_color: string;
  uddoktapay_base_url: string;
  uddoktapay_api_key: string;
  uddoktapay_active: boolean;
  cod_delivery_charge: string;
  steadfast_api_key: string;
  steadfast_secret_key: string;
  bdcourier_api_key: string;
  carrybee_client_id: string;
  carrybee_client_secret: string;
  carrybee_client_context: string;
  carrybee_store_id: string;
  pathao_client_id: string;
  pathao_client_secret: string;
  pathao_username: string;
  pathao_password: string;
  pathao_store_id: string;
  pathao_base_url: string;
  is_multivendor: boolean;
  bkash_active: boolean;
  bkash_base_url: string;
  bkash_app_key: string;
  bkash_app_secret: string;
  bkash_username: string;
  bkash_password: string;
  bkash_uat_mode: boolean;
  bkash_uat_phones: string;
};

const AdminSiteSettings = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const queryClient = useQueryClient();
  const [hexInputs, setHexInputs] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>({
    site_name: "", site_title: "", office_address: "", office_phone: "", office_email: "", logo_url: "", favicon_url: "",
    primary_color: "24 95% 53%", accent_color: "24 100% 48%",
    background_color: "0 0% 96%", foreground_color: "0 0% 12%",
    card_color: "0 0% 100%", border_color: "0 0% 88%", muted_color: "0 0% 93%",
    uddoktapay_base_url: "https://sandbox.uddoktapay.com",
    uddoktapay_api_key: "",
    uddoktapay_active: false,
    cod_delivery_charge: "0",
    steadfast_api_key: "",
    steadfast_secret_key: "",
    bdcourier_api_key: "",
    carrybee_client_id: "",
    carrybee_client_secret: "",
    carrybee_client_context: "",
    carrybee_store_id: "",
    pathao_client_id: "",
    pathao_client_secret: "",
    pathao_username: "",
    pathao_password: "",
    pathao_store_id: "",
    pathao_base_url: "https://api-hermes.pathao.com",
    is_multivendor: false,
    bkash_active: false,
    bkash_base_url: "https://tokenized.sandbox.bka.sh/v1.2.0-beta",
    bkash_app_key: "",
    bkash_app_secret: "",
    bkash_username: "",
    bkash_password: "",
    bkash_uat_mode: true,
    bkash_uat_phones: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [bdCourierStatus, setBdCourierStatus] = useState<null | 'checking' | 'ok' | 'error'>(null);
  const [bdCourierMessage, setBdCourierMessage] = useState("");
  const [bdCourierPlan, setBdCourierPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);


  useEffect(() => {
    if (settings) {
      const newForm: FormState = {
        site_name: settings.site_name || "",
        site_title: settings.site_title || "",
        office_address: (settings as any).office_address || "",
        office_phone: (settings as any).office_phone || "",
        office_email: (settings as any).office_email || "",
        logo_url: settings.logo_url || "",
        favicon_url: settings.favicon_url || "",
        primary_color: settings.primary_color || "24 95% 53%",
        accent_color: settings.accent_color || "24 100% 48%",
        background_color: settings.background_color || "0 0% 96%",
        foreground_color: settings.foreground_color || "0 0% 12%",
        card_color: settings.card_color || "0 0% 100%",
        border_color: settings.border_color || "0 0% 88%",
        muted_color: settings.muted_color || "0 0% 93%",
        uddoktapay_base_url: (settings as any).uddoktapay_base_url || "https://sandbox.uddoktapay.com",
        uddoktapay_api_key: (settings as any).uddoktapay_api_key || "",
        uddoktapay_active: (settings as any).uddoktapay_active ?? false,
        cod_delivery_charge: String((settings as any).cod_delivery_charge ?? 0),
        steadfast_api_key: (settings as any).steadfast_api_key || "",
        steadfast_secret_key: (settings as any).steadfast_secret_key || "",
        bdcourier_api_key: (settings as any).bdcourier_api_key || "",
        carrybee_client_id: (settings as any).carrybee_client_id || "",
        carrybee_client_secret: (settings as any).carrybee_client_secret || "",
        carrybee_client_context: (settings as any).carrybee_client_context || "",
        carrybee_store_id: (settings as any).carrybee_store_id || "",
        pathao_client_id: (settings as any).pathao_client_id || "",
        pathao_client_secret: (settings as any).pathao_client_secret || "",
        pathao_username: (settings as any).pathao_username || "",
        pathao_password: (settings as any).pathao_password || "",
        pathao_store_id: (settings as any).pathao_store_id || "",
        pathao_base_url: (settings as any).pathao_base_url || "https://api-hermes.pathao.com",
        is_multivendor: (settings as any).is_multivendor ?? false,
        bkash_active: (settings as any).bkash_active ?? false,
        bkash_base_url: (settings as any).bkash_base_url || "https://tokenized.sandbox.bka.sh/v1.2.0-beta",
        bkash_app_key: (settings as any).bkash_app_key || "",
        bkash_uat_mode: (settings as any).bkash_uat_mode ?? true,
        bkash_uat_phones: (settings as any).bkash_uat_phones || "",
        bkash_app_secret: (settings as any).bkash_app_secret || "",
        bkash_username: (settings as any).bkash_username || "",
        bkash_password: (settings as any).bkash_password || "",
      };
      setForm(newForm);
      // Initialize hex inputs from saved HSL values
      const initHex: Record<string, string> = {};
      COLOR_FIELDS.forEach(({ key }) => {
        initHex[key] = hslToHex(newForm[key]).toUpperCase();
      });
      setHexInputs(initHex);
    }
  }, [settings]);

  const getBdCourierSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      token: session?.access_token,
      SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
  };

  const checkBdCourierConnection = async () => {
    if (!form.bdcourier_api_key) {
      toast.error("Please enter and save a BDCourier API Key first.");
      return;
    }
    setBdCourierStatus('checking');
    setBdCourierMessage("");
    try {
      const { token, SUPABASE_URL, SUPABASE_ANON_KEY } = await getBdCourierSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bdcourier?action=check-connection`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY },
      });
      const data = await res.json();
      if (data.status === 'success' && data.data?.connected) {
        setBdCourierStatus('ok');
        setBdCourierMessage(`Connected ✓ (User ID: ${data.data.user_id})`);
      } else {
        setBdCourierStatus('error');
        setBdCourierMessage(data.message || data.error || 'Connection failed');
      }
    } catch (e: any) {
      setBdCourierStatus('error');
      setBdCourierMessage(e.message || 'Connection failed');
    }
  };

  const fetchBdCourierPlan = async () => {
    if (!form.bdcourier_api_key) {
      toast.error("Please enter and save a BDCourier API Key first.");
      return;
    }
    setLoadingPlan(true);
    setBdCourierPlan(null);
    try {
      const { token, SUPABASE_URL, SUPABASE_ANON_KEY } = await getBdCourierSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bdcourier?action=my-plan`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY },
      });
      const data = await res.json();
      if (data.status === 'success') {
        setBdCourierPlan(data.data);
      } else {
        toast.error(data.message || 'Failed to fetch plan');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error fetching plan');
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleUpload = async (file: File, type: "logo" | "favicon") => {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    const setter = type === "logo" ? setUploadingLogo : setUploadingFavicon;
    setter(true);
    const ext = file.name.split(".").pop();
    const fileName = `site-${type}-${Date.now()}.${ext}`;
    const filePath = `site/${fileName}`;
    const { error } = await supabase.storage.from("product-images").upload(filePath, file);
    if (error) { toast.error("Upload failed: " + error.message); setter(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    setForm(prev => ({ ...prev, [type === "logo" ? "logo_url" : "favicon_url"]: data.publicUrl }));
    setter(false);
    toast.success(`${type === "logo" ? "Logo" : "Favicon"} uploaded!`);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await (supabase.from("site_settings" as any) as any)
      .update({
        site_name: form.site_name,
        site_title: form.site_title,
        logo_url: form.logo_url || null,
        favicon_url: form.favicon_url || null,
        primary_color: form.primary_color,
        accent_color: form.accent_color,
        background_color: form.background_color,
        foreground_color: form.foreground_color,
        card_color: form.card_color,
        border_color: form.border_color,
        muted_color: form.muted_color,
        uddoktapay_base_url: form.uddoktapay_base_url || null,
        uddoktapay_api_key: form.uddoktapay_api_key || null,
        uddoktapay_active: form.uddoktapay_active,
        cod_delivery_charge: parseFloat(form.cod_delivery_charge) || 0,
        steadfast_api_key: form.steadfast_api_key || null,
        steadfast_secret_key: form.steadfast_secret_key || null,
        bdcourier_api_key: form.bdcourier_api_key || null,
        carrybee_client_id: form.carrybee_client_id || null,
        carrybee_client_secret: form.carrybee_client_secret || null,
        carrybee_client_context: form.carrybee_client_context || null,
        carrybee_store_id: form.carrybee_store_id || null,
        pathao_client_id: form.pathao_client_id || null,
        pathao_client_secret: form.pathao_client_secret || null,
        pathao_username: form.pathao_username || null,
        pathao_password: form.pathao_password || null,
        pathao_store_id: form.pathao_store_id || null,
        pathao_base_url: form.pathao_base_url || null,
        office_address: form.office_address || null,
        office_phone: form.office_phone || null,
        office_email: form.office_email || null,
        is_multivendor: form.is_multivendor,
        bkash_active: form.bkash_active,
        bkash_base_url: form.bkash_base_url || null,
        bkash_app_key: form.bkash_app_key || null,
        bkash_app_secret: form.bkash_app_secret || null,
        bkash_username: form.bkash_username || null,
        bkash_password: form.bkash_password || null,
        bkash_uat_mode: form.bkash_uat_mode,
        bkash_uat_phones: form.bkash_uat_phones || null,
      })
      .eq("id", settings.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Site settings updated!");
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    }
    setSaving(false);
  };

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="p-3 sm:p-6">
      <BackButton className="mb-2" />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Site Settings</h1>
        <Link to="/admin/static-pages" className="ml-auto">
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
            <FileText className="h-4 w-4" /> Footer Pages
          </Button>
        </Link>
      </div>
      
      {/* Footer Pages - Mobile friendly link */}
      <div className="mb-4 lg:hidden">
        <Link to="/admin/static-pages">
          <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
            <FileText className="h-4 w-4" /> Footer Pages ম্যানেজ করুন
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General Settings */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> General</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Multivendor Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/50">
              <div className="flex items-center gap-3">
                <Store className="h-5 w-5 text-primary" />
                <div>
                  <Label className="text-sm font-semibold">Multivendor Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    {form.is_multivendor ? "Multiple vendors can sell products" : "Single store — only admin manages products"}
                  </p>
                </div>
              </div>
              <Switch
                checked={form.is_multivendor}
                onCheckedChange={(checked) => setForm({ ...form, is_multivendor: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} placeholder="E-Shop" />
              <p className="text-xs text-muted-foreground">Navbar এবং Footer এ দেখাবে</p>
            </div>
            <div className="space-y-2">
              <Label>Site Title</Label>
              <Input value={form.site_title} onChange={(e) => setForm({ ...form, site_title: e.target.value })} placeholder="E-Shop - Best Online Store" />
              <p className="text-xs text-muted-foreground">ব্রাউজার ট্যাবে দেখাবে</p>
            </div>
            <div className="space-y-2">
              <Label>Office Address</Label>
              <Input value={form.office_address} onChange={(e) => setForm({ ...form, office_address: e.target.value })} placeholder="123 Main Street, Dhaka, Bangladesh" />
              <p className="text-xs text-muted-foreground">প্রিন্ট লেটারহেডে দেখাবে</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Office Phone</Label>
                <Input value={form.office_phone} onChange={(e) => setForm({ ...form, office_phone: e.target.value })} placeholder="+880 1XXX-XXXXXX" />
              </div>
              <div className="space-y-2">
                <Label>Office Email</Label>
                <Input value={form.office_email} onChange={(e) => setForm({ ...form, office_email: e.target.value })} placeholder="info@example.com" />
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Site Logo</Label>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                  <Upload className="h-4 w-4" />
                  {uploadingLogo ? "Uploading..." : "Choose Logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "logo")} disabled={uploadingLogo} />
                </label>
                {form.logo_url ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-md border group">
                    <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain" />
                    <button onClick={() => setForm(prev => ({ ...prev, logo_url: "" }))} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Favicon Upload */}
            <div className="space-y-2">
              <Label>Favicon</Label>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                  <Upload className="h-4 w-4" />
                  {uploadingFavicon ? "Uploading..." : "Choose Favicon"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "favicon")} disabled={uploadingFavicon} />
                </label>
                {form.favicon_url ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-md border group">
                    <img src={form.favicon_url} alt="Favicon" className="h-full w-full object-contain" />
                    <button onClick={() => setForm(prev => ({ ...prev, favicon_url: "" }))} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">ব্রাউজার ট্যাবের ছোট আইকন</p>
            </div>
          </CardContent>
        </Card>

        {/* Color Customization */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Theme Colors</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {COLOR_FIELDS.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={hexInputs[key] && /^#[0-9A-Fa-f]{6}$/.test(hexInputs[key]) ? hexInputs[key] : hslToHex(form[key])}
                  onChange={(e) => {
                    const hex = e.target.value.toUpperCase();
                    setHexInputs(prev => ({ ...prev, [key]: hex }));
                    setForm(prev => ({ ...prev, [key]: hexToHsl(hex) }));
                  }}
                  className="h-10 w-10 cursor-pointer rounded border border-input p-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Input
                  value={hexInputs[key] ?? hslToHex(form[key]).toUpperCase()}
                  onChange={(e) => {
                    let raw = e.target.value.toUpperCase();
                    setHexInputs(prev => ({ ...prev, [key]: raw }));
                    let val = raw.trim();
                    if (!val.startsWith("#")) val = "#" + val;
                    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                      setForm(prev => ({ ...prev, [key]: hexToHsl(val) }));
                    }
                  }}
                  placeholder="#FFFFFF"
                  className="w-24 font-mono text-xs"
                />
                <div
                  className="h-8 w-8 rounded-md border shrink-0"
                  style={{ backgroundColor: `hsl(${form[key]})` }}
                />
              </div>
            ))}

            {/* Live Preview */}
            <div className="mt-4 rounded-lg border p-4" style={{ backgroundColor: `hsl(${form.background_color})` }}>
              <p className="text-xs font-medium mb-2" style={{ color: `hsl(${form.foreground_color})` }}>লাইভ প্রিভিউ</p>
              <div className="rounded-md p-3 mb-2" style={{ backgroundColor: `hsl(${form.card_color})`, borderColor: `hsl(${form.border_color})`, borderWidth: 1 }}>
                <p className="text-sm" style={{ color: `hsl(${form.foreground_color})` }}>কার্ড কন্টেন্ট</p>
              </div>
              <div className="flex gap-2">
                <div className="rounded px-3 py-1 text-xs text-white" style={{ backgroundColor: `hsl(${form.primary_color})` }}>Primary</div>
                <div className="rounded px-3 py-1 text-xs text-white" style={{ backgroundColor: `hsl(${form.accent_color})` }}>Accent</div>
                <div className="rounded px-3 py-1 text-xs" style={{ backgroundColor: `hsl(${form.muted_color})`, color: `hsl(${form.foreground_color})` }}>Muted</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* UddoktaPay Settings */}
      <Collapsible defaultOpen className="mt-6">
        <Card>
          <CardHeader className="cursor-pointer">
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> UddoktaPay Settings
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{form.uddoktapay_active ? "Active" : "Inactive"}</span>
                <Switch
                  checked={form.uddoktapay_active}
                  onCheckedChange={(v) => { setForm({ ...form, uddoktapay_active: v }); }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Base URL (API Endpoint)</Label>
                <Input
                  value={form.uddoktapay_base_url}
                  onChange={(e) => setForm({ ...form, uddoktapay_base_url: e.target.value })}
                  placeholder="https://sandbox.uddoktapay.com"
                />
                <p className="text-xs text-muted-foreground">
                  Sandbox: https://sandbox.uddoktapay.com<br />
                  Production: https://pay.yourdomain.com
                </p>
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={form.uddoktapay_api_key}
                  onChange={(e) => setForm({ ...form, uddoktapay_api_key: e.target.value })}
                  placeholder="আপনার UddoktaPay API Key"
                />
                <p className="text-xs text-muted-foreground">
                  UddoktaPay Dashboard থেকে API Key সংগ্রহ করুন
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* bKash PGW Settings */}
      <Collapsible defaultOpen className="mt-6">
        <Card>
          <CardHeader className="cursor-pointer">
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> bKash PGW Settings
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{form.bkash_active ? "Active" : "Inactive"}</span>
                <Switch
                  checked={form.bkash_active}
                  onCheckedChange={(v) => { setForm({ ...form, bkash_active: v }); }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Base URL</Label>
                  <Input
                    value={form.bkash_base_url}
                    onChange={(e) => setForm({ ...form, bkash_base_url: e.target.value })}
                    placeholder="https://tokenized.sandbox.bka.sh/v2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sandbox: https://tokenized.sandbox.bka.sh/v1.2.0-beta<br />
                    Production: https://tokenized.pay.bka.sh/v1.2.0-beta
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>App Key</Label>
                  <Input
                    type="password"
                    value={form.bkash_app_key}
                    onChange={(e) => setForm({ ...form, bkash_app_key: e.target.value })}
                    placeholder="bKash App Key"
                  />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>App Secret</Label>
                  <Input
                    type="password"
                    value={form.bkash_app_secret}
                    onChange={(e) => setForm({ ...form, bkash_app_secret: e.target.value })}
                    placeholder="bKash App Secret"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={form.bkash_username}
                    onChange={(e) => setForm({ ...form, bkash_username: e.target.value })}
                    placeholder="bKash Merchant Username"
                  />
                </div>
              </div>
              <div className="max-w-sm space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={form.bkash_password}
                  onChange={(e) => setForm({ ...form, bkash_password: e.target.value })}
                  placeholder="bKash Merchant Password"
                />
              </div>
              <div className="border-t my-4" />
              <div className="space-y-4">
                <h4 className="font-medium text-sm">UAT Mode (Hide from general users)</h4>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.bkash_uat_mode}
                    onCheckedChange={(v) => setForm({ ...form, bkash_uat_mode: v })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.bkash_uat_mode ? "ON — Only listed phones can see bKash" : "OFF — All users can see bKash"}
                  </span>
                </div>
                {form.bkash_uat_mode && (
                  <div className="space-y-2">
                    <Label>UAT Phone Numbers (comma-separated)</Label>
                    <Input
                      value={form.bkash_uat_phones}
                      onChange={(e) => setForm({ ...form, bkash_uat_phones: e.target.value })}
                      placeholder="01XXXXXXXXX, 01YYYYYYYYY"
                    />
                    <p className="text-xs text-muted-foreground">
                      Only these phone numbers will see the bKash payment option at checkout during UAT.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* COD Delivery Charge */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Cash on Delivery (COD) Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="max-w-sm space-y-2">
          <Label>Advance Delivery Charge (৳)</Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={form.cod_delivery_charge}
            onChange={(e) => setForm({ ...form, cod_delivery_charge: e.target.value })}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            COD অর্ডারে এই চার্জটি আলাদা line item হিসেবে যোগ হবে। 0 রাখলে কোনো চার্জ হবে না।
          </p>
        </CardContent>
      </Card>


      {/* Steadfast Courier Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Steadfast Courier Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={form.steadfast_api_key}
              onChange={(e) => setForm({ ...form, steadfast_api_key: e.target.value })}
              placeholder="Steadfast API Key"
            />
            <p className="text-xs text-muted-foreground">
              Steadfast Portal থেকে API Key সংগ্রহ করুন
            </p>
          </div>
          <div className="space-y-2">
            <Label>Secret Key</Label>
            <Input
              type="password"
              value={form.steadfast_secret_key}
              onChange={(e) => setForm({ ...form, steadfast_secret_key: e.target.value })}
              placeholder="Steadfast Secret Key"
            />
            <p className="text-xs text-muted-foreground">
              Steadfast Portal থেকে Secret Key সংগ্রহ করুন
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CarryBee Courier Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> CarryBee Courier Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input
                type="password"
                value={form.carrybee_client_id}
                onChange={(e) => setForm({ ...form, carrybee_client_id: e.target.value })}
                placeholder="CarryBee Client ID"
              />
              <p className="text-xs text-muted-foreground">
                CarryBee Dashboard থেকে Client ID সংগ্রহ করুন
              </p>
            </div>
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <Input
                type="password"
                value={form.carrybee_client_secret}
                onChange={(e) => setForm({ ...form, carrybee_client_secret: e.target.value })}
                placeholder="CarryBee Client Secret"
              />
              <p className="text-xs text-muted-foreground">
                CarryBee Dashboard থেকে Client Secret সংগ্রহ করুন
              </p>
            </div>
            <div className="space-y-2">
              <Label>Client Context</Label>
              <Input
                type="password"
                value={form.carrybee_client_context}
                onChange={(e) => setForm({ ...form, carrybee_client_context: e.target.value })}
                placeholder="CarryBee Client Context"
              />
              <p className="text-xs text-muted-foreground">
                CarryBee Dashboard থেকে Client Context সংগ্রহ করুন
              </p>
            </div>
          </div>
          <div className="space-y-2 max-w-sm">
            <Label>Store ID</Label>
            <Input
              value={form.carrybee_store_id}
              onChange={(e) => setForm({ ...form, carrybee_store_id: e.target.value })}
              placeholder="CarryBee Store ID (e.g. abcd-1234)"
            />
            <p className="text-xs text-muted-foreground">
              CarryBee তে Store তৈরি করে Store ID এখানে দিন। অর্ডার তৈরিতে এটি ব্যবহার হবে।
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pathao Courier Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Pathao Courier Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input
                type="password"
                value={form.pathao_client_id}
                onChange={(e) => setForm({ ...form, pathao_client_id: e.target.value })}
                placeholder="Pathao Client ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <Input
                type="password"
                value={form.pathao_client_secret}
                onChange={(e) => setForm({ ...form, pathao_client_secret: e.target.value })}
                placeholder="Pathao Client Secret"
              />
            </div>
            <div className="space-y-2">
              <Label>Username (Email)</Label>
              <Input
                value={form.pathao_username}
                onChange={(e) => setForm({ ...form, pathao_username: e.target.value })}
                placeholder="Pathao Merchant Email"
              />
              <p className="text-xs text-muted-foreground">
                Pathao Merchant Panel এ লগইনের ইমেইল
              </p>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={form.pathao_password}
                onChange={(e) => setForm({ ...form, pathao_password: e.target.value })}
                placeholder="Pathao Merchant Password"
              />
              <p className="text-xs text-muted-foreground">
                Pathao Merchant Panel এ লগইনের পাসওয়ার্ড
              </p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Store ID</Label>
              <Input
                value={form.pathao_store_id}
                onChange={(e) => setForm({ ...form, pathao_store_id: e.target.value })}
                placeholder="Pathao Store ID"
              />
              <p className="text-xs text-muted-foreground">
                Pathao Merchant Panel → Stores থেকে Store ID সংগ্রহ করুন
              </p>
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                value={form.pathao_base_url}
                onChange={(e) => setForm({ ...form, pathao_base_url: e.target.value })}
                placeholder="https://api-hermes.pathao.com"
              />
              <p className="text-xs text-muted-foreground">
                Production: https://api-hermes.pathao.com<br />
                Staging: https://hermes-api.p-stageenv.xyz
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BDCourier Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> BDCourier Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={form.bdcourier_api_key}
              onChange={(e) => { setForm({ ...form, bdcourier_api_key: e.target.value }); setBdCourierStatus(null); setBdCourierPlan(null); }}
              placeholder="BDCourier API Key"
            />
            <p className="text-xs text-muted-foreground">
              BDCourier Dashboard থেকে API Key সংগ্রহ করুন।
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={checkBdCourierConnection} disabled={bdCourierStatus === 'checking'}>
              {bdCourierStatus === 'checking' ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking...</> : 'Check Connection'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={fetchBdCourierPlan} disabled={loadingPlan}>
              {loadingPlan ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</> : 'My Plan'}
            </Button>
            {bdCourierStatus === 'ok' && (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" /> {bdCourierMessage}
              </span>
            )}
            {bdCourierStatus === 'error' && (
              <span className="flex items-center gap-1 text-sm text-destructive">
                <XCircle className="h-4 w-4" /> {bdCourierMessage}
              </span>
            )}
          </div>

          {/* Plan info */}
          {bdCourierPlan && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{bdCourierPlan.plan_name || 'Unknown Plan'}</p>
                  <p className="text-xs text-muted-foreground capitalize">{bdCourierPlan.frequency} · {bdCourierPlan.plan_type}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${bdCourierPlan.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-destructive/10 text-destructive'}`}>
                  {bdCourierPlan.status}
                </span>
              </div>
              {bdCourierPlan.has_subscription && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border bg-card p-2 text-center">
                    <p className="text-xs text-muted-foreground">Free Calls Left</p>
                    <p className="font-bold text-lg">{bdCourierPlan.remaining_free_calls ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">of {bdCourierPlan.call_limit}</p>
                  </div>
                  <div className="rounded-md border bg-card p-2 text-center">
                    <p className="text-xs text-muted-foreground">Paid Calls Left</p>
                    <p className="font-bold text-lg">{bdCourierPlan.remaining_paid_calls ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">of {bdCourierPlan.paid_limit}</p>
                  </div>
                  <div className="rounded-md border bg-card p-2 text-center col-span-2">
                    <p className="text-xs text-muted-foreground">Expires</p>
                    <p className="font-medium">{bdCourierPlan.expires_at ? new Date(bdCourierPlan.expires_at).toLocaleDateString() : '—'} · {bdCourierPlan.days_remaining} days remaining</p>
                  </div>
                </div>
              )}
              {!bdCourierPlan.has_subscription && (
                <p className="text-sm text-muted-foreground">No active subscription. Please subscribe to a plan on BDCourier to use the API.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 max-w-lg">
        <Button onClick={handleSave} disabled={saving || uploadingLogo || uploadingFavicon} className="w-full">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

export default AdminSiteSettings;
