import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Settings, Upload, X, Image as ImageIcon } from "lucide-react";
import { logActivity } from "@/lib/logActivity";
import BackButton from "@/components/BackButton";

const VendorSettings = () => {
  const { vendor: vendorData, loading: vendorLoading } = useVendor();
  const [vendor, setVendor] = useState<any>(null);
  const [form, setForm] = useState({ store_name: "", store_description: "", phone: "", address: "", logo_url: "" });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!vendorData) return;
    setVendor(vendorData);
    setForm({
      store_name: vendorData.store_name || "", store_description: vendorData.store_description || "",
      phone: vendorData.phone || "", address: vendorData.address || "", logo_url: vendorData.logo_url || "",
    });
  }, [vendorData]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `vendor-logo-${Date.now()}.${ext}`;
    const filePath = `logos/${fileName}`;
    const { error } = await supabase.storage.from("product-images").upload(filePath, file);
    if (error) { toast.error("Upload failed: " + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    setForm(prev => ({ ...prev, logo_url: data.publicUrl }));
    setUploading(false);
    toast.success("Logo uploaded!");
  };

  const removeLogo = () => {
    setForm(prev => ({ ...prev, logo_url: "" }));
  };

  const handleSave = async () => {
    if (!vendor) return;
    setLoading(true);
    const { error } = await supabase.from("vendors").update({
      store_name: form.store_name, store_description: form.store_description || null,
      phone: form.phone || null, address: form.address || null, logo_url: form.logo_url || null,
    }).eq("id", vendor.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Settings updated!");
      logActivity({ action: "vendor_settings_updated", details: `Store: ${form.store_name}`, entity_type: "vendor", entity_id: vendor.id });
    }
    setLoading(false);
  };

  if (vendorLoading || !vendor) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="p-3 sm:p-6">
      <BackButton className="mb-2" />
      <div className="mb-6 flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Store Settings</h1>
      </div>
      <Card className="max-w-lg">
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label>Store Name</Label>
            <Input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.store_description} onChange={(e) => setForm({ ...form, store_description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Store Logo</Label>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Choose Logo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
              </label>
              {form.logo_url ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-md border group">
                  <img src={form.logo_url} alt="Logo" className="h-full w-full object-cover" />
                  <button onClick={removeLogo} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Commission Rate: <span className="font-bold text-foreground">{vendor.commission_rate}%</span> (set by admin)
          </div>
          <Button onClick={handleSave} disabled={loading || uploading} className="w-full">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorSettings;
