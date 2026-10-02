import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle, Loader2, Plus, Trash2, Pill, Search, MapPin, Star, BookOpen, Check, Pencil, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";
import { getMedicinePricing } from "@/lib/medicinePricing";

interface SavedAddress {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  division: string;
  zilla: string | null;
  upazilla: string | null;
  is_default: boolean;
}

interface DeliveryZone {
  id: string;
  division: string;
  zilla: string | null;
  upazilla: string | null;
  charge: number;
}

interface Medicine {
  name: string;
  quantity: string;
  price: number | null;
  pcsPerUnit: string;
  priceUnit: string;
  notes: string;
}

interface ProductSuggestion {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  price_unit: string | null;
  specification: string | null;
}

const MedicineSearchInput = ({
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect: (product: ProductSuggestion) => void;
  placeholder: string;
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchProducts = async (term: string) => {
    if (term.trim().length < 2) { setSuggestions([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("id, name, price, image_url, price_unit, specification")
      .ilike("name", `%${term.trim()}%`)
      .eq("is_active", true)
      .limit(8);
    setSuggestions((data || []) as ProductSuggestion[]);
    setLoading(false);
  };

  const handleChange = (val: string) => {
    setQuery(val);
    onChange(val);
    setShowDropdown(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchProducts(val), 300);
  };

  const selectProduct = (product: ProductSuggestion) => {
    setQuery(product.name);
    onSelect(product);
    setShowDropdown(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          className="pl-8"
        />
      </div>
      {showDropdown && (suggestions.length > 0 || loading) && (
        <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
          {!loading && suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left text-sm"
              onClick={() => selectProduct(p)}
            >
              {p.image_url ? (
                <img src={p.image_url} alt="" className="h-8 w-8 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Pill className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">৳{p.price}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const PrescriptionUpload = () => {
  const { user } = useAuth();
  const { addItem, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();
  // Upload tab state
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [prescriptionUrl, setPrescriptionUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedZilla, setSelectedZilla] = useState("");
  const [selectedUpazilla, setSelectedUpazilla] = useState("");

  // Make prescription tab state
  const [makeSubmitting, setMakeSubmitting] = useState(false);
  const [makeSubmitted, setMakeSubmitted] = useState(false);
  const [makeForm, setMakeForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [makeDivision, setMakeDivision] = useState("");
  const [makeZilla, setMakeZilla] = useState("");
  const [makeUpazilla, setMakeUpazilla] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([
    { name: "", quantity: "", price: null, pcsPerUnit: "", priceUnit: "", notes: "" },
  ]);
  const [confirmedMeds, setConfirmedMeds] = useState<Set<number>>(new Set());

  const confirmMedicine = (index: number) => {
    if (!medicines[index].name.trim()) { toast.error("Medicine name is required"); return; }
    setConfirmedMeds((prev) => new Set(prev).add(index));
  };
  const editMedicine = (index: number) => {
    setConfirmedMeds((prev) => { const n = new Set(prev); n.delete(index); return n; });
  };

  // Saved addresses
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ["prescription-saved-addresses", user?.id],
    queryFn: async () => {
      const { data } = await (supabase.from("user_addresses" as any) as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      return (data || []) as SavedAddress[];
    },
    enabled: !!user,
  });

  // Delivery zones
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  useEffect(() => {
    (supabase.from("delivery_zones" as any) as any).select("*").eq("is_active", true).then(({ data }: any) => {
      if (data) setDeliveryZones(data as DeliveryZone[]);
    });
  }, []);

  const divisions = useMemo(() => [...new Set(deliveryZones.map((z) => z.division))].sort(), [deliveryZones]);
  const getZillas = (div: string) => [...new Set(deliveryZones.filter((z) => z.division === div && z.zilla).map((z) => z.zilla!))].sort();
  const getUpazillas = (div: string, zil: string) => [...new Set(deliveryZones.filter((z) => z.division === div && z.zilla === zil && z.upazilla).map((z) => z.upazilla!))].sort();

  const applySavedAddress = (addr: SavedAddress, target: "upload" | "make") => {
    if (target === "upload") {
      setForm((p) => ({ ...p, name: addr.full_name, phone: addr.phone, address: addr.address }));
      setSelectedDivision(addr.division);
      setSelectedZilla(addr.zilla || "");
      setSelectedUpazilla(addr.upazilla || "");
    } else {
      setMakeForm((p) => ({ ...p, name: addr.full_name, phone: addr.phone, address: addr.address }));
      setMakeDivision(addr.division);
      setMakeZilla(addr.zilla || "");
      setMakeUpazilla(addr.upazilla || "");
    }
    toast.success("Address applied!");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("prescriptions").upload(fileName, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) { toast.error("Upload failed: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("prescriptions").getPublicUrl(fileName);
    setPrescriptionUrl(urlData.publicUrl);
    const isImage = (file.type || "").startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif|svg|tiff?)$/i.test(file.name);
    setPreviewUrl(isImage ? urlData.publicUrl : "");
    setUploading(false);
    toast.success("Prescription uploaded!");
  };

  const handleUploadSubmit = async () => {
    if (!prescriptionUrl) { toast.error("Please upload a prescription first"); return; }
    if (!form.name.trim()) { toast.error("Please enter your name"); return; }
    if (!form.phone.trim()) { toast.error("Please enter your phone number"); return; }
    setSubmitting(true);
    const { error } = await (supabase.from("prescription_orders" as any) as any).insert({
      user_id: user?.id || null,
      customer_name: form.name.trim(),
      customer_phone: form.phone.trim(),
      customer_address: form.address.trim() || null,
      customer_division: selectedDivision || null,
      customer_zilla: selectedZilla || null,
      customer_upazilla: selectedUpazilla || null,
      prescription_url: prescriptionUrl,
      notes: form.notes.trim() || null,
    });
    if (error) { toast.error("Failed to submit"); setSubmitting(false); return; }
    await (supabase.from("notifications" as any) as any).insert({
      target_role: "admin",
      title: "New Prescription Order",
      body: `${form.name} submitted a prescription order. Phone: ${form.phone}`,
      type: "prescription",
      action_url: "/admin/prescriptions",
    });
    setSubmitted(true);
    setSubmitting(false);
    toast.success("Prescription submitted successfully!");
  };

  const addMedicine = () => {
    setMedicines([...medicines, { name: "", quantity: "", price: null, pcsPerUnit: "", priceUnit: "", notes: "" }]);
  };

  const removeMedicine = (index: number) => {
    if (medicines.length === 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const updateMedicine = (index: number, field: keyof Medicine, value: string | number | null) => {
    const updated = [...medicines];
    (updated[index] as any)[field] = value;
    setMedicines(updated);
  };

  const parsePcsFromUnit = (unit: string | null): string => {
    if (!unit) return "";
    // Look for pattern like "(10 pcs)" or "(10)" or "10 pcs"
    const bracketMatch = unit.match(/\((\d+)\s*(?:pcs|pc|pieces?)?\)/i);
    if (bracketMatch) return bracketMatch[1];
    // Look for standalone number followed by pcs
    const pcsMatch = unit.match(/(\d+)\s*(?:pcs|pc|pieces?)/i);
    if (pcsMatch) return pcsMatch[1];
    // Fallback: any number in the string (but skip decimals in names)
    const numMatch = unit.match(/(\d+)/);
    return numMatch ? numMatch[1] : "";
  };

  // Units sold as a whole item (bottle, tube, pack, diaper...) — never split per piece
  const WHOLE_UNIT_RE = /(ml|litre|liter|bottle|syrup|suspension|solution|cream|ointment|tube|gel|lotion|drop|spray|inhaler|pack|box|diaper|tissue|bud|wipe|soap|shampoo|sachet|vial|ampoule|amp|powder|jar|tin|can|bag)/i;

  // Resolve pcs per unit: only strip/pcs-type medicine items get per-piece pricing.
  // Whole-unit items (bottle, pack, tube...) are sold per unit.
  const resolvePcsPerUnit = (product: ProductSuggestion): string => {
    const unit = product.price_unit || "";
    if (WHOLE_UNIT_RE.test(unit)) return "1";
    const fromUnit = parsePcsFromUnit(unit);
    if (fromUnit && Number(fromUnit) > 1) return fromUnit;
    const mp = getMedicinePricing({
      price: product.price,
      original_price: null,
      specification: product.specification,
    });
    if (mp?.pcsPerStrip && mp.pcsPerStrip > 0) return String(mp.pcsPerStrip);
    return fromUnit || "1";
  };

  const selectMedicineProduct = (index: number, product: ProductSuggestion) => {
    const updated = [...medicines];
    const pcs = resolvePcsPerUnit(product);
    updated[index] = { ...updated[index], name: product.name, price: product.price, pcsPerUnit: pcs, priceUnit: product.price_unit || "" };
    setMedicines(updated);
  };

  const handleMakeSubmit = async () => {
    if (!makeForm.name.trim()) { toast.error("Please enter your name"); return; }
    if (!makeForm.phone.trim()) { toast.error("Please enter your phone number"); return; }
    const validMeds = medicines.filter((m) => m.name.trim());
    if (validMeds.length === 0) { toast.error("Please add at least one medicine"); return; }

    setMakeSubmitting(true);
    const prescriptionText = validMeds
      .map((m, i) => `${i + 1}. ${m.name}${m.quantity ? ` — Qty: ${m.quantity}` : ""}${m.notes ? ` (${m.notes})` : ""}`)
      .join("\n");

    const fullNotes = `[Manual Prescription]\n${prescriptionText}${makeForm.notes ? `\n\nAdditional Notes: ${makeForm.notes}` : ""}`;

    const { error } = await (supabase.from("prescription_orders" as any) as any).insert({
      user_id: user?.id || null,
      customer_name: makeForm.name.trim(),
      customer_phone: makeForm.phone.trim(),
      customer_address: makeForm.address.trim() || null,
      customer_division: makeDivision || null,
      customer_zilla: makeZilla || null,
      customer_upazilla: makeUpazilla || null,
      prescription_url: null,
      notes: fullNotes,
    });
    if (error) { toast.error("Failed to submit"); setMakeSubmitting(false); return; }
    await (supabase.from("notifications" as any) as any).insert({
      target_role: "admin",
      title: "New Manual Prescription",
      body: `${makeForm.name} submitted a manual prescription with ${validMeds.length} medicine(s). Phone: ${makeForm.phone}`,
      type: "prescription",
      action_url: "/admin/prescriptions",
    });
    setMakeSubmitted(true);
    setMakeSubmitting(false);
    toast.success("Prescription submitted successfully!");
  };

  const resetAll = () => {
    setSubmitted(false);
    setMakeSubmitted(false);
    setPrescriptionUrl("");
    setPreviewUrl("");
    setForm({ name: "", phone: "", address: "", notes: "" });
    setMakeForm({ name: "", phone: "", address: "", notes: "" });
    setMedicines([{ name: "", quantity: "", price: null, pcsPerUnit: "", priceUnit: "", notes: "" }]);
    setConfirmedMeds(new Set());
  };

  if (submitted || makeSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Prescription Submitted!</h1>
          <p className="text-muted-foreground mb-6">
            আমরা আপনার প্রেসক্রিপশন পেয়েছি। শীঘ্রই আমাদের ফার্মাসিস্ট আপনাকে কল করবেন।
          </p>
          <Button onClick={resetAll}>আরেকটি প্রেসক্রিপশন জমা দিন</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-lg md:max-w-2xl lg:max-w-3xl pb-24">
        <BackButton className="mb-3" />
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-5 h-12 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 p-1 rounded-xl border border-primary/20">
            <TabsTrigger value="upload" className="gap-1.5 text-xs sm:text-sm font-bold rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 overflow-hidden">
              <Upload className="h-4 w-4 shrink-0" /> <span className="truncate">Upload Prescription</span>
            </TabsTrigger>
            <TabsTrigger value="make" className="gap-1.5 text-xs sm:text-sm font-bold rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 overflow-hidden">
              <Pill className="h-4 w-4 shrink-0" /> <span className="truncate">Make Prescription</span>
            </TabsTrigger>
          </TabsList>

          {/* Upload Prescription Tab */}
          <TabsContent value="upload">
            <Card>
              <CardHeader className="pb-3 px-3 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-primary">
                  <FileText className="h-5 w-5" />
                  Upload Prescription
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  প্রেসক্রিপশনের ছবি আপলোড করুন। আমাদের ফার্মাসিস্ট আপনাকে কল করে অর্ডার কনফার্ম করবেন।
                </p>
              </CardHeader>
              <CardContent className="space-y-4 px-3 sm:px-6">
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Prescription Image *</Label>
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-primary/40 p-6 text-center hover:bg-muted transition-colors">
                    {uploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : previewUrl ? (
                      <img src={previewUrl} alt="Prescription" className="max-h-48 rounded-lg object-contain" />
                    ) : prescriptionUrl ? (
                      <div className="flex items-center gap-2 text-primary">
                        <FileText className="h-8 w-8" />
                        <span className="text-sm font-medium">PDF Uploaded</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to upload prescription</span>
                      </>
                    )}
                    <input type="file" accept="*/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                </div>

                {/* Saved Addresses */}
                {user && savedAddresses.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      Saved Address ব্যবহার করুন
                    </div>
                    <div className="grid gap-2">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => applySavedAddress(addr, "upload")}
                          className={`text-left rounded-lg border-2 p-2.5 space-y-0.5 transition-colors hover:border-primary/60 hover:bg-primary/5 ${
                            addr.is_default ? "border-primary/40 bg-primary/5" : "border-border"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="text-sm font-bold">{addr.full_name}</span>
                            {addr.is_default && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] bg-primary text-primary-foreground rounded px-1.5 py-0.5">
                                <Star className="h-2.5 w-2.5" /> Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{addr.phone}</p>
                          <p className="text-xs text-foreground/80 line-clamp-1">{addr.address}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {[addr.upazilla, addr.zilla, addr.division].filter(Boolean).join(", ")}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="font-bold text-sm">Your Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="আপনার নাম" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-sm">Phone Number *</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-sm">Delivery Address</Label>
                  <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House, Road, Area" rows={2} />
                </div>

                {/* Location Dropdowns */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="font-bold text-xs">Division</Label>
                    <Select value={selectedDivision} onValueChange={(v) => { setSelectedDivision(v); setSelectedZilla(""); setSelectedUpazilla(""); }}>
                      <SelectTrigger className="bg-background text-xs h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold text-xs">Zilla</Label>
                    <Select value={selectedZilla} onValueChange={(v) => { setSelectedZilla(v); setSelectedUpazilla(""); }} disabled={!selectedDivision || getZillas(selectedDivision).length === 0}>
                      <SelectTrigger className="bg-background text-xs h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {getZillas(selectedDivision).map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold text-xs">Upazilla</Label>
                    <Select value={selectedUpazilla} onValueChange={setSelectedUpazilla} disabled={!selectedZilla || getUpazillas(selectedDivision, selectedZilla).length === 0}>
                      <SelectTrigger className="bg-background text-xs h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {getUpazillas(selectedDivision, selectedZilla).map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-sm">Notes (Optional)</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="কোনো বিশেষ নির্দেশনা থাকলে লিখুন..." rows={2} />
                </div>
                <Button onClick={handleUploadSubmit} disabled={submitting || !prescriptionUrl} className="w-full">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                  Submit Prescription
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Make Prescription Tab */}
          <TabsContent value="make">
            <Card>
              <CardHeader className="pb-3 px-3 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-green-600">
                  <Pill className="h-5 w-5" />
                  Make Prescription
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  আপনার প্রয়োজনীয় ওষুধের নাম ও তথ্য লিখুন। আমরা প্রস্তুত করে আপনাকে জানাবো।
                </p>
              </CardHeader>
              <CardContent className="space-y-4 px-3 sm:px-6">
                {/* Medicine list */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-green-600">Medicines *</Label>
                  {medicines.map((med, i) => {
                    const isConfirmed = confirmedMeds.has(i);
                    const perPcPrice = med.price !== null && med.pcsPerUnit && Number(med.pcsPerUnit) > 0
                      ? med.price / Number(med.pcsPerUnit)
                      : med.price;
                    const totalPrice = perPcPrice !== null && med.quantity && Number(med.quantity) > 0
                      ? perPcPrice * Number(med.quantity)
                      : null;

                    if (isConfirmed) {
                      return (
                        <div key={i} className="rounded-xl border-2 border-green-300 bg-green-50/60 dark:bg-green-950/20 p-3 space-y-1 relative">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Check className="h-4 w-4 text-green-600" />
                              <span className="font-bold text-sm text-green-700">{med.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => editMedicine(i)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {medicines.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeMedicine(i)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm pl-5.5">
                            <span className="text-muted-foreground">
                              {med.quantity ? `${med.quantity} pcs` : "Qty not set"}
                              {med.notes && <span className="italic"> • {med.notes}</span>}
                            </span>
                            {totalPrice !== null && (
                              <span className="font-bold text-primary">৳{totalPrice.toFixed(0)}</span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                    <div key={i} className="rounded-xl border-2 border-green-100 dark:border-green-900/30 bg-green-50/30 dark:bg-green-950/10 p-3 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-green-600">Medicine {i + 1}</span>
                        {medicines.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeMedicine(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <MedicineSearchInput
                        placeholder="Medicine name (ওষুধের নাম)"
                        value={med.name}
                        onChange={(val) => updateMedicine(i, "name", val)}
                        onSelect={(product) => selectMedicineProduct(i, product)}
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <Input
                          placeholder="কত পিস লাগবে"
                          value={med.quantity}
                          onChange={(e) => updateMedicine(i, "quantity", e.target.value)}
                          type="number"
                          min="1"
                          className="w-full sm:w-32 flex-shrink-0"
                        />
                        {med.price !== null && (
                          <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
                            {med.pcsPerUnit && Number(med.pcsPerUnit) > 0 ? (
                              <span className="text-muted-foreground whitespace-nowrap">
                                ৳{(med.price / Number(med.pcsPerUnit)).toFixed(1)}/pc
                                {med.quantity && Number(med.quantity) > 0 && (
                                  <span className="font-semibold text-primary"> × {med.quantity} = ৳{((med.price / Number(med.pcsPerUnit)) * Number(med.quantity)).toFixed(0)}</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-primary font-medium whitespace-nowrap">
                                ৳{med.price}
                                {med.quantity && Number(med.quantity) > 0 && (
                                  <span className="text-muted-foreground"> × {med.quantity} = ৳{(med.price * Number(med.quantity)).toFixed(0)}</span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {med.price !== null && med.priceUnit && (
                        <p className="text-xs text-muted-foreground">
                          Strip/Unit price: ৳{med.price} ({med.priceUnit})
                          {med.pcsPerUnit && <> • Per piece: ৳{(med.price / Number(med.pcsPerUnit)).toFixed(2)}</>}
                        </p>
                      )}
                      <Input
                        placeholder="Special instruction (বিশেষ নির্দেশনা)"
                        value={med.notes}
                        onChange={(e) => updateMedicine(i, "notes", e.target.value)}
                      />
                      <Button type="button" size="sm" className="w-full gap-1.5 font-bold bg-green-600 hover:bg-green-700 text-white" onClick={() => confirmMedicine(i)}>
                        <Check className="h-4 w-4" /> Done ✓
                      </Button>
                    </div>
                    );
                  })}
                  <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 font-bold border-dashed border-2 border-green-400 text-green-600 hover:bg-green-50" onClick={addMedicine}>
                    <Plus className="h-4 w-4" /> Add Medicine
                  </Button>

                  {/* Subtotal */}
                  {medicines.some((m) => m.price !== null && m.quantity) && (() => {
                    const subtotal = medicines.reduce((sum, m) => {
                      if (m.price === null || !m.quantity || Number(m.quantity) <= 0) return sum;
                      const perPc = m.pcsPerUnit && Number(m.pcsPerUnit) > 0 ? m.price / Number(m.pcsPerUnit) : m.price;
                      return sum + perPc * Number(m.quantity);
                    }, 0);
                    return subtotal > 0 ? (
                      <div className="flex items-center justify-between rounded-xl bg-primary/10 border-2 border-primary/30 p-3">
                        <span className="font-bold text-sm">Subtotal ({medicines.filter(m => m.name.trim()).length} medicines)</span>
                        <span className="font-extrabold text-lg text-primary">৳{subtotal.toFixed(0)}</span>
                      </div>
                    ) : null;
                  })()}
                </div>



                <Button
                  onClick={() => {
                    const validMeds = medicines.filter((m) => m.name.trim() && m.quantity && Number(m.quantity) > 0);
                    if (validMeds.length === 0) { toast.error("Please add at least one medicine with quantity"); return; }
                    clearCart();
                    setTimeout(() => {
                      validMeds.forEach((m) => {
                        const perPc = m.price !== null && m.pcsPerUnit && Number(m.pcsPerUnit) > 0
                          ? m.price / Number(m.pcsPerUnit)
                          : m.price || 0;
                        const itemId = `rx-${m.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                        addItem({ id: itemId, name: m.name, price: perPc, image_url: null });
                        if (Number(m.quantity) > 1) {
                          setTimeout(() => updateQuantity(itemId, Number(m.quantity)), 50);
                        }
                      });
                      toast.success("Medicines added to cart!");
                      navigate("/checkout");
                    }, 100);
                  }}
                  className="w-full font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white shadow-lg h-12 text-base mt-2"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Checkout
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default PrescriptionUpload;
