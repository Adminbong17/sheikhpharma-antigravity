import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2, Search, CheckCircle2, XCircle, Image as ImageIcon,
  Play, Square, Download, RefreshCw, Package, BarChart3, Clock,
  Filter, Sparkles, ExternalLink, RotateCcw
} from "lucide-react";
import BackButton from "@/components/BackButton";
import { uploadToVault } from "@/lib/vaultStorage";
import { slugify } from "@/lib/slugify";

interface SyncItem {
  id: string;
  name: string;
  status: "pending" | "searching" | "found" | "not_found" | "saving" | "saved" | "skipped" | "error";
  medex_image?: string;
  vault_image?: string;
  drug_name?: string;
  error?: string;
}

const MedexImageSync = () => {
  const [batchSize, setBatchSize] = useState(25);
  const [cooldownDays, setCooldownDays] = useState(15);
  const [autoAccept, setAutoAccept] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [items, setItems] = useState<SyncItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [stats, setStats] = useState({ processed: 0, found: 0, saved: 0, notFound: 0, errors: 0 });
  const stopRef = useRef(false);

  // Specific Product Search State
  const [activeTab, setActiveTab] = useState<"specific" | "bulk">("specific");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyWithoutImage, setOnlyWithoutImage] = useState(true);
  const [isSearchingDb, setIsSearchingDb] = useState(false);
  const [searchedProducts, setSearchedProducts] = useState<any[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [customSearchNames, setCustomSearchNames] = useState<Record<string, string>>({});
  const [isBulkSyncingFiltered, setIsBulkSyncingFiltered] = useState(false);
  const [isResettingCooldown, setIsResettingCooldown] = useState(false);

  const resetAllCooldowns = async () => {
    setIsResettingCooldown(true);
    try {
      // Reset image_last_searched_at for all products without images
      const { error } = await supabase
        .from("products")
        .update({ image_last_searched_at: null })
        .is("image_url", null)
        .eq("is_active", true);

      if (error) throw error;
      refetchStats();
      toast.success("সকল কুলডাউন সফলভাবে রিসেট হয়েছে! এখন সবগুলো প্রোডাক্ট আবার সিঙ্কের জন্য প্রস্তুত।");
    } catch (err: any) {
      toast.error("কুলডাউন রিসেট ব্যর্থ: " + err.message);
    } finally {
      setIsResettingCooldown(false);
    }
  };

  const handleSearchProducts = async () => {
    if (!searchQuery.trim()) {
      toast.warning("দয়া করে ওষুধের নাম লিখুন");
      return;
    }

    setIsSearchingDb(true);
    try {
      let query = supabase
        .from("products")
        .select("id, name, generic_name, image_url, category, is_active, price")
        .ilike("name", `%${searchQuery.trim()}%`)
        .eq("is_active", true)
        .order("name")
        .limit(30);

      if (onlyWithoutImage) {
        query = query.is("image_url", null);
      }

      const { data, error } = await query;
      if (error) throw error;

      setSearchedProducts(data || []);
      if (!data || data.length === 0) {
        toast.info("কোনো প্রোডাক্ট পাওয়া যায়নি");
      }
    } catch (err: any) {
      toast.error("সার্চ ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setIsSearchingDb(false);
    }
  };

  const syncSpecificProduct = async (product: { id: string; name: string }) => {
    setSyncingId(product.id);
    const customName = customSearchNames[product.id];
    const searchTarget = customName?.trim() || product.name;

    try {
      const { data, error } = await supabase.functions.invoke("medex-image-search", {
        body: { name: searchTarget },
      });

      if (error) throw error;

      if (data?.success && (data.vault_url || data.image_url)) {
        const finalUrl = data.vault_url || data.image_url;

        // Save image to product in database
        const { error: updateErr } = await supabase
          .from("products")
          .update({
            image_url: finalUrl,
            image_last_searched_at: new Date().toISOString(),
          })
          .eq("id", product.id);

        if (updateErr) throw updateErr;

        // Update local state in searchedProducts
        setSearchedProducts(prev =>
          prev.map(p => (p.id === product.id ? { ...p, image_url: finalUrl, last_status: "saved", drug_name: data.drug_name } : p))
        );

        refetchStats();
        toast.success(`"${product.name}" এর ছবি সফলভাবে সেভ হয়েছে!`);
      } else {
        await supabase
          .from("products")
          .update({ image_last_searched_at: new Date().toISOString() })
          .eq("id", product.id);

        setSearchedProducts(prev =>
          prev.map(p => (p.id === product.id ? { ...p, last_status: "not_found", error_msg: data?.error } : p))
        );

        toast.error(data?.error || `Medex এ "${searchTarget}" এর ছবি পাওয়া যায়নি`);
      }
    } catch (err: any) {
      toast.error("সিঙ্ক ত্রুটি: " + err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const syncAllFiltered = async () => {
    const toSync = searchedProducts.filter(p => !p.image_url);
    if (toSync.length === 0) {
      toast.info("সিঙ্ক করার মতো কোনো ছবিবিহীন প্রোডাক্ট নেই");
      return;
    }

    setIsBulkSyncingFiltered(true);
    let count = 0;
    for (const p of toSync) {
      await syncSpecificProduct(p);
      count++;
      await new Promise(r => setTimeout(r, 800));
    }
    setIsBulkSyncingFiltered(false);
    toast.success(`নির্দিষ্ট প্রোডাক্টের সিঙ্ক সমাপ্ত! (${count} টি প্রসেস হয়েছে)`);
  };

  // Stats query
  const { data: dbStats, refetch: refetchStats } = useQuery({
    queryKey: ["medex-sync-stats", cooldownDays],
    queryFn: async () => {
      const { count: total } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      const { count: withImage } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .not("image_url", "is", null);

      const t = total || 0;
      const w = withImage || 0;
      const without = t - w;

      let inCooldown = 0;
      if (cooldownDays > 0) {
        const cutoffDate = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000).toISOString();
        const { count: cdCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .is("image_url", null)
          .not("image_last_searched_at", "is", null)
          .gte("image_last_searched_at", cutoffDate);
        inCooldown = cdCount || 0;
      }

      const readyToSync = Math.max(0, without - inCooldown);

      return {
        total: t,
        withImage: w,
        withoutImage: without,
        inCooldown,
        readyToSync,
        rate: t > 0 ? Math.round((w / t) * 100) : 0,
      };
    },
  });

  const updateItem = useCallback((id: string, updates: Partial<SyncItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const processProduct = async (product: { id: string; name: string }): Promise<"found" | "not_found" | "error"> => {
    updateItem(product.id, { status: "searching" });

    try {
      const { data, error } = await supabase.functions.invoke("medex-image-search", {
        body: { name: product.name },
      });

      if (error) throw error;

      if (data?.success && (data.vault_url || data.image_url)) {
        const finalUrl = data.vault_url || data.image_url;
        updateItem(product.id, {
          status: "found",
          medex_image: finalUrl,
          drug_name: data.drug_name,
        });

        if (autoAccept) {
          return await saveImage(product.id, product.name, finalUrl);
        }
        return "found";
      } else {
        // Record search attempt timestamp so it enters cooldown (15 days)
        await supabase
          .from("products")
          .update({ image_last_searched_at: new Date().toISOString() })
          .eq("id", product.id);

        updateItem(product.id, { status: "not_found" });
        return "not_found";
      }
    } catch (err: any) {
      updateItem(product.id, { status: "error", error: err.message });
      return "error";
    }
  };

  const saveImage = async (productId: string, productName: string, imageUrl: string): Promise<"found" | "error"> => {
    updateItem(productId, { status: "saving" });
    try {
      let finalUrl = imageUrl;

      // Fallback: If not already on FileVault, attempt upload
      if (!imageUrl.includes("vault") && !imageUrl.includes("bongbangla")) {
        try {
          const imgRes = await fetch(imageUrl);
          if (imgRes.ok) {
            const blob = await imgRes.blob();
            const ext = imageUrl.split('.').pop()?.split('?')[0] || 'webp';
            const fileName = `${slugify(productName)}-medex-${Date.now()}.${ext}`;
            finalUrl = await uploadToVault(blob, fileName);
          }
        } catch {
          // If browser CORS prevents client-side fetch, use imageUrl as is
        }
      }

      const { error } = await supabase
        .from("products")
        .update({
          image_url: finalUrl,
          image_last_searched_at: new Date().toISOString(),
        })
        .eq("id", productId);

      if (error) throw error;

      updateItem(productId, { status: "saved", vault_image: finalUrl });
      return "found";
    } catch (err: any) {
      updateItem(productId, { status: "error", error: err.message });
      return "error";
    }
  };

  const startSync = async () => {
    stopRef.current = false;
    setIsRunning(true);
    setStats({ processed: 0, found: 0, saved: 0, notFound: 0, errors: 0 });

    let currentOffset = offset;
    let hasMore = true;

    while (hasMore && !stopRef.current) {
      let query = supabase
        .from("products")
        .select("id, name, image_last_searched_at")
        .is("image_url", null)
        .eq("is_active", true);

      if (cooldownDays > 0) {
        const cutoffDate = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000).toISOString();
        query = query.or(`image_last_searched_at.is.null,image_last_searched_at.lt.${cutoffDate}`);
      }

      const { data: products } = await query
        .order("name")
        .range(currentOffset, currentOffset + batchSize - 1);

      if (!products || products.length === 0) {
        hasMore = false;
        break;
      }

      // Add items to the list
      const newItems: SyncItem[] = products.map(p => ({
        id: p.id,
        name: p.name,
        status: "pending" as const,
      }));
      setItems(prev => [...prev, ...newItems]);

      let savedInBatch = 0;

      // Process sequentially
      for (const product of products) {
        if (stopRef.current) break;

        const result = await processProduct(product);
        const isSaved = result === "found" && autoAccept;
        if (isSaved) savedInBatch++;

        setStats(prev => ({
          processed: prev.processed + 1,
          found: prev.found + (result === "found" ? 1 : 0),
          saved: prev.saved + (isSaved ? 1 : 0),
          notFound: prev.notFound + (result === "not_found" ? 1 : 0),
          errors: prev.errors + (result === "error" ? 1 : 0),
        }));

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 800));
      }

      // Products that got an image are removed from `is('image_url', null)`.
      // Offset only advances past the products that remained null in this batch.
      const remainedNull = products.length - savedInBatch;
      currentOffset += autoAccept ? remainedNull : products.length;
      setOffset(currentOffset);
    }

    setIsRunning(false);
    refetchStats();
    toast.success(`সিঙ্ক সম্পন্ন! ${stats.found} টি ছবি পাওয়া গেছে`);
  };

  const stopSync = () => {
    stopRef.current = true;
    toast.info("সিঙ্ক থামানো হচ্ছে...");
  };

  const handleManualSave = async (item: SyncItem) => {
    if (!item.medex_image) return;
    const result = await saveImage(item.id, item.name, item.medex_image);
    if (result === "found") {
      setStats(prev => ({ ...prev, saved: prev.saved + 1 }));
      refetchStats();
    }
  };

  const handleSkip = (id: string) => {
    updateItem(id, { status: "skipped" });
  };

  const progressPercent = stats.processed > 0
    ? Math.round((stats.processed / (stats.processed + (dbStats?.withoutImage || 0) - stats.processed)) * 100)
    : 0;

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-6">
      <BackButton className="mb-1" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="h-6 w-6 text-emerald-600" />
          Medex ইমেজ সিঙ্ক
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Medex থেকে স্বয়ংক্রিয়ভাবে প্রোডাক্টের প্যাকেজ ছবি খুঁজে FileVault এ সেভ করুন
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Package className="h-4 w-4" />
              <span className="text-xs font-medium">মোট প্রোডাক্ট</span>
            </div>
            <p className="text-2xl font-bold mt-1">{dbStats?.total?.toLocaleString() || "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <ImageIcon className="h-4 w-4" />
              <span className="text-xs font-medium">ছবি আছে</span>
            </div>
            <p className="text-2xl font-bold mt-1">{dbStats?.withImage?.toLocaleString() || "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-amber-600">
              <XCircle className="h-4 w-4" />
              <span className="text-xs font-medium">ছবি নেই</span>
            </div>
            <p className="text-2xl font-bold mt-1">{dbStats?.withoutImage?.toLocaleString() || "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-teal-200 bg-teal-50/50 dark:bg-teal-950/20">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-teal-600">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">সিঙ্কের জন্য প্রস্তুত</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-teal-700 dark:text-teal-400">
              {dbStats?.readyToSync?.toLocaleString() || "—"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {dbStats?.inCooldown ? `${dbStats.inCooldown}টি ${cooldownDays} দিনের বিরতিতে` : "সবগুলো প্রস্তুত"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 col-span-2 sm:col-span-1">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-purple-600">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs font-medium">কভারেজ</span>
            </div>
            <p className="text-2xl font-bold mt-1">{dbStats?.rate || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Mode Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full sm:w-[440px] grid-cols-2">
          <TabsTrigger value="specific" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            নির্দিষ্ট প্রোডাক্ট সিঙ্ক
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            বাল্ক অটো-সিঙ্ক
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: SPECIFIC PRODUCT SEARCH & SYNC ─── */}
        <TabsContent value="specific" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  নির্দিষ্ট ওষুধ খুঁজুন এবং Medex থেকে ছবি আনুন
                </span>
                {searchedProducts.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    onClick={syncAllFiltered}
                    disabled={isBulkSyncingFiltered || syncingId !== null}
                  >
                    {isBulkSyncingFiltered ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    )}
                    ছবিবিহীন সবকটি সিঙ্ক করুন
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ওষুধের নাম লিখুন (যেমন: Napa 500, Maxpro 20, Trizon 250, Ace, Sergel)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchProducts()}
                    className="pl-9 h-10 text-sm"
                  />
                </div>
                <Button
                  onClick={handleSearchProducts}
                  disabled={isSearchingDb}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-5"
                >
                  {isSearchingDb ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  খুঁজুন
                </Button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Switch
                  id="only-without-image"
                  checked={onlyWithoutImage}
                  onCheckedChange={setOnlyWithoutImage}
                />
                <Label htmlFor="only-without-image" className="text-xs text-muted-foreground cursor-pointer">
                  শুধুমাত্র ছবি নেই এমন ওষুধ দেখান
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Searched Products List */}
          {searchedProducts.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    খুঁজে পাওয়া ওষুধসমূহ ({searchedProducts.length} টি)
                  </CardTitle>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    সরাসরি Medex থেকে ছবি এনে FileVault-এ সেভ করতে 'সিঙ্ক করুন' বাটনে ক্লিক করুন
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[550px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>ওষুধের নাম ও বিবরণ</TableHead>
                        <TableHead className="w-24">বর্তমান ছবি</TableHead>
                        <TableHead className="w-60">কাস্টম Medex সার্চ নাম (ঐচ্ছিক)</TableHead>
                        <TableHead className="w-36 text-right">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchedProducts.map((p, idx) => (
                        <TableRow key={p.id} className="text-xs">
                          <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-semibold text-sm text-foreground">{p.name}</div>
                            {p.generic_name && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">জেনেরিক: {p.generic_name}</div>
                            )}
                            {p.drug_name && (
                              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Medex Match: {p.drug_name}</div>
                            )}
                            {p.error_msg && (
                              <div className="text-[11px] text-red-500 mt-0.5">{p.error_msg}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {p.image_url ? (
                              <div className="h-12 w-12 rounded border bg-background overflow-hidden p-0.5 shadow-sm">
                                <img src={p.image_url} alt="" className="h-full w-full object-contain" />
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                                ছবি নেই
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder={p.name}
                              value={customSearchNames[p.id] || ""}
                              onChange={(e) =>
                                setCustomSearchNames((prev) => ({ ...prev, [p.id]: e.target.value }))
                              }
                              className="h-8 text-xs"
                              disabled={syncingId === p.id}
                            />
                            <p className="text-[10px] text-muted-foreground mt-0.5">ফাঁকা রাখলে মূল নাম দিয়ে খুঁজবে</p>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              className={p.image_url ? "bg-slate-700 hover:bg-slate-800 text-white text-xs h-8" : "bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"}
                              onClick={() => syncSpecificProduct(p)}
                              disabled={syncingId === p.id || isBulkSyncingFiltered}
                            >
                              {syncingId === p.id ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                  সিঙ্ক হচ্ছে...
                                </>
                              ) : p.image_url ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                  পুনরায় সিঙ্ক
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                                  সিঙ্ক করুন
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── TAB 2: BULK AUTO-SYNC ─── */}
        <TabsContent value="bulk" className="space-y-6 mt-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  {!isRunning ? (
                    <Button
                      onClick={startSync}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      স্বয়ংক্রিয় সিঙ্ক শুরু করুন
                    </Button>
                  ) : (
                    <Button onClick={stopSync} variant="destructive" size="sm">
                      <Square className="h-4 w-4 mr-2" />
                      থামান
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setItems([]); setOffset(0); setStats({ processed: 0, found: 0, saved: 0, notFound: 0, errors: 0 }); }}
                    disabled={isRunning}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    রিসেট
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetAllCooldowns}
                    disabled={isRunning || isResettingCooldown}
                    className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                  >
                    {isResettingCooldown ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    কুলডাউন রিসেট করুন
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-4 ml-auto">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="cooldown-days" className="text-xs text-muted-foreground whitespace-nowrap">পুনরায় খোঁজার বিরতি:</Label>
                    <Select value={String(cooldownDays)} onValueChange={v => setCooldownDays(Number(v))} disabled={isRunning}>
                      <SelectTrigger className="w-28 h-8 text-xs" id="cooldown-days">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">১৫ দিন (ডিফল্ট)</SelectItem>
                        <SelectItem value="30">৩০ দিন</SelectItem>
                        <SelectItem value="7">৭ দিন</SelectItem>
                        <SelectItem value="0">০ দিন (সবগুলো)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label htmlFor="batch-size" className="text-xs text-muted-foreground whitespace-nowrap">ব্যাচ সাইজ:</Label>
                    <Select value={String(batchSize)} onValueChange={v => setBatchSize(Number(v))} disabled={isRunning}>
                      <SelectTrigger className="w-20 h-8 text-xs" id="batch-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="auto-accept"
                      checked={autoAccept}
                      onCheckedChange={setAutoAccept}
                      disabled={isRunning}
                    />
                    <Label htmlFor="auto-accept" className="text-xs text-muted-foreground whitespace-nowrap">
                      অটো-সেভ
                    </Label>
                  </div>
                </div>
              </div>

              {/* Progress */}
              {(isRunning || stats.processed > 0) && (
                <div className="mt-4 space-y-2">
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                    <span>প্রসেস: <strong className="text-foreground">{stats.processed}</strong></span>
                    <span className="text-emerald-600">পাওয়া গেছে: <strong>{stats.found}</strong></span>
                    <span className="text-blue-600">সেভ হয়েছে: <strong>{stats.saved}</strong></span>
                    <span className="text-amber-600">পাওয়া যায়নি: <strong>{stats.notFound}</strong></span>
                    <span className="text-red-600">ত্রুটি: <strong>{stats.errors}</strong></span>
                    {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500 ml-auto" />}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Table */}
          {items.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  ফলাফল ({items.length} টি)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>প্রোডাক্ট</TableHead>
                        <TableHead className="w-24">স্ট্যাটাস</TableHead>
                        <TableHead className="w-20">ছবি</TableHead>
                        <TableHead className="w-28">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...items].reverse().map((item, i) => (
                        <TableRow key={item.id} className="text-xs">
                          <TableCell className="py-2 text-muted-foreground">{items.length - i}</TableCell>
                          <TableCell className="py-2">
                            <div className="font-medium text-xs line-clamp-1">{item.name}</div>
                            {item.drug_name && (
                              <div className="text-[10px] text-muted-foreground">Medex: {item.drug_name}</div>
                            )}
                          </TableCell>
                          <TableCell className="py-2">
                            {item.status === "pending" && <Badge variant="outline" className="text-[10px]">অপেক্ষায়</Badge>}
                            {item.status === "searching" && <Badge className="text-[10px] bg-blue-500"><Loader2 className="h-3 w-3 animate-spin mr-1" />খোঁজা হচ্ছে</Badge>}
                            {item.status === "found" && <Badge className="text-[10px] bg-emerald-500">পাওয়া গেছে</Badge>}
                            {item.status === "saving" && <Badge className="text-[10px] bg-blue-500"><Loader2 className="h-3 w-3 animate-spin mr-1" />সেভ হচ্ছে</Badge>}
                            {item.status === "saved" && <Badge className="text-[10px] bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />সেভ হয়েছে</Badge>}
                            {item.status === "not_found" && <Badge variant="secondary" className="text-[10px]">পাওয়া যায়নি</Badge>}
                            {item.status === "skipped" && <Badge variant="outline" className="text-[10px]">স্কিপ</Badge>}
                            {item.status === "error" && <Badge variant="destructive" className="text-[10px]">ত্রুটি</Badge>}
                          </TableCell>
                          <TableCell className="py-2">
                            {(item.vault_image || item.medex_image) && (
                              <div className="h-10 w-10 rounded border bg-background overflow-hidden">
                                <img
                                  src={item.vault_image || item.medex_image}
                                  alt=""
                                  className="h-full w-full object-contain"
                                />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-2">
                            {item.status === "found" && !autoAccept && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 text-emerald-600" onClick={() => handleManualSave(item)}>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />সেভ
                                </Button>
                                <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={() => handleSkip(item.id)}>
                                  স্কিপ
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MedexImageSync;
