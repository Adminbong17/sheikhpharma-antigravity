import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Droplets, HeartPulse, User, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

interface DeliveryZone {
  division: string;
  zilla: string | null;
  upazilla: string | null;
}

const BloodBank = () => {
  const [needForm, setNeedForm] = useState({ name: "", phone: "", blood_group: "", division: "", zilla: "", upazilla: "", location: "", details: "" });
  const [donorForm, setDonorForm] = useState({ name: "", phone: "", blood_group: "", division: "", zilla: "", upazilla: "", location: "", last_donation: "" });
  const [submitting, setSubmitting] = useState(false);
  const [zones, setZones] = useState<DeliveryZone[]>([]);

  useEffect(() => {
    (supabase.from("delivery_zones" as any) as any)
      .select("division, zilla, upazilla")
      .eq("is_active", true)
      .then(({ data }: any) => {
        if (data) setZones(data as DeliveryZone[]);
      });
  }, []);

  const divisions = [...new Set(zones.map(z => z.division))].sort();
  const getZillas = (div: string) => [...new Set(zones.filter(z => z.division === div && z.zilla).map(z => z.zilla!))].sort();
  const getUpazillas = (div: string, zilla: string) => [...new Set(zones.filter(z => z.division === div && z.zilla === zilla && z.upazilla).map(z => z.upazilla!))].sort();

  const sendAdminSms = async (form: any, type: string) => {
    try {
      const { data: smsSettings } = await (supabase.from("sms_settings" as any) as any)
        .select("admin_phone, is_enabled")
        .limit(1)
        .single();

      if (smsSettings?.is_enabled && smsSettings.admin_phone) {
        const { data: siteSettings } = await supabase.from("site_settings").select("site_name").limit(1).single();
        const siteName = siteSettings?.site_name || "QweekBD";
        const locationParts = [form.upazilla, form.zilla, form.division, form.location].filter(Boolean).join(", ");
        const msg = type === "need"
          ? `${siteName}: 🩸 জরুরি রক্তের প্রয়োজন!\nনাম: ${form.name}\nফোন: ${form.phone}\nগ্রুপ: ${form.blood_group}\nঠিকানা: ${locationParts}\nবিস্তারিত: ${form.details || "N/A"}`
          : `${siteName}: 🩸 নতুন রক্তদাতা নিবন্ধন!\nনাম: ${form.name}\nফোন: ${form.phone}\nগ্রুপ: ${form.blood_group}\nঠিকানা: ${locationParts}`;

        await supabase.functions.invoke("send-sms", {
          body: { phone: smsSettings.admin_phone, message: msg, event_type: "blood_request" },
        });
      }
    } catch (err) {
      console.error("SMS notify error:", err);
    }
  };

  const handleNeedSubmit = async () => {
    if (!needForm.name || !needForm.phone || !needForm.blood_group || !needForm.division) {
      toast.error("সব তথ্য পূরণ করুন");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("blood_requests" as any).insert({
      name: needForm.name,
      phone: needForm.phone,
      blood_group: needForm.blood_group,
      division: needForm.division,
      zilla: needForm.zilla || null,
      upazilla: needForm.upazilla || null,
      location: needForm.location || needForm.division,
      details: needForm.details,
      type: "need",
    });
    if (error) {
      toast.error("সাবমিট করতে সমস্যা হয়েছে");
      console.error(error);
    } else {
      toast.success("আপনার অনুরোধ সফলভাবে জমা হয়েছে");
      await sendAdminSms(needForm, "need");
      await supabase.from("admin_notifications").insert({
        title: "🩸 জরুরি রক্তের প্রয়োজন",
        body: `${needForm.name} (${needForm.phone}) - গ্রুপ: ${needForm.blood_group}, ${[needForm.upazilla, needForm.zilla, needForm.division].filter(Boolean).join(", ")}`,
        type: "blood_request",
      });
      setNeedForm({ name: "", phone: "", blood_group: "", division: "", zilla: "", upazilla: "", location: "", details: "" });
    }
    setSubmitting(false);
  };

  const handleDonorSubmit = async () => {
    if (!donorForm.name || !donorForm.phone || !donorForm.blood_group || !donorForm.division) {
      toast.error("সব তথ্য পূরণ করুন");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("blood_requests" as any).insert({
      name: donorForm.name,
      phone: donorForm.phone,
      blood_group: donorForm.blood_group,
      division: donorForm.division,
      zilla: donorForm.zilla || null,
      upazilla: donorForm.upazilla || null,
      location: donorForm.location || donorForm.division,
      details: donorForm.last_donation ? `সর্বশেষ রক্তদান: ${donorForm.last_donation}` : "",
      type: "donor",
    });
    if (error) {
      toast.error("সাবমিট করতে সমস্যা হয়েছে");
      console.error(error);
    } else {
      toast.success("আপনার তথ্য সফলভাবে জমা হয়েছে");
      await sendAdminSms(donorForm, "donor");
      await supabase.from("admin_notifications").insert({
        title: "🩸 নতুন রক্তদাতা নিবন্ধন",
        body: `${donorForm.name} (${donorForm.phone}) - গ্রুপ: ${donorForm.blood_group}, ${[donorForm.upazilla, donorForm.zilla, donorForm.division].filter(Boolean).join(", ")}`,
        type: "blood_request",
      });
      setDonorForm({ name: "", phone: "", blood_group: "", division: "", zilla: "", upazilla: "", location: "", last_donation: "" });
    }
    setSubmitting(false);
  };

  const LocationFields = ({ form, setForm }: { form: any; setForm: any }) => (
    <>
      <div>
        <Label className="text-xs">বিভাগ *</Label>
        <Select value={form.division} onValueChange={v => { setForm((p: any) => ({ ...p, division: v, zilla: "", upazilla: "" })); }}>
          <SelectTrigger><SelectValue placeholder="বিভাগ নির্বাচন করুন" /></SelectTrigger>
          <SelectContent>
            {divisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {form.division && getZillas(form.division).length > 0 && (
        <div>
          <Label className="text-xs">জেলা</Label>
          <Select value={form.zilla} onValueChange={v => { setForm((p: any) => ({ ...p, zilla: v, upazilla: "" })); }}>
            <SelectTrigger><SelectValue placeholder="জেলা নির্বাচন করুন" /></SelectTrigger>
            <SelectContent>
              {getZillas(form.division).map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {form.zilla && getUpazillas(form.division, form.zilla).length > 0 && (
        <div>
          <Label className="text-xs">উপজেলা</Label>
          <Select value={form.upazilla} onValueChange={v => { setForm((p: any) => ({ ...p, upazilla: v })); }}>
            <SelectTrigger><SelectValue placeholder="উপজেলা নির্বাচন করুন" /></SelectTrigger>
            <SelectContent>
              {getUpazillas(form.division, form.zilla).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Droplets className="h-7 w-7 text-destructive" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold">ব্লাড ব্যাংক</h1>
            <p className="text-sm text-muted-foreground">রক্তের প্রয়োজনে যোগাযোগ করুন</p>
          </div>
        </div>

        <Tabs defaultValue="need" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 p-1.5 bg-muted/80 rounded-xl">
            <TabsTrigger value="need" className="text-sm font-bold gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
              <HeartPulse className="h-4 w-4" />
              রক্তের প্রয়োজন
            </TabsTrigger>
            <TabsTrigger value="donor" className="text-sm font-bold gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
              <User className="h-4 w-4" />
              রক্তদাতা
            </TabsTrigger>
          </TabsList>

          <TabsContent value="need" className="mt-4 space-y-4">
            <Card className="border-destructive/30">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-sm text-destructive flex items-center gap-2">
                  <HeartPulse className="h-4 w-4" />
                  রক্তের প্রয়োজন হলে ফর্মটি পূরণ করুন
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">রোগীর নাম *</Label>
                    <Input placeholder="নাম লিখুন" value={needForm.name} onChange={e => setNeedForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">ফোন নম্বর *</Label>
                    <Input placeholder="01XXXXXXXXX" value={needForm.phone} onChange={e => setNeedForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">রক্তের গ্রুপ *</Label>
                    <Select value={needForm.blood_group} onValueChange={v => setNeedForm(p => ({ ...p, blood_group: v }))}>
                      <SelectTrigger><SelectValue placeholder="গ্রুপ নির্বাচন করুন" /></SelectTrigger>
                      <SelectContent>
                        {bloodGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <LocationFields form={needForm} setForm={setNeedForm} />
                  <div>
                    <Label className="text-xs">হাসপাতাল / বিস্তারিত ঠিকানা</Label>
                    <Input placeholder="হাসপাতালের নাম বা ঠিকানা" value={needForm.location} onChange={e => setNeedForm(p => ({ ...p, location: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">বিস্তারিত (ঐচ্ছিক)</Label>
                    <Textarea placeholder="কতটুকু রক্ত দরকার, কখন দরকার ইত্যাদি" value={needForm.details} onChange={e => setNeedForm(p => ({ ...p, details: e.target.value }))} rows={3} />
                  </div>
                  <Button onClick={handleNeedSubmit} disabled={submitting} className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    {submitting ? "জমা হচ্ছে..." : "অনুরোধ জমা দিন"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="donor" className="mt-4 space-y-4">
            <Card className="border-emerald-500/30">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-sm text-emerald-600 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  রক্তদাতা হিসেবে নিবন্ধন করুন
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">আপনার নাম *</Label>
                    <Input placeholder="নাম লিখুন" value={donorForm.name} onChange={e => setDonorForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">ফোন নম্বর *</Label>
                    <Input placeholder="01XXXXXXXXX" value={donorForm.phone} onChange={e => setDonorForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">রক্তের গ্রুপ *</Label>
                    <Select value={donorForm.blood_group} onValueChange={v => setDonorForm(p => ({ ...p, blood_group: v }))}>
                      <SelectTrigger><SelectValue placeholder="গ্রুপ নির্বাচন করুন" /></SelectTrigger>
                      <SelectContent>
                        {bloodGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <LocationFields form={donorForm} setForm={setDonorForm} />
                  <div>
                    <Label className="text-xs">বিস্তারিত ঠিকানা (ঐচ্ছিক)</Label>
                    <Input placeholder="আপনার ঠিকানা লিখুন" value={donorForm.location} onChange={e => setDonorForm(p => ({ ...p, location: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">সর্বশেষ রক্তদানের তারিখ (ঐচ্ছিক)</Label>
                    <Input type="date" value={donorForm.last_donation} onChange={e => setDonorForm(p => ({ ...p, last_donation: e.target.value }))} />
                  </div>
                  <Button onClick={handleDonorSubmit} disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                    {submitting ? "জমা হচ্ছে..." : "রক্তদাতা হিসেবে নিবন্ধন করুন"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default BloodBank;
