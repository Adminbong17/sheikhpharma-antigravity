import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Search, Clock, Package } from "lucide-react";
import BackButton from "@/components/BackButton";
import { format } from "date-fns";

const AdminFlashDeals = () => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("Super Deals");
  const [endTime, setEndTime] = useState("");
  const [bannerColor, setBannerColor] = useState("#ef4444");
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["admin-flash-deals"],
    queryFn: async () => {
      const { data } = await (supabase
        .from("flash_deals" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);
      return data || [];
    },
  });

  const { data: dealProducts = [] } = useQuery({
    queryKey: ["admin-flash-deal-products", selectedDeal],
    enabled: !!selectedDeal,
    queryFn: async () => {
      const { data } = await (supabase
        .from("flash_deal_products" as any)
        .select("*, products(id, name, image_url, price, original_price, slug)")
        .eq("deal_id", selectedDeal!)
        .order("sort_order", { ascending: true }) as any);
      return data || [];
    },
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["flash-deal-product-search", productSearch],
    enabled: productSearch.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, image_url, price, original_price")
        .ilike("name", `%${productSearch}%`)
        .eq("is_active", true)
        .limit(10);
      return data || [];
    },
  });

  const createDeal = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("flash_deals").insert({
        title,
        end_time: new Date(endTime).toISOString(),
        banner_color: bannerColor,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flash-deals"] });
      setShowCreate(false);
      setTitle("Super Deals");
      setEndTime("");
      setBannerColor("#ef4444");
      toast.success("Flash Deal তৈরি হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("flash_deals").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-flash-deals"] }),
  });

  const deleteDeal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("flash_deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flash-deals"] });
      toast.success("Deal ডিলিট হয়েছে!");
    },
  });

  const addProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await (supabase as any).from("flash_deal_products").insert({
        deal_id: selectedDeal!,
        product_id: productId,
        sort_order: dealProducts.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flash-deal-products"] });
      setProductSearch("");
      toast.success("প্রোডাক্ট যোগ হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("flash_deal_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flash-deal-products"] });
      toast.success("প্রোডাক্ট রিমুভ হয়েছে!");
    },
  });

  const updateDealPrice = useMutation({
    mutationFn: async ({ id, deal_price }: { id: string; deal_price: number | null }) => {
      const { error } = await (supabase as any).from("flash_deal_products").update({ deal_price }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flash-deal-products"] });
      toast.success("ডিল মূল্য আপডেট হয়েছে!");
    },
  });
  const updateEndTime = useMutation({
    mutationFn: async ({ id, end_time }: { id: string; end_time: string }) => {
      const { error } = await (supabase as any).from("flash_deals").update({ end_time: new Date(end_time).toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flash-deals"] });
      toast.success("সময় আপডেট হয়েছে!");
    },
  });

  const updateBannerColor = useMutation({
    mutationFn: async ({ id, banner_color }: { id: string; banner_color: string }) => {
      const { error } = await (supabase as any).from("flash_deals").update({ banner_color } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flash-deals"] });
      queryClient.invalidateQueries({ queryKey: ["active-flash-deal"] });
      toast.success("ব্যানার কালার আপডেট হয়েছে!");
    },
  });

  const existingProductIds = dealProducts.map((dp: any) => dp.product_id || dp.products?.id);

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">⚡ Flash Deals / Super Deals</h1>
          <p className="text-muted-foreground">টাইমার সহ স্পেশাল অফার সেকশন ম্যানেজ করুন</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> নতুন Deal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>নতুন Flash Deal তৈরি করুন</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>টাইটেল</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Super Deals" />
              </div>
              <div>
                <Label>শেষ হবে (End Time)</Label>
                <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
              <div>
                <Label>ব্যানার কালার</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={bannerColor} onChange={(e) => setBannerColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={bannerColor} onChange={(e) => setBannerColor(e.target.value)} className="flex-1" placeholder="#ef4444" />
                </div>
              </div>
              <Button onClick={() => createDeal.mutate()} disabled={!title || !endTime || createDeal.isPending} className="w-full">
                তৈরি করুন
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Deals list */}
      <div className="grid gap-4">
        {deals.map((deal: any) => (
          <Card key={deal.id} className={selectedDeal === deal.id ? "border-primary" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  {deal.title}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={deal.is_active}
                    onCheckedChange={(checked) => toggleActive.mutate({ id: deal.id, is_active: checked })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => deleteDeal.mutate(deal.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <Label className="text-xs text-muted-foreground">End Time</Label>
                  <Input
                    type="datetime-local"
                    className="w-auto"
                    defaultValue={format(new Date(deal.end_time), "yyyy-MM-dd'T'HH:mm")}
                    onBlur={(e) => {
                      if (e.target.value) updateEndTime.mutate({ id: deal.id, end_time: e.target.value });
                    }}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(deal.end_time) > new Date() ? (
                    <span className="text-green-600 font-medium">🟢 চলমান</span>
                  ) : (
                    <span className="text-destructive font-medium">🔴 মেয়াদ শেষ</span>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Banner Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      defaultValue={deal.banner_color || "#ef4444"}
                      onChange={(e) => updateBannerColor.mutate({ id: deal.id, banner_color: e.target.value })}
                      className="h-9 w-12 rounded border cursor-pointer"
                    />
                    <div className="h-6 w-16 rounded" style={{ backgroundColor: deal.banner_color || "#ef4444" }} />
                  </div>
                </div>
              </div>
              <Button
                variant={selectedDeal === deal.id ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSelectedDeal(selectedDeal === deal.id ? null : deal.id)}
              >
                <Package className="h-4 w-4 mr-1" /> প্রোডাক্ট ম্যানেজ ({dealProducts.length})
              </Button>
            </CardContent>
          </Card>
        ))}
        {deals.length === 0 && !isLoading && (
          <p className="text-center text-muted-foreground py-8">কোনো Flash Deal নেই। নতুন তৈরি করুন।</p>
        )}
      </div>

      {/* Products management for selected deal */}
      {selectedDeal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🛒 প্রোডাক্ট সিলেক্ট করুন</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="প্রোডাক্ট সার্চ করুন..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {productSearch.length >= 2 && searchResults.length > 0 && (
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {searchResults.filter((p: any) => !existingProductIds.includes(p.id)).map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-accent cursor-pointer" onClick={() => addProduct.mutate(p.id)}>
                    <img src={p.image_url || "/placeholder.svg"} alt="" className="h-10 w-10 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">৳{p.price}</p>
                    </div>
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                ))}
              </div>
            )}

            {/* Current products */}
            {dealProducts.length > 0 && (
              <div className="rounded-lg border overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ছবি</TableHead>
                      <TableHead>নাম</TableHead>
                      <TableHead>আসল মূল্য</TableHead>
                      <TableHead>ডিল মূল্য</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dealProducts.map((dp: any) => (
                      <TableRow key={dp.id}>
                        <TableCell>
                          <img src={dp.products?.image_url || "/placeholder.svg"} alt="" className="h-10 w-10 rounded object-cover" />
                        </TableCell>
                        <TableCell className="font-medium">{dp.products?.name}</TableCell>
                        <TableCell className="text-muted-foreground">৳{dp.products?.price}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-24"
                            placeholder="ডিল মূল্য"
                            defaultValue={dp.deal_price ?? ""}
                            onBlur={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              updateDealPrice.mutate({ id: dp.id, deal_price: val });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeProduct.mutate(dp.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminFlashDeals;
