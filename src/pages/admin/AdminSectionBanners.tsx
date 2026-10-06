import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Image, ExternalLink, Sparkles, Layers, Info, CheckCircle2 } from "lucide-react";
import BackButton from "@/components/BackButton";

const RECOMMENDED_WIDTH = 1000;
const RECOMMENDED_HEIGHT = 200;
const ASPECT_RATIO_LABEL = "5:1 (1000 × 200 px)";

const AdminSectionBanners = () => {
  const qc = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [form, setForm] = useState({ image_url: "", link_url: "", after_section_id: "" });

  const { data: sections = [] } = useQuery({
    queryKey: ["admin-homepage-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-section-banners"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("section_banners" as any)
        .select("*, homepage_sections(title, icon, sort_order)")
        .order("created_at", { ascending: true }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const addBanner = useMutation({
    mutationFn: async (f: typeof form) => {
      const { error } = await (supabase as any).from("section_banners").insert({
        image_url: f.image_url,
        link_url: f.link_url || null,
        after_section_id: f.after_section_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-section-banners"] });
      qc.invalidateQueries({ queryKey: ["section-banners"] });
      setShowAddDialog(false);
      resetForm();
      toast.success("ব্যানার সফলভাবে যোগ করা হয়েছে!");
    },
    onError: (err: any) => {
      toast.error(err.message || "ব্যানার যোগ করতে সমস্যা হয়েছে");
    },
  });

  const updateBanner = useMutation({
    mutationFn: async ({ id, ...vals }: any) => {
      const { error } = await (supabase as any).from("section_banners").update(vals).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-section-banners"] });
      qc.invalidateQueries({ queryKey: ["section-banners"] });
      setEditingBanner(null);
      resetForm();
      toast.success("ব্যানার আপডেট সম্পন্ন হয়েছে!");
    },
    onError: (err: any) => {
      toast.error(err.message || "আপডেট ব্যর্থ হয়েছে");
    },
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("section_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-section-banners"] });
      qc.invalidateQueries({ queryKey: ["section-banners"] });
      toast.success("ব্যানার ডিলিট করা হয়েছে");
    },
    onError: (err: any) => {
      toast.error(err.message || "ডিলিট ব্যর্থ হয়েছে");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("section_banners").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-section-banners"] });
      qc.invalidateQueries({ queryKey: ["section-banners"] });
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    },
  });

  const resetForm = () => setForm({ image_url: "", link_url: "", after_section_id: "" });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `section-banners/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file);
    if (error) {
      toast.error("আপলোড ব্যর্থ: " + error.message);
      return;
    }
    const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
    setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
    toast.success("ইমেজ আপলোড সম্পন্ন হয়েছে");
  };

  const formFields = (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="font-semibold text-foreground">
            ব্যানার ইমেজ
          </Label>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
            {ASPECT_RATIO_LABEL}
          </Badge>
        </div>
        <Input type="file" accept="image/*" onChange={handleImageUpload} />
        {form.image_url && (
          <div className="mt-2.5 relative group rounded-xl overflow-hidden border-2 border-primary/40 shadow-sm bg-muted/30">
            <img
              src={form.image_url}
              alt="Preview"
              className="w-full aspect-[1000/200] object-cover"
            />
            <div className="absolute top-2 right-2">
              <Badge className="bg-black/70 text-white border-0 backdrop-blur-sm text-[11px]">
                1000 × 200 (5:1)
              </Badge>
            </div>
          </div>
        )}
        <Input
          className="mt-2"
          value={form.image_url}
          onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
          placeholder="বা ইমেজের সরাসরি লিঙ্ক (URL) পেস্ট করুন..."
        />
        <p className="text-[11px] text-muted-foreground mt-1.5">
          💡 সেরা রেজাল্টের জন্য 1000 × 200 পিক্সেল অথবা 5:1 রেশিও-র ছবি ব্যবহার করুন।
        </p>
      </div>

      <div>
        <Label className="font-semibold text-foreground">ক্লিক লিঙ্ক URL (ঐচ্ছিক)</Label>
        <Input
          className="mt-1.5"
          value={form.link_url}
          onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))}
          placeholder="https://... অথবা /category/medicine"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          কাস্টমার ব্যানারে ক্লিক করলে এই লিঙ্কে চলে যাবে।
        </p>
      </div>

      <div>
        <Label className="font-semibold text-foreground">কোন সেকশনের পরে দেখাবে? *</Label>
        <div className="mt-1.5">
          <Select value={form.after_section_id} onValueChange={(v) => setForm((p) => ({ ...p, after_section_id: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="হোমপেজ সেকশন নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((sec: any) => (
                <SelectItem key={sec.id} value={sec.id}>
                  {sec.icon ? `${sec.icon} ` : ""}{sec.title} (পজিশন #{sec.sort_order})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto min-w-0 p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-indigo-500/10 p-5 rounded-2xl border border-violet-500/20 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/20">
              <Image className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Section Banners</h1>
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                হোমপেজ সেকশনগুলোর মাঝে ওয়াইড ব্যানার যোগ ও পরিচালনা করুন
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="bg-violet-600/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 px-3 py-1 font-mono text-xs">
            সাইজ: 1000 × 200 px (5:1)
          </Badge>
          <Dialog open={showAddDialog} onOpenChange={(o) => { setShowAddDialog(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-500/25">
                <Plus className="mr-1.5 h-4 w-4" /> নতুন ব্যানার যোগ করুন
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  নতুন সেকশন ব্যানার যোগ করুন
                </DialogTitle>
              </DialogHeader>
              {formFields}
              <Button
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white mt-2"
                onClick={() => addBanner.mutate(form)}
                disabled={!form.image_url || !form.after_section_id || addBanner.isPending}
              >
                {addBanner.isPending ? "যোগ হচ্ছে..." : "ব্যানার যোগ করুন"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Card with Exact Dimensions */}
      <Card className="border-violet-200/60 dark:border-violet-900/40 bg-gradient-to-br from-violet-50/50 to-indigo-50/30 dark:from-violet-950/20 dark:to-indigo-950/10">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-foreground/90 space-y-1">
            <p className="font-semibold text-violet-900 dark:text-violet-200">
              ব্যানার রেজোলিউশন ও সাইজ গাইড:
            </p>
            <p className="text-muted-foreground">
              হোমপেজে প্রতিটি সেকশনের নিচে যে ব্যানার প্রদর্শিত হয় তার স্ট্যান্ডার্ড রেশিও হলো <span className="font-bold text-foreground">5:1</span> এবং প্রস্তাবিত সাইজ হলো <span className="font-bold text-violet-600 dark:text-violet-400">1000 × 200 পিক্সেল</span> (বা 1200 × 240 / 1500 × 300 px)। এই সাইজের ব্যানার আপলোড করলে মোবাইল ও ডেস্কটপ উভয় ডিভাইসেই কোনো অংশ না কেটে নিখুঁতভাবে পুরো ব্যানার প্রদর্শিত হবে।
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Content / Banner List */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
      ) : banners.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 flex items-center justify-center mx-auto">
              <Image className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold">কোনো সেকশন ব্যানার পাওয়া যায়নি</h3>
            <p className="text-xs text-muted-foreground">
              হোমপেজের বিভিন্ন সেকশনের মাঝে বিজ্ঞাপন বা ব্র‍্যান্ড প্রমোশন প্রদর্শনের জন্য উপরোক্ত "নতুন ব্যানার যোগ করুন" বাটনে ক্লিক করে 1000×200 সাইজের ব্যানার আপলোড করুন।
            </p>
            <Button
              onClick={() => setShowAddDialog(true)}
              variant="outline"
              className="mt-2 border-violet-300 dark:border-violet-700 text-violet-600"
            >
              <Plus className="mr-1.5 h-4 w-4" /> প্রথম ব্যানার যোগ করুন
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {banners.map((b: any) => {
            const sec = b.homepage_sections;
            return (
              <Card key={b.id} className="overflow-hidden border border-border/80 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="p-4 pb-3 bg-muted/20 border-b">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="secondary" className="gap-1 font-medium text-xs truncate max-w-[240px]">
                        <Layers className="h-3 w-3 text-violet-600 shrink-0" />
                        {sec?.icon ? `${sec.icon} ` : ""}{sec?.title || "অজানা সেকশন"} (#{sec?.sort_order})
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground shrink-0">
                        1000×200
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">
                          {b.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                        </span>
                        <Switch
                          checked={b.is_active}
                          onCheckedChange={(v) => toggleActive.mutate({ id: b.id, is_active: v })}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => {
                          setEditingBanner(b);
                          setForm({
                            image_url: b.image_url,
                            link_url: b.link_url || "",
                            after_section_id: b.after_section_id,
                          });
                        }}
                      >
                        এডিট
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          if (confirm("আপনি কি নিশ্চিতভাবে এই ব্যানারটি ডিলিট করতে চান?")) {
                            deleteBanner.mutate(b.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  {/* Banner Image Preview with 1000x200 (5:1) Aspect Ratio */}
                  <div className="relative group rounded-xl overflow-hidden border border-border/80 shadow-sm bg-muted/20">
                    <img
                      src={b.image_url}
                      alt="Section Banner"
                      className="w-full aspect-[1000/200] object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-black/60 text-white border-0 text-[10px] backdrop-blur-sm">
                        5:1 Aspect
                      </Badge>
                    </div>
                  </div>

                  {b.link_url && (
                    <div className="flex items-center justify-between text-xs pt-1 px-1 text-muted-foreground border-t">
                      <div className="flex items-center gap-1.5 truncate">
                        <ExternalLink className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                        <span className="truncate">{b.link_url}</span>
                      </div>
                      <a
                        href={b.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 hover:underline font-medium shrink-0 ml-2"
                      >
                        টেস্ট লিঙ্ক
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Banner Dialog */}
      <Dialog open={!!editingBanner} onOpenChange={(o) => { if (!o) { setEditingBanner(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-violet-600" />
              ব্যানার সম্পাদনা (Edit Banner)
            </DialogTitle>
          </DialogHeader>
          {formFields}
          <Button
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white mt-2"
            onClick={() => updateBanner.mutate({
              id: editingBanner.id,
              image_url: form.image_url,
              link_url: form.link_url || null,
              after_section_id: form.after_section_id,
            })}
            disabled={updateBanner.isPending}
          >
            {updateBanner.isPending ? "সংরক্ষণ হচ্ছে..." : "পরিবর্তন সংরক্ষণ করুন"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSectionBanners;
