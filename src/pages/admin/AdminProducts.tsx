import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Pencil, Trash2, Upload, Image as ImageIcon, X, Search, 
  BadgeCheck, Download, Eraser, Loader2, Store, MoreVertical, 
  Package, BoxSelect, FileText, CheckCircle, AlertCircle, RefreshCw 
} from "lucide-react";
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
import BackButton from "@/components/BackButton";
import BrandSelectWithCreate from "@/components/BrandSelectWithCreate";
import { uploadToVault } from "@/lib/vaultStorage";
import MedicalSectionEditor from "@/components/MedicalSectionEditor";

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  price_unit: string | null;
  category: string | null;
  subcategory: string | null;
  image_url: string | null;
  stock: number;
  rating: number | null;
  sold_count: number | null;
  sku: string | null;
  brand_id: string | null;
  vendor_id: string | null;
  is_active: boolean;
  is_qmall_verified: boolean;
  is_preorder: boolean;
  generic_name: string | null;
  requires_prescription: boolean;
  delivery_time: string | null;
  created_at: string;
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
  const prefix = "SKP";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const PAGE_SIZE = 50;

const AdminProducts = () => {
  const { formatPrice } = useCurrency();
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Data & Pagination
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Selection & Bulk
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkVendorId, setBulkVendorId] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // Meta collections
  const [brands, setBrands] = useState<Brand[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const { data: categoriesWithSubs = [] } = useCategoriesWithSubs();

  // Edit/Create Modal
  const [open, setOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: "",
    generic_name: "",
    slug: "",
    sku: "",
    brand_id: "",
    category: "",
    subcategory: "",
    price: "",
    original_price: "",
    price_unit: "",
    stock: "100",
    delivery_time: "24-48 Hours",
    description: "",
    is_active: true,
    requires_prescription: false,
    is_preorder: false,
    is_qmall_verified: false,
  });

  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [specs, setSpecs] = useState<SpecRow[]>([]);
  const [removingWatermark, setRemovingWatermark] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Brands & Vendors on Mount
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const { data: bData } = await supabase.from("brands").select("id, name, logo_url, status").eq("status", "approved").order("name");
        if (bData) setBrands(bData as Brand[]);

        const { data: vData } = await supabase.from("vendors" as any).select("id, store_name").eq("status", "approved").order("store_name");
        if (vData) setVendors((vData as any[]) || []);
      } catch (err) {
        console.error("Error loading brands/vendors:", err);
      }
    };
    loadMeta();
  }, []);

  // Server-side Fetch Products
  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("products")
        .select(
          "id, name, slug, price, original_price, price_unit, category, subcategory, image_url, stock, rating, sold_count, sku, brand_id, vendor_id, is_active, is_qmall_verified, is_preorder, generic_name, requires_prescription, delivery_time, created_at",
          { count: "exact" }
        );

      // Search Query
      if (debouncedSearch) {
        query = query.or(
          `name.ilike.%${debouncedSearch}%,generic_name.ilike.%${debouncedSearch}%,sku.ilike.%${debouncedSearch}%,slug.ilike.%${debouncedSearch}%`
        );
      }

      // Stock Filter
      if (stockFilter === "in") {
        query = query.gt("stock", 0);
      } else if (stockFilter === "out") {
        query = query.lte("stock", 0);
      }

      // Category Filter
      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      // Brand Filter
      if (brandFilter !== "all") {
        query = query.eq("brand_id", brandFilter);
      }

      // Status Filter
      if (statusFilter === "active") {
        query = query.eq("is_active", true);
      } else if (statusFilter === "inactive") {
        query = query.eq("is_active", false);
      } else if (statusFilter === "rx") {
        query = query.eq("requires_prescription", true);
      } else if (statusFilter === "preorder") {
        query = query.eq("is_preorder", true);
      }

      // Sorting & Pagination
      query = query.order("created_at", { ascending: false }).range(from, to);

      const { data, count, error } = await query;

      if (error) {
        throw error;
      }

      setProducts((data as ProductListItem[]) || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error("fetchProducts error:", err);
      toast.error("প্রোডাক্ট লোড করতে সমস্যা হয়েছে: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, debouncedSearch, stockFilter, categoryFilter, brandFilter, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [stockFilter, categoryFilter, brandFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Reset form
  const resetForm = () => {
    setForm({
      name: "",
      generic_name: "",
      slug: "",
      sku: "",
      brand_id: "",
      category: "",
      subcategory: "",
      price: "",
      original_price: "",
      price_unit: "",
      stock: "100",
      delivery_time: "24-48 Hours",
      description: "",
      is_active: true,
      requires_prescription: false,
      is_preorder: false,
      is_qmall_verified: false,
    });
    setEditingId(null);
    setImages([]);
    setImageUrlInput("");
    setVariants([]);
    setSpecs([]);
  };

  // Open Create Dialog
  const openCreate = () => {
    resetForm();
    setForm(prev => ({
      ...prev,
      sku: generateSKU(),
    }));
    setOpen(true);
  };

  // Open Edit Dialog with Full Product Details
  const openEdit = async (item: ProductListItem) => {
    resetForm();
    setEditingId(item.id);
    setModalLoading(true);
    setOpen(true);

    try {
      // Fetch full product details including HTML description
      const { data: prodData, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", item.id)
        .single();

      if (error) throw error;

      let parentCat = prodData.category || "";
      let subCat = prodData.subcategory || "";
      if (!subCat && parentCat) {
        const found = categoriesWithSubs.find(c => c.slug === parentCat);
        if (!found) {
          for (const cat of categoriesWithSubs) {
            const sub = cat.subcategories.find(s => s.slug === parentCat);
            if (sub) { parentCat = cat.slug; subCat = sub.slug; break; }
          }
        }
      }

      const { specs: parsedSpecs, restDescription } = parseSpecsFromDescription(prodData.description);
      setSpecs(parsedSpecs);

      setForm({
        name: prodData.name || "",
        generic_name: prodData.generic_name || "",
        slug: prodData.slug || slugify(prodData.name || ""),
        sku: prodData.sku || generateSKU(),
        brand_id: prodData.brand_id || "",
        category: parentCat,
        subcategory: subCat,
        price: prodData.price !== null && prodData.price !== undefined ? String(prodData.price) : "",
        original_price: prodData.original_price ? String(prodData.original_price) : "",
        price_unit: prodData.price_unit || "",
        stock: prodData.stock !== null && prodData.stock !== undefined ? String(prodData.stock) : "100",
        delivery_time: prodData.delivery_time || "24-48 Hours",
        description: restDescription || "",
        is_active: prodData.is_active ?? true,
        requires_prescription: prodData.requires_prescription ?? false,
        is_preorder: prodData.is_preorder ?? false,
        is_qmall_verified: prodData.is_qmall_verified ?? false,
      });

      // Images
      const { data: imgData } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", item.id)
        .order("sort_order");

      const existingImages = (imgData as ProductImage[])?.map(i => i.image_url) || [];
      if (prodData.image_url) {
        setImages([prodData.image_url, ...existingImages.filter(u => u !== prodData.image_url)]);
      } else {
        setImages(existingImages);
      }

      // Variants
      const { data: varData } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", item.id)
        .order("sort_order");

      setVariants((varData || []).map((v: any) => ({
        id: v.id,
        variant_name: v.variant_name,
        variant_value: v.variant_value,
        price_adjustment: v.price_adjustment,
        stock: v.stock,
        sku: v.sku || "",
      })));
    } catch (err: any) {
      console.error("Error loading product details:", err);
      toast.error("প্রোডাক্ট ডিটেইলস লোড করতে সমস্যা হয়েছে");
    } finally {
      setModalLoading(false);
    }
  };

  // Upload to FileVault Storage
  const handleVaultImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    const toastId = toast.loading("ইমেজ FileVault এ আপলোড হচ্ছে...");

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} কোনো ইমেজ ফাইল নয়`);
          continue;
        }
        const ext = file.name.split(".").pop() || "jpg";
        const nameSlug = slugify(form.name || "product");
        const customName = `${nameSlug}-${Date.now()}-${i + 1}.${ext}`;

        const vaultUrl = await uploadToVault(file, customName);
        setImages(prev => [...prev, vaultUrl]);
      }
      toast.success("ইমেজ সফলভাবে FileVault এ আপলোড হয়েছে!", { id: toastId });
    } catch (err: any) {
      console.error("Vault Upload Error:", err);
      toast.error("আপলোড ব্যর্থ হয়েছে: " + (err.message || "Unknown error"), { id: toastId });
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  // Add Direct Image URL
  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    const url = imageUrlInput.trim();
    if (!images.includes(url)) {
      setImages(prev => [...prev, url]);
      setImageUrlInput("");
      toast.success("ইমেজ URL যোগ করা হয়েছে");
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Save Product (Create or Update)
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("প্রোডাক্টের নাম বাধ্যতামূলক!");
      return;
    }
    if (!form.price || Number(form.price) < 0) {
      toast.error("সঠিক বিক্রয় মূল্য দিন!");
      return;
    }

    const specsTable = buildSpecsTable(specs.filter(s => s.key.trim()));
    const fullDescription = specsTable + (form.description || "");
    const generatedSlug = form.slug.trim() ? slugify(form.slug) : slugify(form.name);

    const payload = {
      name: form.name.trim(),
      generic_name: form.generic_name.trim() || null,
      slug: generatedSlug,
      sku: form.sku.trim() || generateSKU(),
      brand_id: form.brand_id || null,
      category: form.category || null,
      subcategory: form.subcategory || null,
      price: Number(form.price),
      original_price: form.original_price ? Number(form.original_price) : null,
      price_unit: form.price_unit || null,
      stock: Number(form.stock) || 0,
      delivery_time: form.delivery_time || "24-48 Hours",
      description: fullDescription || null,
      image_url: images[0] || null,
      is_active: form.is_active,
      requires_prescription: form.requires_prescription,
      is_preorder: form.is_preorder,
      is_qmall_verified: form.is_qmall_verified,
      updated_at: new Date().toISOString(),
    };

    try {
      let productId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("প্রোডাক্ট সফলভাবে আপডেট হয়েছে!");
        logActivity({
          action: "product_updated",
          details: `Updated Product: ${form.name}`,
          entity_type: "product",
          entity_id: editingId,
        });
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (error) throw error;
        productId = data.id;
        toast.success("নতুন প্রোডাক্ট তৈরি হয়েছে!");
        logActivity({
          action: "product_created",
          details: `Created Product: ${form.name}`,
          entity_type: "product",
          entity_id: productId,
        });
      }

      // Additional Images handling
      if (productId) {
        await supabase.from("product_images").delete().eq("product_id", productId);
        if (images.length > 1) {
          const additionalImages = images.slice(1).map((url, i) => ({
            product_id: productId!,
            image_url: url,
            sort_order: i,
          }));
          await supabase.from("product_images").insert(additionalImages);
        }

        // Variants handling
        await supabase.from("product_variants").delete().eq("product_id", productId);
        if (variants.length > 0) {
          const variantRows = variants.map((v, i) => ({
            product_id: productId!,
            variant_name: v.variant_name,
            variant_value: v.variant_value,
            price_adjustment: v.price_adjustment,
            stock: v.stock,
            sku: v.sku || null,
            sort_order: i,
          }));
          await supabase.from("product_variants").insert(variantRows);
        }
      }

      setOpen(false);
      resetForm();
      fetchProducts();
    } catch (err: any) {
      console.error("Save product error:", err);
      toast.error("সংরক্ষণে সমস্যা হয়েছে: " + (err.message || "Unknown error"));
    }
  };

  // Quick Action: Delete Single Product
  const handleDelete = async (id: string) => {
    const prod = products.find(p => p.id === id);
    const confirmed = window.confirm(`"${prod?.name || 'এই প্রোডাক্টটি'}" নিশ্চিতভাবে ডিলিট করতে চান?`);
    if (!confirmed) return;

    try {
      const { moveToTrash } = await import("@/lib/trash");
      if (prod) await moveToTrash("products", id, prod);

      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;

      toast.success("প্রোডাক্ট ডিলিট করা হয়েছে!");
      logActivity({
        action: "product_deleted",
        details: `Deleted product: ${prod?.name || id}`,
        entity_type: "product",
        entity_id: id,
      });
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "ডিলিট করতে সমস্যা হয়েছে");
    }
  };

  // Quick Toggle Active Status
  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !currentActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(!currentActive ? "প্রোডাক্ট অ্যাক্টিভ করা হয়েছে" : "প্রোডাক্ট ইনঅ্যাক্টিভ করা হয়েছে");
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentActive } : p));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Quick Toggle Out of Stock
  const toggleStock = async (id: string, currentStock: number) => {
    const newStock = currentStock > 0 ? 0 : 100;
    try {
      const { error } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", id);

      if (error) throw error;
      toast.success(newStock === 0 ? "আউট অব স্টক করা হয়েছে" : "স্টকে যুক্ত করা হয়েছে (100 pcs)");
      setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Quick Toggle Preorder
  const togglePreorder = async (id: string, currentPreorder: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_preorder: !currentPreorder })
        .eq("id", id);

      if (error) throw error;
      toast.success(!currentPreorder ? "প্রি-অর্ডার চালু করা হয়েছে" : "প্রি-অর্ডার বন্ধ করা হয়েছে");
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_preorder: !currentPreorder } : p));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Quick Toggle Verified
  const toggleVerified = async (id: string, currentVerified: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_qmall_verified: !currentVerified } as any)
        .eq("id", id);

      if (error) throw error;
      toast.success(!currentVerified ? "SKP ভেরিফাইড চালু!" : "SKP ভেরিফাইড বন্ধ!");
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_qmall_verified: !currentVerified } : p));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Quick Toggle Prescription Required
  const togglePrescription = async (id: string, currentRx: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ requires_prescription: !currentRx })
        .eq("id", id);

      if (error) throw error;
      toast.success(!currentRx ? "প্রেসক্রিপশন আবশ্যক করা হয়েছে" : "প্রেসক্রিপশন ছাড়াই কেনা যাবে");
      setProducts(prev => prev.map(p => p.id === id ? { ...p, requires_prescription: !currentRx } : p));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Bulk Active / Inactive
  const handleBulkActive = async (active: boolean) => {
    if (selectedIds.size === 0) return;
    const label = active ? "Active" : "Inactive";
    try {
      const arr = [...selectedIds];
      for (let i = 0; i < arr.length; i += 50) {
        const chunk = arr.slice(i, i + 50);
        await supabase.from("products").update({ is_active: active }).in("id", chunk);
      }
      toast.success(`${selectedIds.size}টি প্রোডাক্ট ${label} করা হয়েছে!`);
      setSelectedIds(new Set());
      fetchProducts();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(`${selectedIds.size}টি প্রোডাক্ট নিশ্চিতভাবে ডিলিট করতে চান?`);
    if (!confirmed) return;

    try {
      const { moveToTrash } = await import("@/lib/trash");
      for (const id of selectedIds) {
        const prod = products.find(p => p.id === id);
        if (prod) await moveToTrash("products", id, prod);
      }
      const arr = [...selectedIds];
      for (let i = 0; i < arr.length; i += 50) {
        const chunk = arr.slice(i, i + 50);
        await supabase.from("products").delete().in("id", chunk);
      }
      toast.success(`${selectedIds.size}টি প্রোডাক্ট ডিলিট হয়েছে!`);
      setSelectedIds(new Set());
      fetchProducts();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Bulk Assign Vendor
  const handleBulkAssignVendor = async () => {
    if (selectedIds.size === 0 || !bulkVendorId) return;
    setBulkAssigning(true);
    const vendorValue = bulkVendorId === "none" ? null : bulkVendorId;
    try {
      const arr = [...selectedIds];
      for (let i = 0; i < arr.length; i += 50) {
        const chunk = arr.slice(i, i + 50);
        await supabase.from("products").update({ vendor_id: vendorValue }).in("id", chunk);
      }
      const vendorName = vendors.find(v => v.id === bulkVendorId)?.store_name || "None";
      toast.success(`${selectedIds.size}টি প্রোডাক্ট "${vendorName}" ভেন্ডরে অ্যাসাইন হয়েছে!`);
      setSelectedIds(new Set());
      setBulkVendorId("");
      fetchProducts();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBulkAssigning(false);
    }
  };

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const dataToExport = selectedIds.size > 0 
      ? products.filter(p => selectedIds.has(p.id)) 
      : products;

    const cols: PrintColumn[] = [
      { header: "Name", accessor: (r) => r.name },
      { header: "Generic Name", accessor: (r) => r.generic_name || "" },
      { header: "SKU", accessor: (r) => r.sku || "" },
      { header: "Category", accessor: (r) => r.category || "" },
      { header: "Selling Price", accessor: (r) => r.price },
      { header: "Original Price", accessor: (r) => r.original_price || "" },
      { header: "Price Unit", accessor: (r) => r.price_unit || "" },
      { header: "Stock", accessor: (r) => r.stock },
      { header: "Sold", accessor: (r) => r.sold_count || 0 },
      { header: "Rx Required", accessor: (r) => r.requires_prescription ? "Yes" : "No" },
      { header: "Active", accessor: (r) => r.is_active ? "Yes" : "No" },
    ];
    exportCSV("Products_SheikhPharma", cols, dataToExport);
  };

  const selectedCategory = categoriesWithSubs.find(c => c.slug === form.category);
  const brandMap = new Map(brands.map(b => [b.id, b.name]));

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <BackButton className="mb-2" />
      
      {/* Header & Primary Action Buttons */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            Products
            <Badge variant="secondary" className="text-xs font-normal">
              মোট: {totalCount.toLocaleString()} টি
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            সকল ওষুধের নাম, দাম, স্টক, ছবি, বিবরণ ও সেবনবিধি পরিচালনা করুন
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchProducts(true)} 
            disabled={refreshing || loading}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            রিফ্রেশ
          </Button>

          <CsvProductUpload onComplete={() => fetchProducts()} />
          <ExcelProductUpload onComplete={() => fetchProducts()} />

          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 gap-1.5 text-xs" 
            onClick={handleExportCSV} 
            disabled={products.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            {selectedIds.size > 0 ? `CSV (${selectedIds.size})` : "CSV"}
          </Button>

          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} size="sm" className="h-9 gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" /> Add Product
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  {editingId ? "✏️ Edit Product (ওষুধ সম্পাদনা)" : "➕ Add New Product (নতুন ওষুধ যুক্ত করুন)"}
                </DialogTitle>
              </DialogHeader>

              {modalLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm">প্রোডাক্টের সম্পূর্ণ তথ্য লোড হচ্ছে...</p>
                </div>
              ) : (
                <div className="grid gap-5 py-3">
                  {/* Basic Information */}
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                    <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
                      <FileText className="h-4 w-4" /> ১. পরিচিতি ও বেসিক তথ্য (Basic Info)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Product Name (ওষুধের নাম) *</Label>
                        <Input 
                          value={form.name} 
                          onChange={(e) => {
                            const name = e.target.value;
                            setForm(prev => ({
                              ...prev,
                              name,
                              slug: prev.slug === slugify(prev.name) || !prev.slug ? slugify(name) : prev.slug
                            }));
                          }} 
                          placeholder="যেমন: Napa 500 mg tablets" 
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Generic Name (জেনেরিক নাম)</Label>
                        <Input 
                          value={form.generic_name} 
                          onChange={(e) => setForm({ ...form, generic_name: e.target.value })} 
                          placeholder="যেমন: Paracetamol, Omeprazole, Esomeprazole" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Brand / Manufacturer (কোম্পানি)</Label>
                        <BrandSelectWithCreate
                          value={form.brand_id}
                          onChange={(v) => setForm({ ...form, brand_id: v })}
                          brands={brands}
                          isAdmin={true}
                          onBrandCreated={async () => {
                            const { data: bData } = await supabase.from("brands").select("id, name, logo_url, status").eq("status", "approved").order("name");
                            if (bData) setBrands(bData as Brand[]);
                          }}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">SKU Code (প্রোডাক্ট কোড)</Label>
                        <div className="flex gap-2">
                          <Input 
                            value={form.sku} 
                            onChange={(e) => setForm({ ...form, sku: e.target.value })} 
                            placeholder="SKP-XXXXXX" 
                            className="font-mono text-xs"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setForm({ ...form, sku: generateSKU() })}
                            className="text-xs shrink-0"
                          >
                            জেনারেট
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Category (ক্যাটেগরি)</Label>
                        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, subcategory: "" })}>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {categoriesWithSubs.map((cat) => (
                              <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Subcategory (সাব-ক্যাটেগরি)</Label>
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

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">URL Slug</Label>
                      <Input 
                        value={form.slug} 
                        onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} 
                        placeholder="napa-500-mg-tablets" 
                        className="font-mono text-xs text-muted-foreground"
                      />
                    </div>
                  </div>

                  {/* Pricing & Stock */}
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                    <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
                      <Store className="h-4 w-4" /> ২. মূল্য ও ইনভেন্টরি (Pricing & Stock)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Offer / Selling Price (বিক্রয় মূল্য ৳) *</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={form.price} 
                          onChange={(e) => setForm({ ...form, price: e.target.value })} 
                          placeholder="0.00" 
                          className="font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">MRP / Original Price (মূল খুচরা মূল্য ৳)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={form.original_price} 
                          onChange={(e) => setForm({ ...form, original_price: e.target.value })} 
                          placeholder="ঐচ্ছিক (Discount দেখানোর জন্য)" 
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Stock (মজুত সংখ্যা)</Label>
                        <Input 
                          type="number" 
                          value={form.stock} 
                          onChange={(e) => setForm({ ...form, stock: e.target.value })} 
                          placeholder="100" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Price Unit (মূল্যের একক)</Label>
                        <Select 
                          value={form.price_unit.replace(/\s*\(\d+\s*pcs\)/, "") || "none"} 
                          onValueChange={(v) => {
                            if (v === "none") setForm({ ...form, price_unit: "" });
                            else {
                              const pcsMatch = form.price_unit.match(/\((\d+)\s*pcs\)/);
                              setForm({ ...form, price_unit: pcsMatch ? `${v} (${pcsMatch[1]} pcs)` : v });
                            }
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="কোনো একক নেই" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">কোনো একক নেই</SelectItem>
                            <SelectItem value="per strip">Per Strip (প্রতি পাতা)</SelectItem>
                            <SelectItem value="per box">Per Box (প্রতি বক্স)</SelectItem>
                            <SelectItem value="per piece">Per Piece (প্রতি পিস)</SelectItem>
                            <SelectItem value="per bottle">Per Bottle (প্রতি বোতল)</SelectItem>
                            <SelectItem value="per tube">Per Tube (প্রতি টিউব)</SelectItem>
                            <SelectItem value="per vial">Per Vial (প্রতি ভায়াল)</SelectItem>
                            <SelectItem value="per pack">Per Pack (প্রতি প্যাক)</SelectItem>
                            <SelectItem value="per unit">Per Unit</SelectItem>
                          </SelectContent>
                        </Select>

                        {form.price_unit && form.price_unit !== "none" && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">প্রতি ইউনিটে কত পিস?</span>
                            <Input
                              type="number"
                              min={1}
                              placeholder="যেমন: 10"
                              className="h-8 text-xs w-28"
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

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Delivery Time (আনুমানিক ডেলিভারি সময়)</Label>
                        <Input 
                          value={form.delivery_time} 
                          onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} 
                          placeholder="24-48 Hours / 3-5 Days" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Images & FileVault Media */}
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                    <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" /> ৩. ছবি ও মিডিয়া (FileVault Hosting)
                    </h3>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary/50 bg-background px-4 py-2.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors">
                        <Upload className="h-4 w-4" />
                        {uploadingImage ? "FileVault এ আপলোড হচ্ছে..." : "পিসি থেকে ছবি আপলোড করুন"}
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          className="hidden" 
                          onChange={handleVaultImageUpload} 
                          disabled={uploadingImage} 
                        />
                      </label>

                      <div className="flex-1 flex gap-2">
                        <Input 
                          placeholder="অথবা সরাসরি ইমেজ লিংক (URL) পেস্ট করুন..." 
                          value={imageUrlInput} 
                          onChange={(e) => setImageUrlInput(e.target.value)} 
                          className="text-xs"
                        />
                        <Button 
                          type="button" 
                          variant="secondary" 
                          size="sm" 
                          onClick={handleAddImageUrl}
                          className="text-xs shrink-0"
                        >
                          লিংক যোগ
                        </Button>
                      </div>
                    </div>

                    {images.length > 0 ? (
                      <div className="flex flex-wrap gap-3 pt-2">
                        {images.map((url, i) => (
                          <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border bg-background shadow-xs group">
                            <img src={url} alt={`Image ${i + 1}`} className="h-full w-full object-contain p-1" />
                            <button 
                              type="button" 
                              onClick={() => removeImage(i)} 
                              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            {i === 0 && (
                              <span className="absolute bottom-0 inset-x-0 bg-primary/90 text-primary-foreground text-[10px] text-center font-medium py-0.5">
                                Main Photo
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">এখনও কোনো ছবি যুক্ত করা হয়নি</p>
                    )}
                  </div>

                  {/* Status & Flags */}
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4" /> ৪. স্ট্যাটাস ও নিয়ন্ত্রণ (Flags & Settings)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between rounded-md border bg-background p-3">
                        <div>
                          <Label className="text-xs font-semibold cursor-pointer">Live / Published Status</Label>
                          <p className="text-[11px] text-muted-foreground">ওয়েবসাইটে প্রদর্শিত হবে কি না</p>
                        </div>
                        <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                      </div>

                      <div className="flex items-center justify-between rounded-md border bg-background p-3">
                        <div>
                          <Label className="text-xs font-semibold cursor-pointer">Requires Prescription (Rx)</Label>
                          <p className="text-[11px] text-muted-foreground">অর্ডার করতে প্রেসক্রিপশন লাগবে</p>
                        </div>
                        <Switch checked={form.requires_prescription} onCheckedChange={(v) => setForm({ ...form, requires_prescription: v })} />
                      </div>

                      <div className="flex items-center justify-between rounded-md border bg-background p-3">
                        <div>
                          <Label className="text-xs font-semibold cursor-pointer">Pre-Order</Label>
                          <p className="text-[11px] text-muted-foreground">প্রি-অর্ডার অপশন সক্রিয় করুন</p>
                        </div>
                        <Switch checked={form.is_preorder} onCheckedChange={(v) => setForm({ ...form, is_preorder: v })} />
                      </div>

                      <div className="flex items-center justify-between rounded-md border bg-background p-3">
                        <div>
                          <Label className="text-xs font-semibold cursor-pointer">SKP Verified Badge</Label>
                          <p className="text-[11px] text-muted-foreground">ভেরিফাইড ট্যাগ প্রদর্শন করুন</p>
                        </div>
                        <Switch checked={form.is_qmall_verified} onCheckedChange={(v) => setForm({ ...form, is_qmall_verified: v })} />
                      </div>
                    </div>
                  </div>

                  {/* Medical Description & Specifications */}
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                    <MedicalSectionEditor 
                      value={form.description} 
                      onChange={(htmlVal) => setForm({ ...form, description: htmlVal })} 
                    />

                    <SpecificationEditor specs={specs} onChange={setSpecs} />
                    <VariantEditor variants={variants} onChange={setVariants} />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      বাতিল
                    </Button>
                    <Button onClick={handleSave} disabled={uploadingImage} className="gap-2">
                      {editingId ? "আপডেট সংরক্ষণ করুন" : "নতুন ওষুধ সংরক্ষণ করুন"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-card p-3 rounded-lg border shadow-xs">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="ওষুধের নাম, জেনেরিক বা SKU খুঁজুন..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-9 h-9 text-xs" 
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Stock" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল স্টক (All)</SelectItem>
            <SelectItem value="in">ইন স্টক (In Stock)</SelectItem>
            <SelectItem value="out">আউট অব স্টক (Out)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল ক্যাটেগরি</SelectItem>
            {categoriesWithSubs.map((cat) => (
              <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল কোম্পানি/ব্র্যান্ড</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Action Controls */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 animate-in fade-in-50">
          <span className="text-xs font-semibold px-2 py-1 bg-primary/10 rounded-md text-primary">
            {selectedIds.size}টি আইটেম সিলেক্টেড
          </span>
          <Button variant="destructive" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleBulkDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Bulk Delete
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-green-600 text-green-600 hover:bg-green-50" onClick={() => handleBulkActive(true)}>
            Active All
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleBulkActive(false)}>
            Inactive All
          </Button>
          <div className="flex items-center gap-1.5">
            <Select value={bulkVendorId} onValueChange={setBulkVendorId}>
              <SelectTrigger className="w-[170px] h-8 text-xs">
                <Store className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
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

      {/* Main Table Layout */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="text-xs">
                <TableHead className="w-10 px-3">
                  <Checkbox 
                    checked={products.length > 0 && selectedIds.size === products.length} 
                    onCheckedChange={toggleSelectAll} 
                  />
                </TableHead>
                <TableHead className="w-14">Image</TableHead>
                <TableHead className="min-w-[200px]">Product & Generic Name</TableHead>
                <TableHead className="hidden md:table-cell min-w-[130px]">Brand / Company</TableHead>
                <TableHead className="hidden sm:table-cell min-w-[110px]">Category</TableHead>
                <TableHead className="text-right min-w-[90px]">MRP</TableHead>
                <TableHead className="text-right min-w-[90px]">Selling Price</TableHead>
                <TableHead className="text-center min-w-[80px]">Unit</TableHead>
                <TableHead className="text-center hidden sm:table-cell min-w-[70px]">Stock</TableHead>
                <TableHead className="text-center min-w-[70px]">Active</TableHead>
                <TableHead className="text-right w-16 px-3">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      <p className="text-xs">ডাটাবেজ থেকে প্রোডাক্ট লোড হচ্ছে...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
                      <p className="font-medium text-sm">কোনো প্রোডাক্ট পাওয়া যায়নি</p>
                      <p className="text-xs text-muted-foreground">সার্চ ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => {
                  const isSelected = selectedIds.has(p.id);
                  return (
                    <TableRow 
                      key={p.id} 
                      className={`text-xs hover:bg-muted/30 transition-colors ${!p.is_active ? "opacity-60 bg-muted/10" : ""} ${isSelected ? "bg-primary/5" : ""}`}
                    >
                      <TableCell className="px-3 py-2">
                        <Checkbox 
                          checked={isSelected} 
                          onCheckedChange={() => toggleSelect(p.id)} 
                        />
                      </TableCell>

                      <TableCell className="py-2">
                        {p.image_url ? (
                          <div className="h-10 w-10 rounded border bg-background overflow-hidden shrink-0 flex items-center justify-center">
                            <img 
                              src={p.image_url} 
                              alt={p.name} 
                              className="h-full w-full object-contain" 
                              loading="lazy" 
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center shrink-0">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="py-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground text-sm line-clamp-1 hover:underline cursor-pointer" onClick={() => openEdit(p)}>
                            {p.name}
                          </span>
                          {p.generic_name && (
                            <span className="text-[11px] text-muted-foreground font-medium line-clamp-1">
                              💊 {p.generic_name}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {p.sku && (
                              <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.2 rounded">
                                {p.sku}
                              </span>
                            )}
                            {p.requires_prescription && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500 text-amber-600 bg-amber-50/50">
                                Rx Required
                              </Badge>
                            )}
                            {p.is_preorder && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-500 text-blue-600 bg-blue-50/50">
                                Pre-Order
                              </Badge>
                            )}
                            {p.is_qmall_verified && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-teal-500 text-teal-600 bg-teal-50/50">
                                ✓ Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell py-2 text-muted-foreground font-medium">
                        {p.brand_id ? brandMap.get(p.brand_id) || "—" : "—"}
                      </TableCell>

                      <TableCell className="hidden sm:table-cell py-2 text-muted-foreground">
                        {p.category || "—"}
                      </TableCell>

                      <TableCell className="text-right py-2 text-muted-foreground">
                        {p.original_price ? (
                          <span className="line-through text-xs">{formatPrice(p.original_price)}</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell className="text-right py-2 font-bold text-primary text-sm">
                        {formatPrice(p.price)}
                      </TableCell>

                      <TableCell className="text-center py-2">
                        {p.price_unit ? (
                          <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0.5">
                            {p.price_unit}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center hidden sm:table-cell py-2">
                        <Badge 
                          variant={p.stock > 0 ? "secondary" : "destructive"} 
                          className={`text-[10px] px-2 py-0.5 font-medium cursor-pointer ${p.stock > 0 ? "bg-green-50 text-green-700 border-green-200" : ""}`}
                          onClick={() => toggleStock(p.id, p.stock)}
                          title="ক্লিক করে স্টক টগল করুন"
                        >
                          {p.stock > 0 ? `${p.stock}` : "Out"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center py-2">
                        <Switch 
                          checked={p.is_active} 
                          onCheckedChange={() => toggleActive(p.id, p.is_active)} 
                          className="scale-80" 
                        />
                      </TableCell>

                      <TableCell className="text-right py-2 px-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuItem onClick={() => openEdit(p)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Details (সম্পাদনা)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStock(p.id, p.stock)}>
                              <BoxSelect className="h-3.5 w-3.5 mr-2" />
                              {p.stock <= 0 ? "Mark In Stock" : "Mark Out of Stock"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => togglePrescription(p.id, p.requires_prescription)}>
                              <FileText className="h-3.5 w-3.5 mr-2" />
                              {p.requires_prescription ? "Prescription Off" : "Prescription On"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => togglePreorder(p.id, p.is_preorder)}>
                              <Package className="h-3.5 w-3.5 mr-2" />
                              {p.is_preorder ? "Pre-Order Off" : "Pre-Order On"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleVerified(p.id, p.is_qmall_verified)}>
                              <BadgeCheck className="h-3.5 w-3.5 mr-2" />
                              {p.is_qmall_verified ? "Remove Verified" : "Make Verified"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Product
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Server-Side Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-3 border-t bg-muted/20 gap-3">
          <p className="text-xs text-muted-foreground">
            দেখানো হচ্ছে {products.length > 0 ? ((currentPage - 1) * PAGE_SIZE + 1).toLocaleString() : 0} – {Math.min(currentPage * PAGE_SIZE, totalCount).toLocaleString()} (সর্বমোট {totalCount.toLocaleString()} টি প্রোডাক্ট)
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage <= 1 || loading} 
                onClick={() => setCurrentPage(1)}
                className="h-8 px-2 text-xs"
              >
                ««
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage <= 1 || loading} 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="h-8 px-2 text-xs"
              >
                « আগের
              </Button>

              <span className="text-xs font-semibold px-2 py-1">
                পেজ {currentPage} / {totalPages}
              </span>

              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage >= totalPages || loading} 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="h-8 px-2 text-xs"
              >
                পরের »
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage >= totalPages || loading} 
                onClick={() => setCurrentPage(totalPages)}
                className="h-8 px-2 text-xs"
              >
                »»
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;
