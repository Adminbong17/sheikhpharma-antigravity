import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MapPin, Plus, Pencil, Trash2, Search, ChevronDown, ChevronUp } from "lucide-react";
import PrintExportButtons from "@/components/PrintExportButtons";
import type { PrintColumn } from "@/lib/printExport";
import BackButton from "@/components/BackButton";

interface DeliveryZone {
  id: string;
  division: string;
  zilla: string | null;
  upazilla: string | null;
  area: string | null;
  charge: number;
  is_active: boolean;
}

const levelLabel = (z: DeliveryZone) => {
  if (z.area) return z.area;
  if (z.upazilla) return z.upazilla;
  if (z.zilla) return z.zilla;
  return z.division;
};

const levelType = (z: DeliveryZone) => {
  if (z.area) return "Area";
  if (z.upazilla) return "Upazilla";
  if (z.zilla) return "Zilla";
  return "Division";
};

type AddLevel = "division" | "zilla" | "upazilla" | "area";
const emptyForm = { division: "", zilla: "", upazilla: "", area: "", charge: "" };

const AdminDeliveryZones = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryZone | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [addLevel, setAddLevel] = useState<AddLevel | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState("all");
  const [filterZilla, setFilterZilla] = useState("all");
  const [filterUpazilla, setFilterUpazilla] = useState("all");
  const [expandedDivisions, setExpandedDivisions] = useState<Record<string, boolean>>({});

  const { data: zones = [], isLoading } = useQuery<DeliveryZone[]>({
    queryKey: ["delivery-zones"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("delivery_zones" as any) as any)
        .select("*")
        .order("division")
        .order("zilla", { nullsFirst: true })
        .order("upazilla", { nullsFirst: true });
      if (error) throw error;
      return data as DeliveryZone[];
    },
  });

  const divisions = useMemo(() => [...new Set(zones.map((z) => z.division))].sort(), [zones]);
  const filterZillas = useMemo(() => {
    if (filterDivision === "all") return [];
    return [...new Set(zones.filter(z => z.division === filterDivision && z.zilla).map(z => z.zilla!))].sort();
  }, [zones, filterDivision]);
  const filterUpazillas = useMemo(() => {
    if (filterZilla === "all") return [];
    return [...new Set(zones.filter(z => z.division === filterDivision && z.zilla === filterZilla && z.upazilla).map(z => z.upazilla!))].sort();
  }, [zones, filterDivision, filterZilla]);
  const zillasForDivision = useMemo(() => {
    if (!form.division) return [];
    return [...new Set(zones.filter(z => z.division === form.division && z.zilla).map(z => z.zilla!))].sort();
  }, [zones, form.division]);
  const upazillasForZilla = useMemo(() => {
    if (!form.division || !form.zilla) return [];
    return [...new Set(zones.filter(z => z.division === form.division && z.zilla === form.zilla && z.upazilla).map(z => z.upazilla!))].sort();
  }, [zones, form.division, form.zilla]);
  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      const matchDiv = filterDivision === "all" || z.division === filterDivision;
      const matchZilla = filterZilla === "all" || z.zilla === filterZilla;
      const matchUpazilla = filterUpazilla === "all" || z.upazilla === filterUpazilla;
      const q = search.toLowerCase();
      const matchSearch = !q || [z.division, z.zilla, z.upazilla, z.area].some((v) => v?.toLowerCase().includes(q));
      return matchDiv && matchZilla && matchUpazilla && matchSearch;
    });
  }, [zones, filterDivision, filterZilla, filterUpazilla, search]);

  // Group by division for accordion view
  const grouped = useMemo(() => {
    const g: Record<string, DeliveryZone[]> = {};
    filteredZones.forEach((z) => {
      if (!g[z.division]) g[z.division] = [];
      g[z.division].push(z);
    });
    return g;
  }, [filteredZones]);

  const toggleDivision = (div: string) =>
    setExpandedDivisions((prev) => ({ ...prev, [div]: !prev[div] }));

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setAddLevel(null);
    setOpen(true);
  };

  const openEdit = (z: DeliveryZone) => {
    setEditing(z);
    const level: AddLevel = z.area ? "area" : z.upazilla ? "upazilla" : z.zilla ? "zilla" : "division";
    setAddLevel(level);
    setForm({
      division: z.division,
      zilla: z.zilla || "",
      upazilla: z.upazilla || "",
      area: z.area || "",
      charge: String(z.charge),
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!addLevel) { toast.error("Zone টাইপ সিলেক্ট করুন"); return; }
    if (!form.division.trim()) { toast.error("Division আবশ্যক"); return; }
    if (addLevel === "zilla" && !form.zilla.trim()) { toast.error("Zilla নাম দিন"); return; }
    if (addLevel === "upazilla" && (!form.zilla.trim() || !form.upazilla.trim())) { toast.error("Zilla ও Upazilla দিন"); return; }
    if (addLevel === "area" && (!form.zilla.trim() || !form.upazilla.trim() || !form.area.trim())) { toast.error("Zilla, Upazilla ও Area দিন"); return; }
    if (!form.charge || isNaN(Number(form.charge))) { toast.error("Charge সঠিকভাবে লিখুন"); return; }

    setSaving(true);

    // For area, support multiple comma-separated areas
    if (addLevel === "area" && !editing) {
      const areaNames = form.area.split(",").map(a => a.trim()).filter(Boolean);
      if (areaNames.length === 0) { toast.error("Area নাম দিন"); setSaving(false); return; }
      const payloads = areaNames.map(area => ({
        division: form.division.trim(),
        zilla: form.zilla.trim() || null,
        upazilla: form.upazilla.trim() || null,
        area,
        charge: parseFloat(form.charge),
        is_active: true,
      }));
      const { error } = await (supabase.from("delivery_zones" as any) as any).insert(payloads);
      if (error) toast.error(error.message);
      else {
        toast.success(`${areaNames.length}টি Area যোগ হয়েছে!`);
        queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
        setOpen(false);
      }
      setSaving(false);
      return;
    }

    const payload = {
      division: form.division.trim(),
      zilla: form.zilla.trim() || null,
      upazilla: form.upazilla.trim() || null,
      area: form.area.trim() || null,
      charge: parseFloat(form.charge),
    };

    let error;
    if (editing) {
      ({ error } = await (supabase.from("delivery_zones" as any) as any).update(payload).eq("id", editing.id));
    } else {
      ({ error } = await (supabase.from("delivery_zones" as any) as any).insert({ ...payload, is_active: true }));
    }

    if (error) toast.error(error.message);
    else {
      toast.success(editing ? "আপডেট সফল!" : "Zone যোগ হয়েছে!");
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
      setOpen(false);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from("delivery_zones" as any) as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Zone মুছে ফেলা হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
    }
    setDeleteId(null);
  };

  const handleToggleActive = async (z: DeliveryZone) => {
    const { error } = await (supabase.from("delivery_zones" as any) as any)
      .update({ is_active: !z.is_active })
      .eq("id", z.id);
    if (error) toast.error(error.message);
    else {
      toast.success(z.is_active ? "Zone নিষ্ক্রিয় করা হয়েছে" : "Zone সক্রিয় করা হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
    }
  };

  const totalActive = zones.filter((z) => z.is_active).length;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-3" />
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-primary shrink-0" />
          <div>
            <h1 className="text-2xl font-bold">Delivery Zones</h1>
            <p className="text-sm text-muted-foreground">
              মোট <strong>{zones.length}</strong> zone — <strong>{totalActive}</strong> সক্রিয়।
              Upazilla charge থাকলে সেটি, না থাকলে Zilla, না থাকলে Division charge প্রযোজ্য।
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <PrintExportButtons
            title="Delivery Zones"
            columns={[
              { header: "Division", accessor: (z) => z.division },
              { header: "Zilla", accessor: (z) => z.zilla || "—" },
              { header: "Upazilla", accessor: (z) => z.upazilla || "—" },
              { header: "Charge", accessor: (z) => z.charge },
              { header: "Active", accessor: (z) => z.is_active ? "Yes" : "No" },
            ] satisfies PrintColumn[]}
            data={filteredZones}
          />
          <Button onClick={openAdd} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> নতুন Zone
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Division, Zilla, Upazilla বা Area খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterDivision} onValueChange={(v) => { setFilterDivision(v); setFilterZilla("all"); setFilterUpazilla("all"); }}>
          <SelectTrigger className="w-40 bg-background">
            <SelectValue placeholder="সকল Division" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">সকল Division</SelectItem>
            {divisions.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterDivision !== "all" && filterZillas.length > 0 && (
          <Select value={filterZilla} onValueChange={(v) => { setFilterZilla(v); setFilterUpazilla("all"); }}>
            <SelectTrigger className="w-40 bg-background">
              <SelectValue placeholder="সকল Zilla" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">সকল Zilla</SelectItem>
              {filterZillas.map((z) => (
                <SelectItem key={z} value={z}>{z}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {filterZilla !== "all" && filterUpazillas.length > 0 && (
          <Select value={filterUpazilla} onValueChange={setFilterUpazilla}>
            <SelectTrigger className="w-40 bg-background">
              <SelectValue placeholder="সকল Upazilla" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">সকল Upazilla</SelectItem>
              {filterUpazillas.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-16 text-center">লোড হচ্ছে...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-muted-foreground py-16 text-center">কোনো zone পাওয়া যায়নি।</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([division, divZones]) => {
            const isExpanded = expandedDivisions[division] !== false; // default expanded
            const activeCount = divZones.filter((z) => z.is_active).length;

            return (
              <Card key={division}>
                <button
                  className="w-full text-left"
                  onClick={() => toggleDivision(division)}
                >
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        {division} Division
                        <span className="text-xs font-normal text-muted-foreground">
                          ({divZones.length} zone, {activeCount} সক্রিয়)
                        </span>
                      </CardTitle>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </CardHeader>
                </button>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Zilla</TableHead>
                            <TableHead>Upazilla</TableHead>
                            <TableHead>Area</TableHead>
                            <TableHead>Level</TableHead>
                            <TableHead className="text-right">Charge (৳)</TableHead>
                            <TableHead className="text-center">Active</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {divZones.map((z) => (
                            <TableRow key={z.id} className={!z.is_active ? "opacity-50" : ""}>
                              <TableCell className="font-medium">{levelLabel(z)}</TableCell>
                              <TableCell className="text-muted-foreground">{z.zilla || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{z.upazilla || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{z.area || "—"}</TableCell>
                              <TableCell>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  z.area ? "bg-green-500/10 text-green-700" :
                                  z.upazilla ? "bg-primary/10 text-primary" :
                                  z.zilla ? "bg-accent/10 text-accent-foreground" :
                                  "bg-muted text-muted-foreground"
                                }`}>
                                  {levelType(z)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-semibold">৳{z.charge}</TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={z.is_active}
                                  onCheckedChange={() => handleToggleActive(z)}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => openEdit(z)} title="Edit">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(z.id)} title="Delete">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Zone সম্পাদনা করুন" : "নতুন Delivery Zone যোগ করুন"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Step 1: Choose what to add (only for new) */}
            {!editing && (
              <div className="space-y-2">
                <Label>কী যোগ করবেন? <span className="text-destructive">*</span></Label>
                <Select value={addLevel || ""} onValueChange={(v) => {
                  setAddLevel(v as AddLevel);
                  setForm(emptyForm);
                }}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="সিলেক্ট করুন..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="division">Division</SelectItem>
                    <SelectItem value="zilla">Zilla (জেলা)</SelectItem>
                    <SelectItem value="upazilla">Upazilla (উপজেলা)</SelectItem>
                    <SelectItem value="area">Area (এলাকা)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Division level — just name input */}
            {addLevel === "division" && (
              <div className="space-y-2">
                <Label>Division Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="যেমন: Dhaka, Chattogram..."
                  value={form.division}
                  onChange={(e) => setForm((p) => ({ ...p, division: e.target.value }))}
                />
              </div>
            )}

            {/* Zilla level — division dropdown + zilla name */}
            {addLevel === "zilla" && (
              <>
                <div className="space-y-2">
                  <Label>Division <span className="text-destructive">*</span></Label>
                  <Select value={form.division} onValueChange={(v) => setForm(p => ({ ...p, division: v, zilla: "" }))}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Division সিলেক্ট করুন" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {divisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Zilla Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="যেমন: Gazipur, Cumilla..."
                    value={form.zilla}
                    onChange={(e) => setForm((p) => ({ ...p, zilla: e.target.value }))}
                  />
                </div>
              </>
            )}

            {/* Upazilla level — division dropdown + zilla dropdown + upazilla name */}
            {addLevel === "upazilla" && (
              <>
                <div className="space-y-2">
                  <Label>Division <span className="text-destructive">*</span></Label>
                  <Select value={form.division} onValueChange={(v) => setForm(p => ({ ...p, division: v, zilla: "", upazilla: "" }))}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Division সিলেক্ট করুন" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {divisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Zilla <span className="text-destructive">*</span></Label>
                  <Select value={form.zilla} onValueChange={(v) => setForm(p => ({ ...p, zilla: v, upazilla: "" }))} disabled={!form.division}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Zilla সিলেক্ট করুন" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {zillasForDivision.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Upazilla Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="যেমন: Savar, Kaliakair..."
                    value={form.upazilla}
                    onChange={(e) => setForm((p) => ({ ...p, upazilla: e.target.value }))}
                  />
                </div>
              </>
            )}

            {/* Area level — division + zilla + upazilla dropdowns + area name */}
            {addLevel === "area" && (
              <>
                <div className="space-y-2">
                  <Label>Division <span className="text-destructive">*</span></Label>
                  <Select value={form.division} onValueChange={(v) => setForm(p => ({ ...p, division: v, zilla: "", upazilla: "", area: "" }))}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Division সিলেক্ট করুন" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {divisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Zilla <span className="text-destructive">*</span></Label>
                  <Select value={form.zilla} onValueChange={(v) => setForm(p => ({ ...p, zilla: v, upazilla: "", area: "" }))} disabled={!form.division}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Zilla সিলেক্ট করুন" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {zillasForDivision.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Upazilla <span className="text-destructive">*</span></Label>
                  <Select value={form.upazilla} onValueChange={(v) => setForm(p => ({ ...p, upazilla: v, area: "" }))} disabled={!form.zilla}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Upazilla সিলেক্ট করুন" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {upazillasForZilla.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Area Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="কমা দিয়ে একাধিক: Uttara, Mirpur, Dhanmondi"
                    value={form.area}
                    onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">কমা দিয়ে আলাদা করলে একসাথে একাধিক area যোগ হবে</p>
                </div>
              </>
            )}

            {addLevel && (
              <div className="space-y-2">
                <Label>COD Charge (৳) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="যেমন: 120"
                  value={form.charge}
                  onChange={(e) => setForm((p) => ({ ...p, charge: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>বাতিল</Button>
            <Button onClick={handleSave} disabled={saving || !addLevel}>
              {saving ? "সংরক্ষণ হচ্ছে..." : editing ? "আপডেট করুন" : "যোগ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Zone মুছে ফেলবেন?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">এই delivery zone মুছে গেলে পুনরুদ্ধার করা যাবে না।</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>বাতিল</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>মুছে ফেলুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDeliveryZones;
