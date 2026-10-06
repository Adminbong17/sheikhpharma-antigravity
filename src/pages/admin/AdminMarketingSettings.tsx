import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMarketingSettings } from "@/hooks/useMarketingSettings";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BarChart3, Facebook, Save, Code } from "lucide-react";
import BackButton from "@/components/BackButton";

const CURRENCIES = ["BDT", "USD", "EUR", "GBP", "INR", "AED", "SAR", "MYR", "SGD"];

const AdminMarketingSettings = () => {
  const { data: settings, isLoading } = useMarketingSettings();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    facebook_pixel_id: "",
    pixel_enabled: false,
    pixel_test_mode: false,
    default_currency: "BDT",
    google_analytics_id: "",
    ga_enabled: false,
    gtm_id: "",
    gtm_enabled: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        facebook_pixel_id: settings.facebook_pixel_id || "",
        pixel_enabled: settings.pixel_enabled ?? false,
        pixel_test_mode: settings.pixel_test_mode ?? false,
        default_currency: settings.default_currency || "BDT",
        google_analytics_id: settings.google_analytics_id || "",
        ga_enabled: settings.ga_enabled ?? false,
        gtm_id: settings.gtm_id || "",
        gtm_enabled: settings.gtm_enabled ?? false,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await (supabase.from("marketing_settings" as any) as any)
      .update({
        facebook_pixel_id: form.facebook_pixel_id || "",
        pixel_enabled: form.pixel_enabled,
        pixel_test_mode: form.pixel_test_mode,
        default_currency: form.default_currency,
        google_analytics_id: form.google_analytics_id || "",
        ga_enabled: form.ga_enabled,
        gtm_id: form.gtm_id || "",
        gtm_enabled: form.gtm_enabled,
      })
      .eq("id", settings.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Marketing settings saved!");
      queryClient.invalidateQueries({ queryKey: ["marketing-settings"] });
    }
    setSaving(false);
  };

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-2" />
      <div className="mb-6 flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Marketing Settings</h1>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Facebook Pixel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Facebook className="h-5 w-5" />
              Facebook Pixel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="pixel_id">Pixel ID</Label>
              <Input
                id="pixel_id"
                value={form.facebook_pixel_id}
                onChange={(e) => setForm({ ...form, facebook_pixel_id: e.target.value })}
                placeholder="e.g. 123456789012345"
              />
              <p className="text-xs text-muted-foreground">Facebook Events Manager থেকে Pixel ID সংগ্রহ করুন</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Enable Facebook Pixel</p>
                <p className="text-sm text-muted-foreground">সাইটে Pixel স্ক্রিপ্ট লোড হবে</p>
              </div>
              <Switch checked={form.pixel_enabled} onCheckedChange={(v) => setForm({ ...form, pixel_enabled: v })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Enable Test Mode</p>
                <p className="text-sm text-muted-foreground">ডিবাগিং এর জন্য — Events Manager এ Test Events দেখুন</p>
              </div>
              <Switch checked={form.pixel_test_mode} onCheckedChange={(v) => setForm({ ...form, pixel_test_mode: v })} />
            </div>
          </CardContent>
        </Card>

        {/* Google Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Google Analytics (GA4)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="ga_id">Measurement ID</Label>
              <Input
                id="ga_id"
                value={form.google_analytics_id}
                onChange={(e) => setForm({ ...form, google_analytics_id: e.target.value })}
                placeholder="e.g. G-XXXXXXXXXX"
              />
              <p className="text-xs text-muted-foreground">Google Analytics → Admin → Data Streams থেকে Measurement ID সংগ্রহ করুন</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Enable Google Analytics</p>
                <p className="text-sm text-muted-foreground">GA4 ট্র্যাকিং স্ক্রিপ্ট লোড হবে</p>
              </div>
              <Switch checked={form.ga_enabled} onCheckedChange={(v) => setForm({ ...form, ga_enabled: v })} />
            </div>
          </CardContent>
        </Card>

        {/* Google Tag Manager */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Google Tag Manager
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="gtm_id">Container ID</Label>
              <Input
                id="gtm_id"
                value={form.gtm_id}
                onChange={(e) => setForm({ ...form, gtm_id: e.target.value })}
                placeholder="e.g. GTM-XXXXXXX"
              />
              <p className="text-xs text-muted-foreground">Google Tag Manager → Container Settings থেকে Container ID সংগ্রহ করুন</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Enable Google Tag Manager</p>
                <p className="text-sm text-muted-foreground">GTM কন্টেইনার স্ক্রিপ্ট লোড হবে</p>
              </div>
              <Switch checked={form.gtm_enabled} onCheckedChange={(v) => setForm({ ...form, gtm_enabled: v })} />
            </div>
          </CardContent>
        </Card>

        {/* Shared: Default Currency */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Default Currency (for tracking events)</Label>
              <Select value={form.default_currency} onValueChange={(v) => setForm({ ...form, default_currency: v })}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save All Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminMarketingSettings;
