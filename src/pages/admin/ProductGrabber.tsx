import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { grabberApi, GrabbedProduct } from "@/lib/api/grabber";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Download, Globe, CheckCircle2, X, ImageIcon, Zap } from "lucide-react";
import { useCategories, useSubcategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";
import BackButton from "@/components/BackButton";
import BrandSelectWithCreate from "@/components/BrandSelectWithCreate";

const ProductGrabber = () => {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [product, setProduct] = useState<GrabbedProduct | null>(null);
  const [source, setSource] = useState<string>("");
  const [method, setMethod] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [editedProduct, setEditedProduct] = useState<Partial<GrabbedProduct>>({});
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [stock, setStock] = useState(0);
  const [priceUnit, setPriceUnit] = useState("");
  const [pcsCount, setPcsCount] = useState("");

  const { data: dbCategories = [] } = useCategories();
  const { data: subcategories = [] } = useSubcategories(selectedCategory || undefined);

  const { data: vendors } = useQuery({
    queryKey: ["vendors-list"],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("id, store_name").eq("status", "approved").order("store_name");
      return data || [];
    },
  });

  const { data: brands, refetch: refetchBrands } = useQuery({
    queryKey: ["brands-list"],
    queryFn: async () => {
      const { data } = await supabase.from("brands").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });


  const handleGrab = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setProduct(null);

    try {
      const result = await grabberApi.grabProduct(url);
      if (result.success && result.product) {
        setProduct(result.product);
        setSource(result.source || "other");
        setMethod(result.method || "");
        setEditedProduct(result.product);
        setSelectedImages(new Set(result.product.images.map((_, i) => i)));
        setSelectedCategory(result.product.category || "");
        // Auto-populate price unit from grab
        if (result.product.price_unit) {
          const pcsMatch = /^(per \w+)\s*\((\d+)\s*pcs\)$/i.exec(result.product.price_unit);
          if (pcsMatch) {
            setPriceUnit(pcsMatch[1].toLowerCase());
            setPcsCount(pcsMatch[2]);
          } else {
            setPriceUnit(result.product.price_unit);
          }
        }
        toast({ title: "Product grabbed!", description: result.product.name });
      } else {
        toast({ title: "Grab failed", description: result.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!product) return;
    setImporting(true);

    try {
      const images = product.images.filter((_, i) => selectedImages.has(i));
      const catSlug = selectedCategory ? dbCategories.find(c => c.id === selectedCategory)?.slug : product.category;
      const subSlug = selectedSubcategory ? subcategories.find((s: any) => s.id === selectedSubcategory)?.slug : undefined;
      await grabberApi.importProduct({
        name: editedProduct.name || product.name,
        price: editedProduct.price ?? product.price,
        original_price: editedProduct.original_price ?? product.original_price,
        description: editedProduct.description || product.description,
        category: catSlug || undefined,
        subcategory: subSlug || undefined,
        image_url: images[0] || null,
        vendor_id: selectedVendor || undefined,
        brand_id: selectedBrand || undefined,
        stock,
        images: images.slice(1),
        specifications: product.specifications.length > 0 ? product.specifications : undefined,
        price_unit: priceUnit ? (pcsCount ? `${priceUnit} (${pcsCount} pcs)` : priceUnit) : undefined,
        variants: product.variants.length > 0 ? product.variants : undefined,
      });
      toast({ title: "Product imported!", description: "Product saved as inactive. Review before publishing." });
      setProduct(null);
      setUrl("");
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const toggleImage = (index: number) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-6">
      <BackButton className="mb-1" />
      <div>
        <h1 className="text-2xl font-bold">Product Grabber</h1>
        <p className="text-muted-foreground">Daraz, Medex, Aroggo থেকে প্রোডাক্ট grab করুন</p>
      </div>

      {/* URL Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.daraz.com.bd/products/..."
                className="pl-10"
                onKeyDown={(e) => e.key === "Enter" && handleGrab()}
              />
            </div>
            <Button onClick={handleGrab} disabled={loading || !url.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              {loading ? "Grabbing..." : "Grab"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Product Preview */}
      {product && (
        <>
          {/* Grab Method Banner */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
            <Zap className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold capitalize">{source}</span> থেকে{' '}
              <span className="font-semibold">Direct Parse (ফ্রি)</span>{' '}
              দিয়ে grab করা হয়েছে
            </div>
          </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Images ({selectedImages.size}/{product.images.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.images.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {product.images.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => toggleImage(i)}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                        selectedImages.has(i) ? "border-primary ring-2 ring-primary/30" : "border-muted opacity-50"
                      )}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {selectedImages.has(i) && (
                        <div className="absolute top-1 right-1">
                          <CheckCircle2 className="h-5 w-5 text-primary bg-background rounded-full" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No images found</p>
              )}
            </CardContent>
          </Card>

          {/* Right: Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Product Details</CardTitle>
                  <Badge variant="secondary">{source}{method ? ` · ${method}` : ''}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={editedProduct.name ?? ""}
                    onChange={(e) => setEditedProduct((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Price</label>
                    <Input
                      type="number"
                      value={editedProduct.price ?? 0}
                      onChange={(e) => setEditedProduct((p) => ({ ...p, price: +e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Original Price</label>
                    <Input
                      type="number"
                      value={editedProduct.original_price ?? ""}
                      onChange={(e) => setEditedProduct((p) => ({ ...p, original_price: +e.target.value || null }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editedProduct.description ?? ""}
                    onChange={(e) => setEditedProduct((p) => ({ ...p, description: e.target.value }))}
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setSelectedSubcategory(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {dbCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCategory && subcategories.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Subcategory</label>
                    <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                      <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                      <SelectContent>
                        {subcategories.map((s) => (
                          <SelectItem key={s.id} value={s.slug}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Stock</label>
                    <Input type="number" value={stock} onChange={(e) => setStock(+e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Assign to Vendor</label>
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger><SelectValue placeholder="No vendor (admin product)" /></SelectTrigger>
                    <SelectContent>
                      {vendors?.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.store_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Assign Brand</label>
                  <BrandSelectWithCreate
                    value={selectedBrand}
                    onChange={setSelectedBrand}
                    brands={brands || []}
                    isAdmin={true}
                    onBrandCreated={() => refetchBrands()}
                    placeholder="No brand"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Price Unit</label>
                  <div className="flex gap-2">
                    <Select value={priceUnit} onValueChange={(v) => setPriceUnit(v === "none" ? "" : v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="কোনো ইউনিট নেই" /></SelectTrigger>
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
                    {priceUnit && (
                      <Input
                        type="number"
                        placeholder="কত পিস?"
                        value={pcsCount}
                        onChange={(e) => setPcsCount(e.target.value)}
                        className="w-28"
                        min="1"
                      />
                    )}
                  </div>
                  {priceUnit && pcsCount && (
                    <p className="text-xs text-muted-foreground mt-1">
                      সেভ হবে: <span className="font-medium">{priceUnit} ({pcsCount} pcs)</span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Specs */}
            {product.specifications.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Specifications</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    {product.specifications.map((s, i) => (
                      <div key={i} className="flex justify-between py-1 border-b border-muted last:border-0">
                        <span className="text-muted-foreground">{s.key}</span>
                        <span className="font-medium">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Variants */}
            {product.variants.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Variants</CardTitle></CardHeader>
                <CardContent>
                  {product.variants.map((v, i) => (
                    <div key={i} className="mb-2">
                      <span className="text-sm font-medium">{v.type}: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {v.options.map((opt, j) => (
                          <Badge key={j} variant="outline">{opt}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Import Button */}
            <Button onClick={handleImport} disabled={importing} className="w-full" size="lg">
              {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              {importing ? "Importing..." : "Import to Store"}
            </Button>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default ProductGrabber;
