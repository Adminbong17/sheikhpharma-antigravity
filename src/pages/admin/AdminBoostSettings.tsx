import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TrendingUp, Star, Search, Plus, Loader2, Users, Store, Upload, X } from "lucide-react";
import BackButton from "@/components/BackButton";

const AdminBoostSettings = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  // Sold boost state
  const [soldAmount, setSoldAmount] = useState("");
  const [soldLoading, setSoldLoading] = useState(false);

  // Fake review state
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewText, setReviewText] = useState("");
  const [reviewImages, setReviewImages] = useState<(string | null)[]>([null, null]);
  const [reviewImageUploading, setReviewImageUploading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Vendor follower boost state
  const [vendorSearch, setVendorSearch] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [followerCount, setFollowerCount] = useState("");
  const [followerLoading, setFollowerLoading] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["admin-boost-products", search],
    queryFn: async () => {
      let query = (supabase as any)
        .from("products")
        .select("id, name, image_url, sold_count, rating")
        .eq("is_active", true)
        .order("name")
        .limit(50);
      if (search.trim()) {
        query = query.ilike("name", `%${search.trim()}%`);
      }
      const { data } = await query;
      return data || [];
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["admin-boost-vendors", vendorSearch],
    queryFn: async () => {
      let query = (supabase as any)
        .from("vendors")
        .select("id, store_name, logo_url, status")
        .order("store_name")
        .limit(50);
      if (vendorSearch.trim()) {
        query = query.ilike("store_name", `%${vendorSearch.trim()}%`);
      }
      const { data } = await query;
      return data || [];
    },
  });

  const { data: currentFollowers = 0 } = useQuery({
    queryKey: ["admin-vendor-followers", selectedVendorId],
    queryFn: async () => {
      if (!selectedVendorId) return 0;
      const { count } = await (supabase as any)
        .from("vendor_follows")
        .select("*", { count: "exact", head: true })
        .eq("vendor_id", selectedVendorId);
      return count ?? 0;
    },
    enabled: !!selectedVendorId,
  });

  const selectedProduct = products.find((p: any) => p.id === selectedProductId);
  const selectedVendor = vendors.find((v: any) => v.id === selectedVendorId);

  const handleBoostFollowers = async () => {
    if (!selectedVendorId) return toast.error("Please select a vendor");
    const count = parseInt(followerCount);
    if (!count || count <= 0) return toast.error("Enter a valid number");
    setFollowerLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert fake follow rows with random UUIDs
      const rows = Array.from({ length: count }, () => ({
        vendor_id: selectedVendorId,
        user_id: crypto.randomUUID(),
      }));

      // Insert in batches of 50
      for (let i = 0; i < rows.length; i += 50) {
        const { error } = await (supabase as any)
          .from("vendor_follows")
          .insert(rows.slice(i, i + 50));
        if (error) throw error;
      }

      toast.success(`Added ${count} fake followers to ${selectedVendor?.store_name}!`);
      setFollowerCount("");
      queryClient.invalidateQueries({ queryKey: ["admin-vendor-followers", selectedVendorId] });
      queryClient.invalidateQueries({ queryKey: ["vendor-followers-count", selectedVendorId] });
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setFollowerLoading(false);
    }
  };


  const handleBoostSold = async () => {
    if (!selectedProductId) return toast.error("Please select a product");
    const amount = parseInt(soldAmount);
    if (!amount || amount <= 0) return toast.error("Enter a valid number");
    setSoldLoading(true);
    try {
      // Fetch fresh sold_count to avoid stale data
      const { data: freshProduct, error: fetchErr } = await (supabase as any)
        .from("products")
        .select("sold_count")
        .eq("id", selectedProductId)
        .single();
      if (fetchErr) throw fetchErr;
      const current = freshProduct?.sold_count ?? 0;
      const { error } = await (supabase as any)
        .from("products")
        .update({ sold_count: current + amount })
        .eq("id", selectedProductId);
      if (error) throw error;
      toast.success(`Added ${amount} to sold count!`);
      setSoldAmount("");
      queryClient.invalidateQueries({ queryKey: ["admin-boost-products"] });
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setSoldLoading(false);
    }
  };

  const handleReviewImageUpload = async (index: number, file: File) => {
    setReviewImageUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop();
      const path = `${user.id}/boost-review-${Date.now()}-${index}.${ext}`;
      const { error } = await supabase.storage.from("review-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("review-images").getPublicUrl(path);
      setReviewImages(prev => {
        const updated = [...prev];
        updated[index] = data.publicUrl;
        return updated;
      });
      toast.success("Photo uploaded!");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setReviewImageUploading(false);
    }
  };

  const handleAddFakeReview = async () => {
    if (!selectedProductId) return toast.error("Please select a product");
    if (!reviewName.trim()) return toast.error("Customer name is required");
    const rating = parseInt(reviewRating);
    if (!rating || rating < 1 || rating > 5) return toast.error("Rating must be 1-5");

    setReviewLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase as any)
        .from("product_reviews")
        .insert({
          product_id: selectedProductId,
          user_id: user.id,
          order_id: null,
          order_item_id: null,
          rating,
          review_text: reviewText.trim() || null,
          reviewer_name: reviewName.trim(),
          image_url_1: reviewImages[0] || null,
          image_url_2: reviewImages[1] || null,
        });
      if (error) throw error;
      toast.success("Fake review added successfully!");
      setReviewName("");
      setReviewText("");
      setReviewRating("5");
      setReviewImages([null, null]);
      queryClient.invalidateQueries({ queryKey: ["product-reviews", selectedProductId] });
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-3xl mx-auto">
      <BackButton className="mb-1" />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Boost Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add fake sold count or reviews to any product.
        </p>
      </div>

      {/* Product Search & Select */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" /> Select Product
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a product..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    {p.image_url && (
                      <img src={p.image_url} alt="" className="h-5 w-5 rounded object-cover" />
                    )}
                    <span className="truncate max-w-[280px]">{p.name}</span>
                    <span className="text-muted-foreground text-xs ml-auto">
                      Sold: {p.sold_count ?? 0}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedProduct && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              {selectedProduct.image_url && (
                <img src={selectedProduct.image_url} alt="" className="h-12 w-12 rounded-md object-cover border" />
              )}
              <div>
                <p className="text-sm font-medium">{selectedProduct.name}</p>
                <p className="text-xs text-muted-foreground">
                  Sold: {selectedProduct.sold_count ?? 0} · Rating: {selectedProduct.rating ?? "N/A"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Boost Sold Count */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" /> Boost Sold Count
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Add Sold Count</Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 150"
                value={soldAmount}
                onChange={(e) => setSoldAmount(e.target.value)}
              />
            </div>
            <Button
              onClick={handleBoostSold}
              disabled={soldLoading || !selectedProductId || !soldAmount}
              className="gap-2"
            >
              {soldLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Current sold count: <strong>{selectedProduct?.sold_count ?? 0}</strong>
            {soldAmount && !isNaN(Number(soldAmount)) && Number(soldAmount) > 0
              ? ` → ${(selectedProduct?.sold_count ?? 0) + Number(soldAmount)}`
              : ""}
          </p>
        </CardContent>
      </Card>

      {/* Add Fake Review */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" /> Add Fake Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Customer Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Rahim Uddin"
                value={reviewName}
                onChange={(e) => setReviewName(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rating (1–5) <span className="text-destructive">*</span></Label>
              <Select value={reviewRating} onValueChange={setReviewRating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {"★".repeat(r)}{"☆".repeat(5 - r)} — {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Review Text (optional)</Label>
            <Textarea
              placeholder="Write the review content..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{reviewText.length}/500</p>
          </div>

          <div className="space-y-1.5">
            <Label>Review Photos (max 2)</Label>
            <div className="flex gap-3">
              {[0, 1].map((idx) => (
                <div key={idx} className="relative">
                  {reviewImages[idx] ? (
                    <div className="relative h-20 w-20 rounded-lg overflow-hidden border-2 border-primary">
                      <img src={reviewImages[idx]!} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => setReviewImages(prev => { const u = [...prev]; u[idx] = null; return u; })}
                        className="absolute top-0.5 right-0.5 rounded-full bg-destructive text-destructive-foreground p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-1">Photo {idx + 1}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={reviewImageUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleReviewImageUpload(idx, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleAddFakeReview}
            disabled={reviewLoading || !selectedProductId || !reviewName.trim()}
            className="w-full gap-2"
          >
            {reviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Review
          </Button>
        </CardContent>
      </Card>

      {/* Boost Vendor Followers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Boost Vendor Followers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search vendor by store name..."
            value={vendorSearch}
            onChange={(e) => setVendorSearch(e.target.value)}
          />
          <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a vendor..." />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((v: any) => (
                <SelectItem key={v.id} value={v.id}>
                  <div className="flex items-center gap-2">
                    {v.logo_url ? (
                      <img src={v.logo_url} alt="" className="h-5 w-5 rounded object-cover" />
                    ) : (
                      <Store className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="truncate max-w-[260px]">{v.store_name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedVendor && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              {selectedVendor.logo_url ? (
                <img src={selectedVendor.logo_url} alt="" className="h-10 w-10 rounded-md object-cover border" />
              ) : (
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Store className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{selectedVendor.store_name}</p>
                <p className="text-xs text-muted-foreground">
                  Current followers: <strong>{currentFollowers}</strong>
                </p>
              </div>
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Add Fake Followers</Label>
              <Input
                type="number"
                min={1}
                max={500}
                placeholder="e.g. 50"
                value={followerCount}
                onChange={(e) => setFollowerCount(e.target.value)}
              />
            </div>
            <Button
              onClick={handleBoostFollowers}
              disabled={followerLoading || !selectedVendorId || !followerCount}
              className="gap-2"
            >
              {followerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Current: <strong>{currentFollowers}</strong>
            {followerCount && !isNaN(Number(followerCount)) && Number(followerCount) > 0
              ? ` → ${currentFollowers + Number(followerCount)}`
              : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBoostSettings;
