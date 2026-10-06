import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Building2, Search, Upload, X, Microscope } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";

interface LabCenter {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  division: string | null;
  zilla: string | null;
  upazilla: string | null;
  is_active: boolean;
  sort_order: number;
}

interface DeliveryZone {
  division: string;
  zilla: string | null;
  upazilla: string | null;
}

interface LabTest {
  id: string;
  name: string;
  price: number;
  category: string | null;
}

interface CenterTest {
  id: string;
  test_id: string;
  price: number;
  govt_price: number;
}

const CENTER_TYPES = [
  { value: "hospital", label: "Hospital" },
  { value: "diagnostic", label: "Diagnostic Center" },
  { value: "clinic", label: "Clinic" },
];

const AdminLabCenters = () => {
  const [centers, setCenters] = useState<LabCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LabCenter | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [uploading, setUploading] = useState(false);
  const [testsDialogOpen, setTestsDialogOpen] = useState(false);
  const [testsCenter, setTestsCenter] = useState<LabCenter | null>(null);
  const [allTests, setAllTests] = useState<LabTest[]>([]);
  const [useGovtPriceTests, setUseGovtPriceTests] = useState<Set<string>>(new Set());
  const [centerTests, setCenterTests] = useState<CenterTest[]>([]);
  const [testSearch, setTestSearch] = useState("");
  const [testsSaving, setTestsSaving] = useState(false);
  const [testPrices, setTestPrices] = useState<Record<string, number>>({});
  const [testGovtPrices, setTestGovtPrices] = useState<Record<string, number>>({});
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    name: "", type: "diagnostic", phone: "", address: "", logo_url: "",
    division: "", zilla: "", upazilla: "", is_active: true, sort_order: 0,
  });

  const fetchCenters = async () => {
    const { data } = await (supabase.from("lab_centers" as any) as any).select("*").order("sort_order");
    if (data) setCenters(data as LabCenter[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchCenters();
    (supabase.from("delivery_zones" as any) as any).select("division, zilla, upazilla").eq("is_active", true).then(({ data }: any) => {
      if (data) setZones(data as DeliveryZone[]);
    });
    (supabase.from("lab_tests" as any) as any).select("id, name, price, category").eq("is_active", true).order("name").then(({ data }: any) => {
      if (data) setAllTests(data as LabTest[]);
    });
  }, []);

  const divisions = useMemo(() => [...new Set(zones.map(z => z.division))].sort(), [zones]);
  const zillas = useMemo(() => form.division ? [...new Set(zones.filter(z => z.division === form.division && z.zilla).map(z => z.zilla!))].sort() : [], [zones, form.division]);
  const upazillas = useMemo(() => form.zilla ? [...new Set(zones.filter(z => z.division === form.division && z.zilla === form.zilla && z.upazilla).map(z => z.upazilla!))].sort() : [], [zones, form.division, form.zilla]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", type: "diagnostic", phone: "", address: "", logo_url: "", division: "", zilla: "", upazilla: "", is_active: true, sort_order: 0 });
    setDialogOpen(true);
  };

  const openEdit = (c: LabCenter) => {
    setEditing(c);
    setForm({
      name: c.name, type: c.type, phone: c.phone || "", address: c.address || "",
      logo_url: c.logo_url || "",
      division: c.division || "", zilla: c.zilla || "", upazilla: c.upazilla || "",
      is_active: c.is_active, sort_order: c.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (uploading) { toast.error("Logo upload is still in progress"); return; }
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const payload = {
      name: form.name.trim(), type: form.type, phone: form.phone.trim() || null,
      address: form.address.trim() || null, logo_url: form.logo_url || null,
      division: form.division || null, zilla: form.zilla || null, upazilla: form.upazilla || null,
      is_active: form.is_active, sort_order: Number(form.sort_order),
    };

    if (editing) {
      const { error } = await (supabase.from("lab_centers" as any) as any).update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Center updated");
    } else {
      const { error } = await (supabase.from("lab_centers" as any) as any).insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Center added");
    }
    setDialogOpen(false);
    fetchCenters();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this center?")) return;
    await (supabase.from("lab_centers" as any) as any).delete().eq("id", id);
    toast.success("Deleted");
    fetchCenters();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setForm(f => ({ ...f, logo_url: localPreview }));
    const ext = file.name.split(".").pop();
    const path = `lab-centers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
    if (error) { 
      setForm(f => ({ ...f, logo_url: "" }));
      toast.error("Upload failed: " + error.message); 
      setUploading(false); 
      URL.revokeObjectURL(localPreview);
      return; 
    }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm(f => ({ ...f, logo_url: urlData.publicUrl }));
    setUploading(false);
    URL.revokeObjectURL(localPreview);
  };

  const openTestsDialog = async (c: LabCenter) => {
    setTestsCenter(c);
    setTestSearch("");
    const { data } = await (supabase.from("lab_center_tests" as any) as any).select("id, test_id, price, govt_price").eq("center_id", c.id);
    const ct = (data || []) as CenterTest[];
    setCenterTests(ct);
    const ids = new Set(ct.map((t: CenterTest) => t.test_id));
    setSelectedTestIds(ids);
    const prices: Record<string, number> = {};
    const govtPrices: Record<string, number> = {};
    ct.forEach((t: CenterTest) => { prices[t.test_id] = t.price; govtPrices[t.test_id] = t.govt_price || 0; });
    setTestPrices(prices);
    setTestGovtPrices(govtPrices);
    const govtSet = new Set<string>();
    ct.forEach((t: CenterTest) => { if (t.govt_price && t.govt_price > 0) govtSet.add(t.test_id); });
    setUseGovtPriceTests(govtSet);
    setTestsDialogOpen(true);
  };

  const toggleTestSelection = (testId: string, defaultPrice: number) => {
    setSelectedTestIds(prev => {
      const n = new Set(prev);
      if (n.has(testId)) { n.delete(testId); } else { n.add(testId); if (!testPrices[testId]) setTestPrices(p => ({ ...p, [testId]: defaultPrice })); if (!testGovtPrices[testId]) setTestGovtPrices(p => ({ ...p, [testId]: 0 })); }
      return n;
    });
  };

  const handleSaveTests = async () => {
    if (!testsCenter) return;
    setTestsSaving(true);
    const oldIds = centerTests.map(t => t.test_id);
    const toDelete = oldIds.filter(id => !selectedTestIds.has(id));
    if (toDelete.length > 0) {
      await (supabase.from("lab_center_tests" as any) as any).delete().eq("center_id", testsCenter.id).in("test_id", toDelete);
    }
    const upserts = [...selectedTestIds].map(testId => {
      const test = allTests.find(t => t.id === testId);
      return {
        center_id: testsCenter.id,
        test_id: testId,
        price: testPrices[testId] || 0,
        govt_price: useGovtPriceTests.has(testId) ? (test?.price || 0) : 0,
      };
    });
    if (upserts.length > 0) {
      const { error } = await (supabase.from("lab_center_tests" as any) as any).upsert(upserts, { onConflict: "center_id,test_id" });
      if (error) { toast.error(error.message); setTestsSaving(false); return; }
    }
    toast.success(`${selectedTestIds.size} tests assigned to ${testsCenter.name}`);
    setTestsSaving(false);
    setTestsDialogOpen(false);
  };

  const filteredTests = allTests.filter(t => !testSearch || t.name.toLowerCase().includes(testSearch.toLowerCase()));

  const typeLabel = (t: string) => CENTER_TYPES.find(c => c.value === t)?.label || t;
  const typeBadgeVariant = (t: string) => t === "hospital" ? "default" : t === "clinic" ? "secondary" : "outline";

  const filtered = centers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.address && c.address.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Lab Centers</h1>
          <span className="text-xs text-muted-foreground">({centers.length})</span>
        </div>
        <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Center</Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search centers..." className="pl-8 h-9" />
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <>
          {/* Desktop Table */}
          <div className="border rounded-lg overflow-auto hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                   <TableHead className="w-10">#</TableHead>
                  <TableHead className="w-12">Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c, i) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      {c.logo_url ? <img src={c.logo_url} alt="" className="h-8 w-8 rounded-md object-cover" /> : <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center"><Building2 className="h-4 w-4 text-muted-foreground" /></div>}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{c.name}</p>
                      {c.address && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.address}</p>}
                    </TableCell>
                    <TableCell><Badge variant={typeBadgeVariant(c.type) as any}>{typeLabel(c.type)}</Badge></TableCell>
                    <TableCell className="text-xs">{[c.upazilla, c.zilla, c.division].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell className="text-sm">{c.phone || "—"}</TableCell>
                    <TableCell><span className={`text-xs font-bold ${c.is_active ? "text-green-600" : "text-destructive"}`}>{c.is_active ? "Yes" : "No"}</span></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => openTestsDialog(c)} title="Manage Tests"><Microscope className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No centers found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {filtered.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No centers found</p>}
            {filtered.map((c, i) => (
              <div key={c.id} className="border rounded-lg p-3 bg-card space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-xs text-muted-foreground mt-1">{i + 1}</span>
                  {c.logo_url ? <img src={c.logo_url} alt="" className="h-10 w-10 rounded-md object-cover shrink-0" /> : <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0"><Building2 className="h-5 w-5 text-muted-foreground" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{c.name}</p>
                    {c.address && <p className="text-xs text-muted-foreground truncate">{c.address}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant={typeBadgeVariant(c.type) as any} className="text-[10px]">{typeLabel(c.type)}</Badge>
                      <span className={`text-[10px] font-bold ${c.is_active ? "text-green-600" : "text-destructive"}`}>{c.is_active ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{[c.upazilla, c.zilla, c.division].filter(Boolean).join(", ") || "—"}</span>
                  <span>{c.phone || ""}</span>
                </div>
                <div className="flex gap-1 border-t pt-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(c)}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => openTestsDialog(c)}><Microscope className="h-3 w-3 mr-1" /> Tests</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive ml-auto" onClick={() => handleDelete(c.id)}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Center" : "Add Center"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold">Center Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Popular Diagnostic Centre" />
            </div>
            <div>
              <Label className="text-xs font-bold">Logo</Label>
              {form.logo_url ? (
                <div className="flex items-center gap-2 mt-1">
                  <img src={form.logo_url} alt="Logo" className="h-12 w-12 rounded-lg object-cover border" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setForm(f => ({ ...f, logo_url: "" }))}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <label className="flex items-center gap-2 mt-1 cursor-pointer border-2 border-dashed rounded-lg p-3 hover:border-primary/40 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{uploading ? "Uploading..." : "Upload logo"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                </label>
              )}
            </div>
            <div>
              <Label className="text-xs font-bold">Type *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CENTER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold">Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <Label className="text-xs font-bold">Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" />
            </div>

            {/* Location Assignment */}
            <div className="border-t pt-3">
              <p className="text-xs font-bold mb-2">📍 Location Assignment</p>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Division</Label>
                  <Select value={form.division} onValueChange={v => setForm(f => ({ ...f, division: v, zilla: "", upazilla: "" }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select Division" /></SelectTrigger>
                    <SelectContent>
                      {divisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {form.division && zillas.length > 0 && (
                  <div>
                    <Label className="text-xs">Zilla</Label>
                    <Select value={form.zilla} onValueChange={v => setForm(f => ({ ...f, zilla: v, upazilla: "" }))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select Zilla" /></SelectTrigger>
                      <SelectContent>
                        {zillas.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {form.zilla && upazillas.length > 0 && (
                  <div>
                    <Label className="text-xs">Upazilla</Label>
                    <Select value={form.upazilla} onValueChange={v => setForm(f => ({ ...f, upazilla: v }))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select Upazilla" /></SelectTrigger>
                      <SelectContent>
                        {upazillas.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-bold">Sort Order</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
              <div className="flex items-end pb-1"><div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label className="text-xs">Active</Label></div></div>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={uploading}>{uploading ? "Uploading logo..." : editing ? "Update" : "Add"} Center</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={testsDialogOpen} onOpenChange={setTestsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Microscope className="h-5 w-5 text-primary" />
              Assign Tests — {testsCenter?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={testSearch} onChange={e => setTestSearch(e.target.value)} placeholder="Search tests..." className="pl-8 h-9" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{selectedTestIds.size} test(s) selected</p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  if (selectedTestIds.size === filteredTests.length && filteredTests.every(t => selectedTestIds.has(t.id))) {
                    // Deselect all filtered
                    setSelectedTestIds(prev => {
                      const n = new Set(prev);
                      filteredTests.forEach(t => n.delete(t.id));
                      return n;
                    });
                  } else {
                    // Select all filtered
                    setSelectedTestIds(prev => {
                      const n = new Set(prev);
                      filteredTests.forEach(t => {
                        if (!n.has(t.id)) {
                          n.add(t.id);
                          if (!testPrices[t.id]) setTestPrices(p => ({ ...p, [t.id]: t.price }));
                          if (!testGovtPrices[t.id]) setTestGovtPrices(p => ({ ...p, [t.id]: 0 }));
                        }
                      });
                      return n;
                    });
                  }
                }}
              >
                {selectedTestIds.size === filteredTests.length && filteredTests.every(t => selectedTestIds.has(t.id)) ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="border rounded-lg max-h-[50vh] overflow-y-auto divide-y">
              {filteredTests.map(t => {
                const isSelected = selectedTestIds.has(t.id);
                return (
                  <div key={t.id} className={`flex items-center gap-3 p-2.5 hover:bg-muted/50 transition-colors ${isSelected ? "bg-primary/5" : ""}`}>
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleTestSelection(t.id, t.price)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">Default: ৳{t.price}{t.category ? ` • ${t.category}` : ""}</p>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            checked={useGovtPriceTests.has(t.id)}
                            onCheckedChange={(checked) => {
                              setUseGovtPriceTests(prev => {
                                const n = new Set(prev);
                                if (checked) { n.add(t.id); } else { n.delete(t.id); setTestGovtPrices(p => ({ ...p, [t.id]: 0 })); }
                                return n;
                              });
                            }}
                          />
                          <span className="text-[9px] font-bold text-green-600 whitespace-nowrap">Govt</span>
                        </div>
                        {useGovtPriceTests.has(t.id) ? (
                          <div className="text-center px-2">
                            <p className="text-[10px] font-bold text-green-600">GOVT FIXED RATE</p>
                            <p className="text-xs font-semibold text-green-700">৳{t.price}</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className="text-[9px] text-muted-foreground mb-0.5">Price</p>
                            <Input
                              type="number"
                              value={testPrices[t.id] ?? t.price}
                              onChange={e => setTestPrices(p => ({ ...p, [t.id]: Number(e.target.value) }))}
                              className="w-24 h-7 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredTests.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">No tests found</p>}
            </div>
            <Button onClick={handleSaveTests} className="w-full" disabled={testsSaving}>
              {testsSaving ? "Saving..." : `Save (${selectedTestIds.size} tests)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLabCenters;
