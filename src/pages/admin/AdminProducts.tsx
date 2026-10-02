import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, X, Search, BadgeCheck, Download, Eraser, Loader2, Store, MoreVertical, Package, BoxSelect } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useCategoriesWithSubs } from "@/hooks/useCategories";
import { logActivity } from "@/lib/logActivity";
import { slugify } from "@/lib/slugify";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useCurrency } from "@/contexts/CurrencyContext";
import VariantEditor, { type VariantRow } from "@/components/VariantEditor";
import SpecificationEditor, { type SpecRow, parseSpecsFromDescription, buildSpecsTable } from "@/components/SpecificationEditor";
import CsvProductUpload from "@/components/CsvProductUpload";
import ExcelProductUpload from "@/components/ExcelProductUpload";
import { exportCSV, type PrintColumn } from "@/lib/printExport";
import PrintExportButtons from "@/components/PrintExportButtons";
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
  rating: number | null;
  sold_count: number | null;
  sku: string | null;
  brand_id: string | null;
  is_active: boolean;
  vendor_id: string | null;
}

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  status: string;
}

interface Vendor {
  id: string;
  store_name: string;
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

const AdminProducts = () => {
  const { formatPrice } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 200;
  const [brands, setBrands] = useState<Brand[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bulkVendorId, setBulkVendorId] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", price: "", original_price: "", category: "", subcategory: "",
    image_url: "", stock: "", sku: "", brand_id: "", is_preorder: false, price_unit: "",
    generic_name: "", requires_prescription: false,
  });
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [specs, setSpecs] = useState<SpecRow[]>([]);
  const { data: categoriesWithSubs = [] } = useCategoriesWithSubs();
  const [removingWatermark, setRemovingWatermark] = useState<string | null>(null);

  const fetchProducts = async () => {
    const PAGE = 1000;
    let all: Product[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      all = all.concat(data as Product[]);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    setProducts(all);
  };

  const fetchBrands = async () => {
    const { data } = await supabase.from("brands").select("*").eq("status", "approved").order("name");
    setBrands((data as Brand[]) || []);
  };

  const fetchVendors = async () => {
    const { data } = await supabase.from("vendors" as any).select("id, store_name").eq("status", "approved").order("store_name");
    setVendors((data as any[]) || []);
  };

  useEffect(() => { fetchProducts(); fetchBrands(); fetchVendors(); }, []);

  const batchUpdate = async (ids: string[], updatePayload: { is_active?: boolean; vendor_id?: string | null }) => {
    const chunks: string[][] = [];
    const arr = [...ids];
    for (let i = 0; i < arr.length; i += 50) chunks.push(arr.slice(i, i + 50));
    for (const chunk of chunks) {
      const { error } = await supabase.from("products").update(updatePayload).in("id", chunk);
      if (error) throw error;
    }
  };

  const handleBulkActive = async (active: boolean) => {
    if (selectedIds.size === 0) return;
    const label = active ? "Active" : "Inactive";
    try {
      await batchUpdate([...selectedIds], { is_active: active });
      toast.success(`${selectedIds.size}টি প্রোডাক্ট ${label} করা হয়েছে!`);
      logActivity({ action: active ? "bulk_products_activated" : "bulk_products_deactivated", details: `${selectedIds.size} products set to ${label}` });
      setSelectedIds(new Set());
      fetchProducts();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(`${selectedIds.size}টি প্রোডাক্ট ডিলিট করতে চান?`);
    if (!confirmed) return;
    const { moveToTrash } = await import("@/lib/trash");
    for (const id of selectedIds) {
      const prod = products.find(p => p.id === id);
      if (prod) await moveToTrash("products", id, prod);
    }
    const arr = [...selectedIds];
    const chunks: string[][] = [];
    for (let i = 0; i < arr.length; i += 50) chunks.push(arr.slice(i, i + 50));
    for (const chunk of chunks) {
      const { error } = await supabase.from("products").delete().in("id", chunk);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(`${selectedIds.size}টি প্রোডাক্ট ডিলিট হয়েছে!`);
    logActivity({ action: "bulk_products_deleted", details: `${selectedIds.size} products deleted` });
    setSelectedIds(new Set());
    fetchProducts();
  };

  const handleBulkAssignVendor = async () => {
    if (selectedIds.size === 0 || !bulkVendorId) return;
    setBulkAssigning(true);
    const vendorValue = bulkVendorId === "none" ? null : bulkVendorId;
    try {
      await batchUpdate([...selectedIds], { vendor_id: vendorValue });
      const vendorName = vendors.find(v => v.id === bulkVendorId)?.store_name || "None";
      toast.success(`${selectedIds.size}টি প্রোডাক্ট "${vendorName}" ভেন্ডরে অ্যাসাইন হয়েছে!`);
      logActivity({ action: "bulk_products_assigned", details: `${selectedIds.size} products assigned to vendor: ${vendorName}` });
      setSelectedIds(new Set());
      setBulkVendorId("");
      fetchProducts();
    } catch (e: any) { toast.error(e.message); }
    setBulkAssigning(false);
  };

  const resetForm = () => {
    setForm({ name: "", description: "", price: "", original_price: "", category: "", subcategory: "", image_url: "", stock: "", sku: "", brand_id: "", is_preorder: false, price_unit: "", generic_name: "", requires_prescription: false });
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
    // Fallback: if subcategory is empty but category holds a subcategory slug, try to detect
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
      generic_name: (p as any).generic_name || "", requires_prescription: (p as any).requires_prescription || false,
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
      const filePath = `products/${fileName}`;
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
      stock: Number(form.stock) || 0, sku: form.sku || null, brand_id: form.brand_id || null,
      is_preorder: form.is_preorder, price_unit: form.price_unit || null,
      generic_name: form.generic_name.trim() || null, requires_prescription: form.requires_prescription,
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
    // Save to trash before deleting
    const prod = products.find(p => p.id === id);
    if (prod) {
      const { moveToTrash } = await import("@/lib/trash");
      await moveToTrash("products", id, prod);
    }
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted!");
    logActivity({ action: "product_deleted", details: `Product: ${prod?.name || id}`, entity_type: "product", entity_id: id });
    fetchProducts();
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from("products").update({ is_active: !currentActive }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(!currentActive ? "Product activated!" : "Product deactivated!");
    const prod = products.find(p => p.id === id);
    logActivity({ action: !currentActive ? "product_activated" : "product_deactivated", details: `Product: ${prod?.name || id}`, entity_type: "product", entity_id: id });
    fetchProducts();
  };

  const toggleOutOfStock = async (id: string, currentStock: number) => {
    const newStock = currentStock > 0 ? 0 : 1;
    const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(newStock === 0 ? "Marked as Out of Stock!" : "Marked as In Stock!");
    const prod2 = products.find(p => p.id === id);
    logActivity({ action: newStock === 0 ? "product_out_of_stock" : "product_in_stock", details: `Product: ${prod2?.name || id}, Stock: ${newStock}`, entity_type: "product", entity_id: id });
    fetchProducts();
  };

  const togglePreorder = async (id: string, currentPreorder: boolean) => {
    const { error } = await supabase.from("products").update({ is_preorder: !currentPreorder }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(!currentPreorder ? "Pre-Order চালু হয়েছে!" : "Pre-Order বন্ধ হয়েছে!");
    const prod = products.find(p => p.id === id);
    logActivity({ action: !currentPreorder ? "preorder_enabled" : "preorder_disabled", details: `Product: ${prod?.name || id}`, entity_type: "product", entity_id: id });
    fetchProducts();
  };

  const selectedCategory = categoriesWithSubs.find(c => c.slug === form.category);
  const brandMap = new Map(brands.map(b => [b.id, b.name]));

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
    const matchesStock = stockFilter === "all" || (stockFilter === "in" ? p.stock > 0 : p.stock <= 0);
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    const matchesBrand = brandFilter === "all" || p.brand_id === brandFilter;
    return matchesSearch && matchesStock && matchesCategory && matchesBrand;
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const safeCurrentPage = Math.min(currentPage, totalPages || 1);
  const paginatedProducts = filteredProducts.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, stockFilter, categoryFilter, brandFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredProducts.map(p => p.id)));
  };

  const handleExportCSV = () => {
    const data = selectedIds.size > 0 ? filteredProducts.filter(p => selectedIds.has(p.id)) : filteredProducts;
    const cols: PrintColumn[] = [
      { header: "Name", accessor: (r) => r.name },
      { header: "SKU", accessor: (r) => r.sku || "" },
      { header: "Category", accessor: (r) => r.category || "" },
      { header: "Price", accessor: (r) => r.price },
      { header: "Original Price", accessor: (r) => r.original_price || "" },
      { header: "Stock", accessor: (r) => r.stock },
      { header: "Sold", accessor: (r) => r.sold_count || 0 },
      { header: "Active", accessor: (r) => r.is_active ? "Yes" : "No" },
    ];
    exportCSV("Products", cols, data);
  };

  const handleExportWithImages = () => {
    const dataToExport = selectedIds.size > 0 ? filteredProducts.filter(p => selectedIds.has(p.id)) : filteredProducts;
    const extractSpecsAndDesc = (desc: string | null) => {
      if (!desc) return { specs: '', description: '' };
      const tableMatch = desc.match(/^(<table[\s\S]*?<\/table>)([\s\S]*)$/i);
      if (tableMatch) {
        // Convert HTML table to plain text key:value pairs
        const specsHtml = tableMatch[1];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = specsHtml;
        const rows = tempDiv.querySelectorAll('tr');
        const specPairs: string[] = [];
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) specPairs.push(`${cells[0].textContent?.trim()}: ${cells[1].textContent?.trim()}`);
        });
        const restDiv = document.createElement('div');
        restDiv.innerHTML = tableMatch[2].trim();
        return { specs: specPairs.join('\n'), description: restDiv.textContent?.trim() || '' };
      }
      const div = document.createElement('div');
      div.innerHTML = desc;
      return { specs: '', description: div.textContent?.trim() || '' };
    };
    const rows = dataToExport.map(p => {
      const { specs, description } = extractSpecsAndDesc(p.description);
      const escapedDesc = description.replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
      const escapedSpecs = specs.replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
      return `<tr style="height:65px;"><td style="width:65px;height:65px;vertical-align:middle;">${p.image_url ? `<img src="${p.image_url}" width="60" height="60" style="display:block;" />` : ''}</td><td style="vertical-align:middle;">${p.name}</td><td style="vertical-align:middle;">${p.sku || ''}</td><td style="vertical-align:middle;">${p.category || ''}</td><td style="vertical-align:middle;">${p.price}</td><td style="vertical-align:middle;">${p.original_price || ''}</td><td style="vertical-align:middle;">${p.stock}</td><td style="vertical-align:middle;">${p.sold_count || 0}</td><td style="vertical-align:middle;">${p.is_active ? 'Yes' : 'No'}</td><td style="vertical-align:middle;white-space:pre-wrap;max-width:300px;">${escapedSpecs}</td><td style="vertical-align:middle;white-space:pre-wrap;max-width:400px;">${escapedDesc}</td><td style="vertical-align:middle;">3-5 Days</td></tr>`;
    }).join('');
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Products</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><style>table{border-collapse:collapse;width:100%;mso-displayed-decimal-separator:"."}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:13px;vertical-align:middle}th{background:#f5f5f5;font-weight:600;height:30px}tr{height:65px;mso-height-source:fixed}td img{display:block}</style></head><body><table><thead><tr><th>Image</th><th>Name</th><th>SKU</th><th>Category</th><th>Price</th><th>Original Price</th><th>Stock</th><th>Sold</th><th>Active</th><th>Specification</th><th>Description</th><th>Delivery Time</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Products_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRemoveWatermark = async (p: Product) => {
    if (!p.image_url) return;
    setRemovingWatermark(p.id);
    try {
      const { data, error } = await supabase.functions.invoke("remove-watermark", { body: { image_url: p.image_url } });
      if (error) throw error;
      if (data?.success && data?.image_url) {
        await supabase.from("products").update({ image_url: data.image_url }).eq("id", p.id);
        toast.success("Watermark removed!");
        fetchProducts();
      } else { toast.error(data?.error || "Could not remove watermark"); }
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setRemovingWatermark(null); }
  };

  return (
    <div className="p-3 sm:p-6">
      <BackButton className="mb-2" />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Products</h1>
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
          <CsvProductUpload onComplete={fetchProducts} />
          <ExcelProductUpload onComplete={fetchProducts} />
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExportCSV} disabled={filteredProducts.length === 0}>
            <Download className="h-3.5 w-3.5" />
            {selectedIds.size > 0 ? `CSV (${selectedIds.size})` : "CSV"}
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExportWithImages} disabled={filteredProducts.length === 0}>
            <Download className="h-3.5 w-3.5" />
            {selectedIds.size > 0 ? `Excel+Image (${selectedIds.size})` : "Excel+Image"}
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} size="sm"><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
                </div>
                <div className="space-y-2">
                  <Label>Generic Name (জেনেরিক নাম)</Label>
                  <Input value={form.generic_name} onChange={(e) => setForm({ ...form, generic_name: e.target.value })} placeholder="e.g. Paracetamol, Omeprazole" />
                </div>
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <Switch checked={form.requires_prescription} onCheckedChange={(v) => setForm({ ...form, requires_prescription: v })} />
                  <div>
                    <Label>Requires Prescription</Label>
                    <p className="text-xs text-muted-foreground">এই ওষুধের জন্য প্রেসক্রিপশন লাগবে</p>
                  </div>
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
                    isAdmin={true}
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
                    <Label>MRP (Main Price)</Label>
                    <Input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Offer Price *</Label>
                    <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
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
                          <div key={i} className="relative h-16 w-16 overflow-hidden rounded-md border group">
                            <img src={url} alt={`Image ${i + 1}`} className="h-full w-full object-cover" />
                            <button onClick={() => removeImage(i)} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="h-3 w-3" />
                            </button>
                            {i === 0 && <span className="absolute bottom-0 left-0 bg-primary text-primary-foreground text-[9px] px-1 rounded-tr">Main</span>}
                          </div>
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

      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <span className="text-sm font-medium">{selectedIds.size}টি সিলেক্টেড</span>
          <Button variant="destructive" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleBulkDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Bulk Delete
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-green-600 text-green-600 hover:bg-green-50" onClick={() => handleBulkActive(true)}>
            Active
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleBulkActive(false)}>
            Inactive
          </Button>
          <div className="flex items-center gap-1.5">
            <Select value={bulkVendorId} onValueChange={setBulkVendorId}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <Store className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Vendor সিলেক্ট করুন" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No Vendor —</SelectItem>
                {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.store_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-xs" onClick={handleBulkAssignVendor} disabled={!bulkVendorId || bulkAssigning}>
              Assign
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs ml-auto" onClick={() => setSelectedIds(new Set())}>
            ক্লিয়ার
          </Button>
        </div>
      )}

      {/* Mobile card layout */}
      <div className="space-y-2 sm:hidden">
        {paginatedProducts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No products found</div>
        ) : paginatedProducts.map((p) => (
          <div key={p.id} className={`rounded-lg border bg-card p-3 space-y-2 ${!p.is_active ? "opacity-50" : ""}`}>
            <div className="flex gap-3">
              <div className="shrink-0">
                <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} className="mb-1" />
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-14 w-14 rounded object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded bg-muted"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{p.name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(p as any).is_preorder && <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary">Pre-Order</Badge>}
                  {p.sold_count ? <span className="text-[10px] text-muted-foreground">{p.sold_count} sold</span> : null}
                  {p.rating ? <span className="text-[10px] text-amber-500">★ {p.rating}</span> : null}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div>
                    {p.original_price && <span className="text-xs text-muted-foreground">MRP: <span className="line-through">{formatPrice(p.original_price)}</span></span>}
                    <span className="font-bold text-sm text-primary">{formatPrice(p.price)}</span>
                  </div>
                  <Badge variant={p.stock > 0 ? "secondary" : "destructive"} className="text-[10px]">Stock: {p.stock}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  {p.category && <span>{p.category}</span>}
                  {p.sku && <span>SKU: {p.sku}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p.id, p.is_active)} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => openEdit(p)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden sm:block rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length} onCheckedChange={toggleSelectAll} />
              </TableHead>
              <TableHead className="w-[60px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Brand</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="text-right">MRP</TableHead>
              <TableHead className="text-right">Offer Price</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Stock</TableHead>
              <TableHead className="hidden md:table-cell">SKU</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No products found</TableCell></TableRow>
            ) : paginatedProducts.map((p) => (
              <TableRow key={p.id} className={`${!p.is_active ? "opacity-50" : ""} h-10`}>
                <TableCell className="py-1 px-2">
                  <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                </TableCell>
                <TableCell className="py-1 px-2">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-muted"><ImageIcon className="h-3.5 w-3.5 text-muted-foreground" /></div>
                  )}
                </TableCell>
                <TableCell className="py-1 px-2">
                  <div className="max-w-[150px]">
                    <p className="font-medium truncate text-sm">{p.name}</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {(p as any).is_preorder && <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary">Pre-Order</Badge>}
                      {p.sold_count ? <span className="text-[10px] text-muted-foreground">{p.sold_count} sold</span> : null}
                      {p.rating ? <span className="text-[10px] text-amber-500">★ {p.rating}</span> : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs py-1 px-2">{p.brand_id ? brandMap.get(p.brand_id) || "—" : "—"}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs py-1 px-2">{p.category || "—"}</TableCell>
                <TableCell className="text-right py-1 px-2">
                  {p.original_price ? <span className="text-xs text-muted-foreground">{formatPrice(p.original_price)}</span> : <span className="text-muted-foreground text-xs">—</span>}
                </TableCell>
                <TableCell className="text-right py-1 px-2">
                  <span className="font-semibold text-primary text-sm">{formatPrice(p.price)}</span>
                </TableCell>
                <TableCell className="text-right hidden sm:table-cell py-1 px-2">
                  <Badge variant={p.stock > 0 ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0">{p.stock}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-[11px] text-muted-foreground py-1 px-2">{p.sku || "—"}</TableCell>
                <TableCell className="text-center py-1 px-2">
                  <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p.id, p.is_active)} className="scale-90" />
                </TableCell>
                <TableCell className="text-right py-1 px-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={async () => {
                          const newVal = !(p as any).is_qmall_verified;
                          const { error } = await supabase.from("products").update({ is_qmall_verified: newVal } as any).eq("id", p.id);
                          if (error) { toast.error(error.message); return; }
                          toast.success(newVal ? "SKP ভেরিফাইড চালু!" : "SKP ভেরিফাইড বন্ধ!");
                          logActivity({ action: newVal ? "qmall_verified" : "qmall_unverified", details: `Product: ${p.name}`, entity_type: "product", entity_id: p.id });
                          fetchProducts();
                        }}
                      >
                        <BadgeCheck className="h-4 w-4 mr-2" />
                        {(p as any).is_qmall_verified ? "SKP ✓" : "SKP"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => togglePreorder(p.id, (p as any).is_preorder)}>
                        <Package className="h-4 w-4 mr-2" />
                        {(p as any).is_preorder ? "Pre-Order Off" : "Pre-Order On"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleOutOfStock(p.id, p.stock)}>
                        <BoxSelect className="h-4 w-4 mr-2" />
                        {p.stock <= 0 ? "In Stock" : "Out of Stock"}
                      </DropdownMenuItem>
                      {p.image_url && (
                        <DropdownMenuItem onClick={() => handleRemoveWatermark(p)} disabled={removingWatermark === p.id}>
                          {removingWatermark === p.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eraser className="h-4 w-4 mr-2" />}
                          Watermark Remove
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            মোট {filteredProducts.length}টি প্রোডাক্ট — পেজ {safeCurrentPage}/{totalPages}
          </p>
          <div className="flex items-center gap-1 flex-wrap">
            <Button variant="outline" size="sm" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage(1)}>
              ««
            </Button>
            <Button variant="outline" size="sm" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
              «
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2)
              .reduce<(number | string)[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                typeof p === "string" ? (
                  <span key={`dot-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={p === safeCurrentPage ? "default" : "outline"}
                    size="sm"
                    className="min-w-[36px]"
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </Button>
                )
              )}
            <Button variant="outline" size="sm" disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
              »
            </Button>
            <Button variant="outline" size="sm" disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage(totalPages)}>
              »»
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
