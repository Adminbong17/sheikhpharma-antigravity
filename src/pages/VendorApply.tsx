import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Store, Upload, ImageIcon, CreditCard } from "lucide-react";

const VendorApply = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ store_name: "", store_description: "", phone: "", address: "", email: "" });
  const [nidFile, setNidFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [nidPreview, setNidPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleFileChange = (file: File | null, type: "nid" | "logo") => {
    if (!file) return;
    if (type === "nid") {
      setNidFile(file);
      setNidPreview(URL.createObjectURL(file));
    } else {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please login first"); navigate("/login"); return; }
    if (!form.store_name.trim()) { toast.error("Store name is required"); return; }
    setLoading(true);
    try {
      let logoUrl: string | null = null;
      let nidUrl: string | null = null;

      if (logoFile) {
        logoUrl = await uploadFile(logoFile, "avatars", `vendor-logos/${user.id}-${Date.now()}`);
      }
      if (nidFile) {
        nidUrl = await uploadFile(nidFile, "avatars", `vendor-nids/${user.id}-${Date.now()}`);
      }

      const { error } = await (supabase.from("vendors") as any).insert({
        user_id: user.id,
        store_name: form.store_name,
        store_description: form.store_description || null,
        phone: form.phone || null,
        address: form.address || null,
        email: form.email || null,
        logo_url: logoUrl,
        nid_url: nidUrl,
      });
      if (error) {
        if (error.code === "23505") { toast.error("You have already applied as a vendor"); }
        else { toast.error(error.message); }
      } else {
        toast.success("Vendor application submitted! Your store will be activated once approved by admin.");
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-4"><BackButton /></div>
        <div className="flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Become a Vendor</CardTitle>
            <CardDescription>Open your store and start selling products</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Store Name *</Label>
                <Input required value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} placeholder="e.g. Fashion Hub" />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Store Description</Label>
                <Textarea value={form.store_description} onChange={(e) => setForm({ ...form, store_description: e.target.value })} placeholder="Tell us about your store..." />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Your business address" />
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><ImageIcon className="h-4 w-4" /> Store Logo</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-4 transition-colors hover:border-primary/50 hover:bg-muted/50">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="h-20 w-20 rounded-lg object-cover" />
                  ) : (
                    <>
                      <Upload className="mb-1 h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload store logo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] || null, "logo")} />
                </label>
              </div>

              {/* NID Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> NID (National ID Card)</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-4 transition-colors hover:border-primary/50 hover:bg-muted/50">
                  {nidPreview ? (
                    <img src={nidPreview} alt="NID preview" className="h-20 w-auto rounded-lg object-cover" />
                  ) : (
                    <>
                      <Upload className="mb-1 h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload NID photo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] || null, "nid")} />
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
            </CardContent>
          </form>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default VendorApply;
