import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, FolderTree, Search, Tag } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { logActivity } from "@/lib/logActivity";
import PrintExportButtons from "@/components/PrintExportButtons";
import type { PrintColumn } from "@/lib/printExport";
import IconPicker from "@/components/IconPicker";
import CategoryIcon from "@/components/CategoryIcon";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import BackButton from "@/components/BackButton";
import BulkCategoryUpload from "@/components/BulkCategoryUpload";
import BulkBrandUpload from "@/components/BulkBrandUpload";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  sort_order: number;
}

interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  status: string;
  is_active: boolean;
}

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editingSub, setEditingSub] = useState<SubCategory | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [catForm, setCatForm] = useState({ name: "", slug: "", sort_order: "0" });
  const [subForm, setSubForm] = useState({ name: "", slug: "", category_id: "", sort_order: "0" });
  const [brandForm, setBrandForm] = useState({ name: "" });
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [selectedLucideIcon, setSelectedLucideIcon] = useState<string | null>(null);
  const [iconMode, setIconMode] = useState<"lucide" | "upload">("lucide");
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const [subcategoryBrands, setSubcategoryBrands] = useState<Record<string, string[]>>({});

  const fetchData = async () => {
    const [{ data: cats }, { data: subs }, { data: brs }, { data: sbLinks }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("subcategories").select("*").order("sort_order"),
      supabase.from("brands").select("*").order("name"),
      supabase.from("subcategory_brands" as any).select("*"),
    ]);
    setCategories((cats as Category[]) || []);
    setSubcategories((subs as SubCategory[]) || []);
    setBrands((brs as Brand[]) || []);
    // Build map: subcategory_id -> brand_id[]
    const map: Record<string, string[]> = {};
    ((sbLinks as any[]) || []).forEach((l: any) => {
      if (!map[l.subcategory_id]) map[l.subcategory_id] = [];
      map[l.subcategory_id].push(l.brand_id);
    });
    setSubcategoryBrands(map);
  };

  useEffect(() => { fetchData(); }, []);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const resetBrandForm = () => { setBrandForm({ name: "" }); setEditingBrand(null); setBrandLogoFile(null); };

  const saveBrand = async () => {
    if (!brandForm.name.trim()) { toast.error("Name is required"); return; }
    let logo_url: string | null = editingBrand?.logo_url || null;
    if (brandLogoFile) {
      const ext = brandLogoFile.name.split(".").pop();
      const path = `brands/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, brandLogoFile);
      if (error) { toast.error("Logo upload failed"); return; }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      logo_url = data.publicUrl;
    }
    if (editingBrand) {
      const { error } = await supabase.from("brands").update({ name: brandForm.name, logo_url }).eq("id", editingBrand.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("brands").insert({ name: brandForm.name, logo_url });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(editingBrand ? "Brand updated!" : "Brand created!");
    logActivity({ action: editingBrand ? "brand_updated" : "brand_created", details: `Brand: ${brandForm.name}`, entity_type: "brand" });
    setBrandOpen(false); resetBrandForm(); fetchData();
    queryClient.invalidateQueries({ queryKey: ["homepage-brands"] });
  };

  const deleteBrand = async (id: string) => {
    const { error } = await supabase.from("brands").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Brand deleted!");
    logActivity({ action: "brand_deleted", details: `Brand ID: ${id}`, entity_type: "brand", entity_id: id });
    fetchData();
    queryClient.invalidateQueries({ queryKey: ["homepage-brands"] });
  };

  const toggleBrandActive = async (brand: Brand) => {
    const { error } = await supabase.from("brands").update({ is_active: !brand.is_active }).eq("id", brand.id);
    if (error) { toast.error(error.message); return; }
    toast.success(brand.is_active ? "Brand deactivated" : "Brand activated");
    fetchData();
    queryClient.invalidateQueries({ queryKey: ["homepage-brands"] });
  };

  const openEditBrand = (b: Brand) => {
    setEditingBrand(b);
    setBrandForm({ name: b.name });
    setBrandLogoFile(null);
    setBrandOpen(true);
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `icons/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("category-icons").upload(path, file);
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data } = supabase.storage.from("category-icons").getPublicUrl(path);
    setIconPreview(data.publicUrl);
    setUploading(false);
    toast.success("Icon uploaded!");
  };

  const resetCatForm = () => { setCatForm({ name: "", slug: "", sort_order: "0" }); setEditingCat(null); setIconPreview(null); setSelectedLucideIcon(null); setIconMode("lucide"); };
  const resetSubForm = () => { setSubForm({ name: "", slug: "", category_id: "", sort_order: "0" }); setEditingSub(null); };

  const saveCat = async () => {
    if (!catForm.name.trim()) { toast.error("Name is required"); return; }
    const slug = catForm.slug || generateSlug(catForm.name);
    const resolvedIcon = iconMode === "lucide" && selectedLucideIcon ? `lucide:${selectedLucideIcon}` : iconPreview;
    const payload = { name: catForm.name, slug, icon_url: resolvedIcon, sort_order: Number(catForm.sort_order) || 0 };
    if (editingCat) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editingCat.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(editingCat ? "Category updated!" : "Category created!");
    logActivity({ action: editingCat ? "category_updated" : "category_created", details: `Category: ${catForm.name}`, entity_type: "category" });
    setCatOpen(false); resetCatForm(); fetchData();
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const deleteCat = async (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (cat) {
      const { moveToTrash } = await import("@/lib/trash");
      await moveToTrash("categories", id, cat);
    }
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Category deleted!");
    logActivity({ action: "category_deleted", details: `Category ID: ${id}`, entity_type: "category", entity_id: id });
    fetchData();
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const openEditCat = (c: Category) => {
    setEditingCat(c);
    setCatForm({ name: c.name, slug: c.slug, sort_order: String(c.sort_order) });
    if (c.icon_url?.startsWith("lucide:")) {
      setIconMode("lucide");
      setSelectedLucideIcon(c.icon_url.replace("lucide:", ""));
      setIconPreview(null);
    } else {
      setIconMode("upload");
      setIconPreview(c.icon_url);
      setSelectedLucideIcon(null);
    }
    setCatOpen(true);
  };

  const saveSub = async () => {
    if (!subForm.name.trim() || !subForm.category_id) { toast.error("Name and category required"); return; }
    const slug = subForm.slug || generateSlug(subForm.name);
    const payload = { name: subForm.name, slug, category_id: subForm.category_id, sort_order: Number(subForm.sort_order) || 0 };
    if (editingSub) {
      const { error } = await supabase.from("subcategories").update(payload).eq("id", editingSub.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("subcategories").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(editingSub ? "Subcategory updated!" : "Subcategory created!");
    logActivity({ action: editingSub ? "subcategory_updated" : "subcategory_created", details: `Subcategory: ${subForm.name}`, entity_type: "subcategory" });
    setSubOpen(false); resetSubForm(); fetchData();
    queryClient.invalidateQueries({ queryKey: ["subcategories"] });
  };

  const deleteSub = async (id: string) => {
    const { error } = await supabase.from("subcategories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Subcategory deleted!");
    logActivity({ action: "subcategory_deleted", details: `Subcategory ID: ${id}`, entity_type: "subcategory", entity_id: id });
    fetchData();
    queryClient.invalidateQueries({ queryKey: ["subcategories"] });
  };

  const openEditSub = (s: SubCategory) => {
    setEditingSub(s);
    setSubForm({ name: s.name, slug: s.slug, category_id: s.category_id, sort_order: String(s.sort_order) });
    setSubOpen(true);
  };

  const catMap = new Map(categories.map(c => [c.id, c.name]));
  const brandMap = new Map(brands.map(b => [b.id, b]));

  const toggleSubBrand = async (subcategoryId: string, brandId: string) => {
    const current = subcategoryBrands[subcategoryId] || [];
    if (current.includes(brandId)) {
      await supabase.from("subcategory_brands" as any).delete().eq("subcategory_id", subcategoryId).eq("brand_id", brandId);
    } else {
      await supabase.from("subcategory_brands" as any).insert({ subcategory_id: subcategoryId, brand_id: brandId } as any);
    }
    fetchData();
  };

  return (
    <div className="p-3 sm:p-6 space-y-8">
      <BackButton className="mb-1" />
      {/* Categories Section */}
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><FolderTree className="h-6 w-6" /> Categories</h1>
          <div className="flex items-center gap-2">
            <PrintExportButtons
              title="Categories"
              columns={[
                { header: "Name", accessor: (c) => c.name },
                { header: "Slug", accessor: (c) => c.slug },
                { header: "Sort Order", accessor: (c) => c.sort_order },
              ] satisfies PrintColumn[]}
              data={categories}
            />
            <div className="relative flex-1 sm:w-52">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search categories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
          <Dialog open={catOpen} onOpenChange={(v) => { setCatOpen(v); if (!v) resetCatForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { resetCatForm(); setCatOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
            </DialogTrigger>
            <BulkCategoryUpload onComplete={fetchData} />
            <DialogContent>
              <DialogHeader><DialogTitle>{editingCat ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value, slug: generateSlug(e.target.value) })} placeholder="Category name" />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} placeholder="auto-generated" />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" value={catForm.sort_order} onChange={(e) => setCatForm({ ...catForm, sort_order: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="flex gap-2 mb-2">
                    <Button type="button" variant={iconMode === "lucide" ? "default" : "outline"} size="sm" onClick={() => setIconMode("lucide")}>
                      Icon Library
                    </Button>
                    <Button type="button" variant={iconMode === "upload" ? "default" : "outline"} size="sm" onClick={() => setIconMode("upload")}>
                      Upload Image
                    </Button>
                  </div>
                  {iconMode === "lucide" ? (
                    <IconPicker value={selectedLucideIcon} onChange={setSelectedLucideIcon} />
                  ) : (
                    <>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                        <Upload className="h-4 w-4" />
                        {uploading ? "Uploading..." : "Choose Icon"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleIconUpload} disabled={uploading} />
                      </label>
                      {iconPreview ? (
                        <img src={iconPreview} alt="Icon" className="h-16 w-16 rounded-md object-contain border" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
                      )}
                    </>
                  )}
                </div>
                <Button onClick={saveCat} disabled={uploading}>{editingCat ? "Update" : "Create"}</Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Icon</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-center">Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const q = searchQuery.toLowerCase();
                const filteredCats = categories.filter(c => !q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
                return filteredCats.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No categories found</TableCell></TableRow>
              ) : filteredCats.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card border border-border/70 p-1 shadow-xs">
                      <CategoryIcon iconUrl={c.icon_url} name={c.name} slug={c.slug} className="h-full w-full" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.slug}</TableCell>
                  <TableCell className="text-center">{c.sort_order}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditCat(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteCat(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ));
              })()}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Subcategories Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-bold">Subcategories</h2>
          <Dialog open={subOpen} onOpenChange={(v) => { setSubOpen(v); if (!v) resetSubForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { resetSubForm(); setSubOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add Subcategory</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingSub ? "Edit Subcategory" : "Add Subcategory"}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Parent Category *</Label>
                  <Select value={subForm.category_id} onValueChange={(v) => setSubForm({ ...subForm, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value, slug: generateSlug(e.target.value) })} placeholder="Subcategory name" />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={subForm.slug} onChange={(e) => setSubForm({ ...subForm, slug: e.target.value })} placeholder="auto-generated" />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" value={subForm.sort_order} onChange={(e) => setSubForm({ ...subForm, sort_order: e.target.value })} />
                </div>
                <Button onClick={saveSub}>{editingSub ? "Update" : "Create"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Brands</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-center">Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const q = searchQuery.toLowerCase();
                const filteredSubs = subcategories.filter(s => !q || s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q));
                return filteredSubs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No subcategories found</TableCell></TableRow>
              ) : filteredSubs.map((s) => {
                const assignedBrands = subcategoryBrands[s.id] || [];
                return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{catMap.get(s.category_id) || "—"}</TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-auto min-h-[32px] gap-1 flex-wrap justify-start">
                          {assignedBrands.length === 0 ? (
                            <span className="text-muted-foreground text-xs">Assign brands...</span>
                          ) : (
                            assignedBrands.map(bId => {
                              const brand = brandMap.get(bId);
                              return brand ? <Badge key={bId} variant="secondary" className="text-xs">{brand.name}</Badge> : null;
                            })
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="start">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Toggle brands</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {brands.filter(b => b.status === "approved").map(b => (
                            <label key={b.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted cursor-pointer">
                              <Checkbox checked={assignedBrands.includes(b.id)} onCheckedChange={() => toggleSubBrand(s.id, b.id)} />
                              {b.name}
                            </label>
                          ))}
                          {brands.filter(b => b.status === "approved").length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">No approved brands</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.slug}</TableCell>
                  <TableCell className="text-center">{s.sort_order}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditSub(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteSub(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
                );
              });
              })()}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Brands Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Tag className="h-5 w-5" /> Brands</h2>
          <Dialog open={brandOpen} onOpenChange={(v) => { setBrandOpen(v); if (!v) resetBrandForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { resetBrandForm(); setBrandOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add Brand</Button>
            </DialogTrigger>
            <BulkBrandUpload onComplete={fetchData} />
            <DialogContent>
              <DialogHeader><DialogTitle>{editingBrand ? "Edit Brand" : "Add Brand"}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Brand Name *</Label>
                  <Input value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} placeholder="Brand name" />
                </div>
                <div className="space-y-2">
                  <Label>Logo (optional)</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setBrandLogoFile(e.target.files?.[0] || null)} />
                  {editingBrand?.logo_url && !brandLogoFile && (
                    <img src={editingBrand.logo_url} alt="Current logo" className="h-12 w-12 rounded object-contain border" />
                  )}
                </div>
                <Button onClick={saveBrand}>{editingBrand ? "Update" : "Create"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Logo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const q = searchQuery.toLowerCase();
                const filteredBrands = brands.filter(b => !q || b.name.toLowerCase().includes(q));
                return filteredBrands.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No brands found</TableCell></TableRow>
                ) : filteredBrands.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      {b.logo_url ? <img src={b.logo_url} alt={b.name} className="h-10 w-10 rounded object-contain" /> : <div className="h-10 w-10 rounded bg-muted" />}
                    </TableCell>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell><Badge variant={b.status === "approved" ? "default" : "secondary"}>{b.status}</Badge></TableCell>
                    <TableCell className="text-center"><Switch checked={b.is_active} onCheckedChange={() => toggleBrandActive(b)} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditBrand(b)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteBrand(b.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ));
              })()}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AdminCategories;
