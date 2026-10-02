import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVendor } from "@/contexts/VendorContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, X, Send, PackageX, Search, PackageCheck, Download, Eraser, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { exportCSV, type PrintColumn } from "@/lib/printExport";
import { toast } from "sonner";
import { useCategoriesWithSubs } from "@/hooks/useCategories";
import { logActivity } from "@/lib/logActivity";
import { slugify } from "@/lib/slugify";
import VariantEditor, { type VariantRow } from "@/components/VariantEditor";
import SpecificationEditor, { type SpecRow, parseSpecsFromDescription, buildSpecsTable } from "@/components/SpecificationEditor";
import BackButton from "@/components/BackButton";
import BrandSelectWithCreate from "@/components/BrandSelectWithCreate";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category: string | null;
  image_url: string | null;
  stock: number;
  sold_count: number | null;
  sku: string | null;
  brand_id: string | null;
  is_active: boolean;
}

interface Brand {
  id: string;
  name: string;
}

interface ProductImage {
  id: string;
  image_url: string;
  sort_order: number;
}

const generateSKU = () => {
  const prefix = "SKU";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

import { Button } from "@/components/ui/button";

const ImageThumb = ({ url, index, isMain, onRemove, onReplace }: {
  url: string; index: number; isMain: boolean;
  onRemove: (i: number) => void;
  onReplace: (i: number, newUrl: string) => void;
}) => {
  const [removing, setRemoving] = useState(false);

  const handleRemoveWatermark = async () => {
    setRemoving(true);
    try {
      const { data, error } = await supabase.functions.invoke("remove-watermark", {
        body: { image_url: url },
      });
      if (error) throw error;
      if (data?.success && data?.image_url) {
        onReplace(index, data.image_url);
        toast.success("Watermark removed!");
      } else {
        toast.error(data?.error || "Could not remove watermark");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to remove watermark");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="relative h-16 w-16 overflow-hidden rounded-md border group">
      <img src={url} alt={`Image ${index + 1}`} className="h-full w-full object-cover" />
      <button onClick={() => onRemove(index)} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <X className="h-3 w-3" />
      </button>
      <button
        onClick={handleRemoveWatermark}
        disabled={removing}
        className="absolute bottom-0 right-0 bg-accent text-accent-foreground rounded-tl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
        title="Remove Watermark"
      >
        {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eraser className="h-3 w-3" />}
      </button>
      {isMain && <span className="absolute bottom-0 left-0 bg-primary text-primary-foreground text-[9px] px-1 rounded-tr">Main</span>}
    </div>
  );
};

const WatermarkBtn = ({ productId, imageUrl, onDone }: { productId: string; imageUrl: string | null; onDone: () => void }) => {
  const [removing, setRemoving] = useState(false);
  if (!imageUrl) return null;

  const handle = async () => {
    setRemoving(true);
    try {
      const { data, error } = await supabase.functions.invoke("remove-watermark", { body: { image_url: imageUrl } });
      if (error) throw error;
      if (data?.success && data?.image_url) {
        await supabase.from("products").update({ image_url: data.image_url }).eq("id", productId);
        toast.success("Watermark removed!");
        onDone();
      } else {
        toast.error(data?.error || "Could not remove watermark");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handle} disabled={removing} title="Remove Watermark">
      {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eraser className="h-3.5 w-3.5" />}
    </Button>
  );
};

const VendorProducts = () => {
  const { user } = useAuth();
  const { vendorId, vendor: vendorData } = useVendor();
  const vendorStatus = vendorData?.status || "pending";
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [brands, setBrands] = useState<Brand[]>([]);
  const [open, setOpen] = useState(false);
  const [brandRequestOpen, setBrandRequestOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", price: "", original_price: "", category: "", subcategory: "",
    image_url: "", stock: "", sku: "", brand_id: "", is_preorder: false, price_unit: "",
  });
  const [brandRequestForm, setBrandRequestForm] = useState({ brand_name: "", logo_url: "" });
  const [uploading, setUploading] = useState(false);
  const [brandLogoUploading, setBrandLogoUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [specs, setSpecs] = useState<SpecRow[]>([]);
  const { data: categoriesWithSubs = [] } = useCategoriesWithSubs();

  useEffect(() => { if (vendorId) fetchProducts(); }, [vendorId]);
  useEffect(() => { fetchBrands(); }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").eq("vendor_id", vendorId!).order("created_at", { ascending: false });
    setProducts((data as Product[]) || []);
  };

  const fetchBrands = async () => {
    const { data } = await supabase.from("brands").select("id, name").eq("status", "approved").order("name");
    setBrands((data as Brand[]) || []);
  };

  const resetForm = () => {
    setForm({ name: "", description: "", price: "", original_price: "", category: "", subcategory: "", image_url: "", stock: "", sku: "", brand_id: "", is_preorder: false, price_unit: "" });
    setEditing(null);
    setImages([]);
    setVariants([]);
    setSpecs([]);
  };

  const openEdit = async (p: Product) => {
    setEditing(p);
    const prod = p as any;
    let parentCat = prod.category || "";
    let subCat = prod.subcategory || "";
    if (!subCat && parentCat) {
      const found = categoriesWithSubs.find(c => c.slug === parentCat);
      if (!found) {
        for (const cat of categoriesWithSubs) {
          const sub = cat.subcategories.find(s => s.slug === parentCat);
          if (sub) { parentCat = cat.slug; subCat = sub.slug; break; }
        }
      }
    }
    const { specs: parsedSpecs, restDescription } = parseSpecsFromDescription(p.description);
    setSpecs(parsedSpecs);
    setForm({
      name: p.name, description: restDescription, price: String(p.price),
      original_price: p.original_price ? String(p.original_price) : "",
      category: parentCat, subcategory: subCat,
      image_url: p.image_url || "", stock: String(p.stock), sku: p.sku || "",
      brand_id: p.brand_id || "", is_preorder: (p as any).is_preorder || false,
      price_unit: (p as any).price_unit || "",
    });
    const { data: imgData } = await supabase.from("product_images").select("*").eq("product_id", p.id).order("sort_order");
    const existingImages = (imgData as ProductImage[])?.map(i => i.image_url) || [];
    setImages(p.image_url ? [p.image_url, ...existingImages] : existingImages);
    const { data: varData } = await supabase.from("product_variants").select("*").eq("product_id", p.id).order("sort_order");
    setVariants((varData || []).map((v: any) => ({
      id: v.id, variant_name: v.variant_name, variant_value: v.variant_value,
      price_adjustment: v.price_adjustment, stock: v.stock, sku: v.sku || "",
    })));
    setOpen(true);
  };

  const openCreate = () => {
    resetForm();
    setForm((prev) => ({ ...prev, sku: generateSKU() }));
    setOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < Array.from(files).length; i++) {
      const file = Array.from(files)[i];
      if (!file.type.startsWith("image/")) { toast.error(`${file.name} is not an image`); continue; }
      const fileExt = file.name.split(".").pop();
      const nameSlug = slugify(form.name || "product");
      const imageIndex = images.length + i + 1;
      const fileName = `${nameSlug}-${imageIndex}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;
      const { error } = await supabase.storage.from("product-images").upload(filePath, file, { upsert: true });
      if (error) { toast.error("Upload failed: " + error.message); continue; }
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
      setImages(prev => [...prev, urlData.publicUrl]);
    }
    setUploading(false);
    toast.success("Images uploaded!");
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    if (!form.price || Number(form.price) <= 0) { toast.error("Valid price is required"); return; }
    const categoryValue = form.category || null;
    const subcategoryValue = form.subcategory || null;
    const specsTable = buildSpecsTable(specs.filter(s => s.key.trim()));
    const fullDescription = specsTable + (form.description || "");
    const payload = {
      name: form.name, description: fullDescription || null,
      price: Number(form.price), original_price: form.original_price ? Number(form.original_price) : null,
      category: categoryValue, subcategory: subcategoryValue, image_url: images[0] || null,
      stock: Number(form.stock) || 0, vendor_id: vendorId, sku: form.sku || null,
      brand_id: form.brand_id || null, is_preorder: form.is_preorder, price_unit: form.price_unit || null,
    };
    let productId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      await supabase.from("product_images").delete().eq("product_id", editing.id);
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) { toast.error(error.message); return; }
      productId = data.id;
    }
    if (productId && images.length > 1) {
      const additionalImages = images.slice(1).map((url, i) => ({
        product_id: productId!, image_url: url, sort_order: i,
      }));
      await supabase.from("product_images").insert(additionalImages);
    }
    // Save variants
    if (productId) {
      await supabase.from("product_variants").delete().eq("product_id", productId);
      if (variants.length > 0) {
        const variantRows = variants.map((v, i) => ({
          product_id: productId!, variant_name: v.variant_name, variant_value: v.variant_value,
          price_adjustment: v.price_adjustment, stock: v.stock, sku: v.sku || null, sort_order: i,
        }));
        await supabase.from("product_variants").insert(variantRows);
      }
    }
    toast.success(editing ? "Product updated!" : "Product created!");
    logActivity({ action: editing ? "product_updated" : "product_created", details: `Product: ${form.name}`, entity_type: "product", entity_id: productId });
    setOpen(false);
    resetForm();
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted!");
    fetchProducts();
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from("products").update({ is_active: !currentActive }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(!currentActive ? "Product activated!" : "Product deactivated!");
    logActivity({ action: !currentActive ? "product_activated" : "product_deactivated", entity_type: "product", entity_id: id });
    fetchProducts();
  };

  const toggleOutOfStock = async (id: string, currentStock: number) => {
    const newStock = currentStock > 0 ? 0 : 1;
    const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(newStock === 0 ? "Marked as Out of Stock!" : "Marked as In Stock!");
    logActivity({ action: newStock === 0 ? "product_out_of_stock" : "product_in_stock", entity_type: "product", entity_id: id });
    fetchProducts();
  };

  const togglePreorder = async (id: string, currentPreorder: boolean) => {
    const { error } = await supabase.from("products").update({ is_preorder: !currentPreorder }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(!currentPreorder ? "Pre-Order চালু হয়েছে!" : "Pre-Order বন্ধ হয়েছে!");
    logActivity({ action: !currentPreorder ? "preorder_enabled" : "preorder_disabled", entity_type: "product", entity_id: id });
    fetchProducts();
  };

  const handleBrandLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    setBrandLogoUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `brand-${Date.now()}.${fileExt}`;
    const filePath = `brands/${fileName}`;
    const { error } = await supabase.storage.from("product-images").upload(filePath, file);
    if (error) { toast.error("Upload failed"); setBrandLogoUploading(false); return; }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
    setBrandRequestForm(prev => ({ ...prev, logo_url: urlData.publicUrl }));
    setBrandLogoUploading(false);
  };

  const handleBrandRequest = async () => {
    if (!brandRequestForm.brand_name.trim()) { toast.error("Brand name is required"); return; }
    if (!vendorId) return;
    const { error } = await supabase.from("brand_requests").insert({
      vendor_id: vendorId, brand_name: brandRequestForm.brand_name, logo_url: brandRequestForm.logo_url || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Brand request submitted! Admin will review it.");
    logActivity({ action: "brand_request_submitted", details: `Brand: ${brandRequestForm.brand_name}`, entity_type: "brand_request" });
    setBrandRequestOpen(false);
    setBrandRequestForm({ brand_name: "", logo_url: "" });
  };

  const selectedCategory = categoriesWithSubs.find(c => c.slug === form.category);

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
    const matchesStock = stockFilter === "all" || (stockFilter === "in" ? p.stock > 0 : p.stock <= 0);
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    const matchesBrand = brandFilter === "all" || p.brand_id === brandFilter;
    return matchesSearch && matchesStock && matchesCategory && matchesBrand;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const exportColumns: PrintColumn[] = [
    { header: "Name", accessor: (r) => r.name },
    { header: "SKU", accessor: (r) => r.sku || "" },
    { header: "Category", accessor: (r) => r.category || "" },
    { header: "Price", accessor: (r) => r.price },
    { header: "Original Price", accessor: (r) => r.original_price || "" },
    { header: "Stock", accessor: (r) => r.stock },
    { header: "Sold", accessor: (r) => r.sold_count || 0 },
    { header: "Active", accessor: (r) => r.is_active ? "Yes" : "No" },
    { header: "Image URL", accessor: (r) => r.image_url || "" },
  ];

  const handleExport = () => {
    const dataToExport = selectedIds.size > 0
      ? filteredProducts.filter(p => selectedIds.has(p.id))
      : filteredProducts;
    exportCSV("Products", exportColumns, dataToExport);
  };

  const handleExportWithImages = () => {
    const dataToExport = selectedIds.size > 0
      ? filteredProducts.filter(p => selectedIds.has(p.id))
      : filteredProducts;

    const rows = dataToExport.map(p =>
      `<tr style="height:65px;"><td style="width:65px;height:65px;vertical-align:middle;">${p.image_url ? `<img src="${p.image_url}" width="60" height="60" style="display:block;" />` : ''}</td><td style="vertical-align:middle;">${p.name}</td><td style="vertical-align:middle;">${p.sku || ''}</td><td style="vertical-align:middle;">${p.category || ''}</td><td style="vertical-align:middle;">${p.price}</td><td style="vertical-align:middle;">${p.original_price || ''}</td><td style="vertical-align:middle;">${p.stock}</td><td style="vertical-align:middle;">${p.sold_count || 0}</td><td style="vertical-align:middle;">${p.is_active ? 'Yes' : 'No'}</td></tr>`
    ).join('');

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Products</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  table { border-collapse: collapse; width: 100%; mso-displayed-decimal-separator: "."; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 13px; vertical-align: middle; }
  th { background: #f5f5f5; font-weight: 600; height: 30px; }
  tr { height: 65px; mso-height-source: fixed; }
  td img { display: block; }
</style></head><body>
<table>
  <thead><tr><th>Image</th><th>Name</th><th>SKU</th><th>Category</th><th>Price</th><th>Original Price</th><th>Stock</th><th>Sold</th><th>Active</th></tr></thead>
  <tbody>${rows}</tbody>
</table></body></html>`;

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Products_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (vendorStatus !== "approved") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <p className="text-muted-foreground">You can add products once your store is approved.</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      <BackButton className="mb-2" />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl md:text-2xl font-bold">My Products</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-52 min-w-[150px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in">In Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoriesWithSubs.map((cat) => (
                <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredProducts.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            {selectedIds.size > 0 ? `CSV (${selectedIds.size})` : "CSV"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportWithImages} disabled={filteredProducts.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            {selectedIds.size > 0 ? `Excel+Image (${selectedIds.size})` : "Excel+Image"}
          </Button>
          <Dialog open={brandRequestOpen} onOpenChange={setBrandRequestOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Send className="mr-2 h-4 w-4" /> Request Brand</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request New Brand</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Brand Name *</Label>
                  <Input value={brandRequestForm.brand_name} onChange={(e) => setBrandRequestForm(prev => ({ ...prev, brand_name: e.target.value }))} placeholder="Brand name" />
                </div>
                <div className="space-y-2">
                  <Label>Brand Logo</Label>
                  <div className="flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                      <Upload className="h-4 w-4" />
                      {brandLogoUploading ? "Uploading..." : "Choose Logo"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleBrandLogoUpload} disabled={brandLogoUploading} />
                    </label>
                    {brandRequestForm.logo_url && (
                      <img src={brandRequestForm.logo_url} alt="Logo" className="h-12 w-12 rounded object-cover border" />
                    )}
                  </div>
                </div>
                <Button onClick={handleBrandRequest} disabled={brandLogoUploading}>Submit Request</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} size="sm"><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description" />
                </div>
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <BrandSelectWithCreate
                    value={form.brand_id}
                    onChange={(v) => setForm({ ...form, brand_id: v })}
                    brands={brands}
                    isAdmin={false}
                    vendorId={vendorId}
                    onBrandCreated={() => fetchBrands()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, subcategory: "" })}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categoriesWithSubs.map((cat) => (
                          <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subcategory</Label>
                    <Select value={form.subcategory} onValueChange={(v) => setForm({ ...form, subcategory: v })} disabled={!selectedCategory}>
                      <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                      <SelectContent>
                        {selectedCategory?.subcategories.map((sub) => (
                          <SelectItem key={sub.slug} value={sub.slug}>{sub.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price ($) *</Label>
                    <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Offer Price ($)</Label>
                    <Input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} placeholder="Optional" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stock</Label>
                    <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>SKU Code</Label>
                    <Input value={form.sku} readOnly className="bg-muted text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Product Images</Label>
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                      <Upload className="h-4 w-4" />
                      {uploading ? "Uploading..." : "Choose Images"}
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                    {images.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {images.map((url, i) => (
                          <ImageThumb key={i} url={url} index={i} isMain={i === 0} onRemove={removeImage} onReplace={(idx, newUrl) => setImages(prev => prev.map((u, j) => j === idx ? newUrl : u))} />
                        ))}
                      </div>
                    )}
                    {images.length === 0 && (
                      <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <Switch checked={form.is_preorder} onCheckedChange={(v) => setForm({ ...form, is_preorder: v })} />
                  <div>
                    <Label>Pre-Order</Label>
                    <p className="text-xs text-muted-foreground">এই প্রোডাক্ট প্রি-অর্ডারের জন্য উপলব্ধ</p>
                  </div>
                </div>
                <div>
                  <Label>Price Unit (per strip / per unit)</Label>
                  <Select value={form.price_unit.replace(/\s*\(\d+\s*pcs\)/, "")} onValueChange={(v) => {
                    if (v === "none") setForm({ ...form, price_unit: "" });
                    else {
                      const pcsMatch = form.price_unit.match(/\((\d+)\s*pcs\)/);
                      setForm({ ...form, price_unit: pcsMatch ? `${v} (${pcsMatch[1]} pcs)` : v });
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="কোনো ইউনিট নেই" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">কোনো ইউনিট নেই</SelectItem>
                      <SelectItem value="per strip">Per Strip</SelectItem>
                      <SelectItem value="per unit">Per Unit</SelectItem>
                      <SelectItem value="per piece">Per Piece</SelectItem>
                      <SelectItem value="per box">Per Box</SelectItem>
                      <SelectItem value="per pack">Per Pack</SelectItem>
                      <SelectItem value="per bottle">Per Bottle</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.price_unit && form.price_unit !== "none" && (
                    <div className="mt-2">
                      <Label>কত পিস আছে?</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="যেমন: 10"
                        value={form.price_unit.match(/\((\d+)\s*pcs\)/)?.[1] || ""}
                        onChange={(e) => {
                          const base = form.price_unit.replace(/\s*\(\d+\s*pcs\)/, "");
                          const pcs = e.target.value;
                          setForm({ ...form, price_unit: pcs ? `${base} (${pcs} pcs)` : base });
                        }}
                      />
                    </div>
                  )}
                </div>
                <SpecificationEditor specs={specs} onChange={setSpecs} />
                <VariantEditor variants={variants} onChange={setVariants} />
                <Button onClick={handleSave} disabled={uploading}>{editing ? "Update" : "Create"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {filteredProducts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No products found</p>
        ) : filteredProducts.map((p) => (
          <div key={p.id} className={`rounded-lg border bg-card p-3 space-y-2 ${!p.is_active ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="h-12 w-12 rounded object-cover shrink-0" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-muted shrink-0"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-semibold text-primary text-sm">${p.price}</span>
                  {p.original_price && <span className="text-xs text-muted-foreground line-through">${p.original_price}</span>}
                  <Badge variant={p.stock > 0 ? "secondary" : "destructive"} className="text-[10px]">{p.stock} stock</Badge>
                </div>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {(p as any).is_preorder && <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary">Pre-Order</Badge>}
                  <span className="text-[10px] text-muted-foreground">{p.sold_count || 0} sold</span>
                  {p.category && <span className="text-[10px] text-muted-foreground">· {p.category}</span>}
                </div>
              </div>
              <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p.id, p.is_active)} />
            </div>
            <div className="flex gap-1 flex-wrap">
              <Button variant={(p as any).is_preorder ? "default" : "outline"} size="sm" className="text-[10px] h-6 px-2" onClick={() => togglePreorder(p.id, (p as any).is_preorder)}>
                {(p as any).is_preorder ? "Pre-Order ✓" : "Pre-Order"}
              </Button>
              <Button variant={p.stock <= 0 ? "destructive" : "outline"} size="sm" className="text-[10px] h-6 px-2" onClick={() => toggleOutOfStock(p.id, p.stock)}>
                {p.stock <= 0 ? "Out" : "Stock"}
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="rounded-lg border bg-card overflow-x-auto hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[60px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="hidden md:table-cell">SKU</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No products found</TableCell></TableRow>
            ) : filteredProducts.map((p) => (
              <TableRow key={p.id} className={!p.is_active ? "opacity-50" : ""}>
                <TableCell>
                  <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                </TableCell>
                <TableCell>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="max-w-[150px]">
                    <p className="font-medium truncate">{p.name}</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {(p as any).is_preorder && <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary">Pre-Order</Badge>}
                      {(p as any).is_preorder && (p as any).preorder_count > 0 && <span className="text-[10px] text-primary">{(p as any).preorder_count} pre-orders</span>}
                      <span className="text-[11px] text-muted-foreground">{p.sold_count || 0} sold</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">{p.category || "—"}</TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold text-primary">${p.price}</span>
                  {p.original_price && <span className="block text-xs text-muted-foreground line-through">${p.original_price}</span>}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={p.stock > 0 ? "secondary" : "destructive"} className="text-xs">{p.stock}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{p.sku || "—"}</TableCell>
                <TableCell className="text-center">
                  <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p.id, p.is_active)} />
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant={(p as any).is_preorder ? "default" : "outline"} size="sm" className="text-[11px] h-7 px-2" onClick={() => togglePreorder(p.id, (p as any).is_preorder)}>
                    {(p as any).is_preorder ? "Pre-Order On" : "Pre-Order"}
                  </Button>
                  <Button variant={p.stock <= 0 ? "destructive" : "outline"} size="sm" className="text-[11px] h-7 px-2" onClick={() => toggleOutOfStock(p.id, p.stock)}>
                    {p.stock <= 0 ? "Out" : "Stock"}
                  </Button>
                  <WatermarkBtn productId={p.id} imageUrl={p.image_url} onDone={fetchProducts} />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default VendorProducts;
