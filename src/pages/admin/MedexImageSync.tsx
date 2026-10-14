import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2, Search, CheckCircle2, XCircle, Image as ImageIcon,
  Play, Square, Download, RefreshCw, Package, BarChart3
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
  const [autoAccept, setAutoAccept] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [items, setItems] = useState<SyncItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [stats, setStats] = useState({ processed: 0, found: 0, saved: 0, notFound: 0, errors: 0 });
  const stopRef = useRef(false);

  // Stats query
  const { data: dbStats, refetch: refetchStats } = useQuery({
    queryKey: ["medex-sync-stats"],
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
      return {
        total: t,
        withImage: w,
        withoutImage: t - w,
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

      if (data?.success && data?.image_url) {
        updateItem(product.id, {
          status: "found",
          medex_image: data.image_url,
          drug_name: data.drug_name,
        });

        if (autoAccept) {
          return await saveImage(product.id, product.name, data.image_url);
        }
        return "found";
      } else {
        updateItem(product.id, { status: "not_found" });
        return "not_found";
      }
    } catch (err: any) {
      updateItem(product.id, { status: "error", error: err.message });
      return "error";
    }
  };

  const saveImage = async (productId: string, productName: string, medexUrl: string): Promise<"found" | "error"> => {
    updateItem(productId, { status: "saving" });
    try {
      const imgRes = await fetch(medexUrl);
      if (!imgRes.ok) throw new Error("Download failed");
      const blob = await imgRes.blob();
      const ext = medexUrl.split('.').pop()?.split('?')[0] || 'webp';
      const fileName = `${slugify(productName)}-medex-${Date.now()}.${ext}`;
      const vaultUrl = await uploadToVault(blob, fileName);

      const { error } = await supabase
        .from("products")
        .update({ image_url: vaultUrl })
        .eq("id", productId);

      if (error) throw error;

      updateItem(productId, { status: "saved", vault_image: vaultUrl });
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
      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .is("image_url", null)
        .eq("is_active", true)
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

      // Process sequentially
      for (const product of products) {
        if (stopRef.current) break;

        const result = await processProduct(product);

        setStats(prev => ({
          processed: prev.processed + 1,
          found: prev.found + (result === "found" ? 1 : 0),
          saved: prev.saved + (result === "found" && autoAccept ? 1 : 0),
          notFound: prev.notFound + (result === "not_found" ? 1 : 0),
          errors: prev.errors + (result === "error" ? 1 : 0),
        }));

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 800));
      }

      currentOffset += products.length;
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-purple-600">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs font-medium">কভারেজ</span>
            </div>
            <p className="text-2xl font-bold mt-1">{dbStats?.rate || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
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
            </div>

            <div className="flex items-center gap-4 ml-auto">
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
    </div>
  );
};

export default MedexImageSync;
