import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/logActivity";

interface BrandOption {
  id: string;
  name: string;
  logo_url?: string | null;
}

interface Props {
  value: string;
  onChange: (id: string) => void;
  brands: BrandOption[];
  /** When true, instantly creates an approved brand. When false, submits a brand_request. */
  isAdmin: boolean;
  /** Vendor id, required when isAdmin is false (for brand_requests). */
  vendorId?: string | null;
  /** Called after a brand is created/requested so the parent can refresh its list and optionally select. */
  onBrandCreated: (brand: { id?: string; name: string }) => void;
  placeholder?: string;
  triggerClassName?: string;
}

const BrandSelectWithCreate = ({
  value,
  onChange,
  brands,
  isAdmin,
  vendorId,
  onBrandCreated,
  placeholder = "Select brand",
  triggerClassName,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setName("");
    setLogoUrl("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `brands/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
    } catch (err: any) {
      toast.error(err.message || "Logo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Brand name is required");
      return;
    }
    setSaving(true);
    try {
      // Check duplicates (case-insensitive)
      const existing = brands.find((b) => b.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        onChange(existing.id);
        toast.info("Brand already exists — selected");
        setOpen(false);
        reset();
        return;
      }

      if (isAdmin) {
        const { data, error } = await supabase
          .from("brands")
          .insert({ name: trimmed, logo_url: logoUrl || null, status: "approved", is_active: true })
          .select()
          .single();
        if (error) throw error;
        toast.success("Brand created");
        logActivity({ action: "brand_created", details: `Brand: ${trimmed}`, entity_type: "brand", entity_id: data.id });
        onBrandCreated({ id: data.id, name: trimmed });
        onChange(data.id);
      } else {
        if (!vendorId) {
          toast.error("Vendor not loaded");
          return;
        }
        const { error } = await supabase.from("brand_requests").insert({
          vendor_id: vendorId,
          brand_name: trimmed,
          logo_url: logoUrl || null,
        });
        if (error) throw error;
        toast.success("Brand request submitted for approval");
        logActivity({ action: "brand_request_submitted", details: `Brand: ${trimmed}`, entity_type: "brand_request" });
        onBrandCreated({ name: trimmed });
      }
      setOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err.message || "Failed to save brand");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="icon" onClick={() => setOpen(true)} title="Create new brand">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAdmin ? "Create New Brand" : "Request New Brand"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Brand Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter brand name" autoFocus />
            </div>
            <div>
              <Label>Logo (optional)</Label>
              <div className="flex items-center gap-3 mt-1">
                <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {uploading ? "Uploading..." : "Choose Logo"}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                  </label>
                </Button>
                {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded object-cover border" />}
              </div>
            </div>
            {!isAdmin && (
              <p className="text-xs text-muted-foreground">
                Your brand request will be reviewed by an admin before it can be used.
              </p>
            )}
            <Button onClick={handleSubmit} disabled={saving || uploading} className="w-full">
              {saving ? "Saving..." : isAdmin ? "Create Brand" : "Submit Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BrandSelectWithCreate;
