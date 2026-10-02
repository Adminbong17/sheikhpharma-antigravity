import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import { Stethoscope, Phone, MapPin, GraduationCap, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const SpecialistDoctors = () => {
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("all");
  const [zilla, setZilla] = useState("all");
  const [categoryId, setCategoryId] = useState("all");

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("doctors").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["doctor-category-assignments"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("doctor_category_assignments").select("*");
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["doctor-categories"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("doctor_categories").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: deliveryZones = [] } = useQuery({
    queryKey: ["delivery-zones-list"],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_zones").select("division, zilla").eq("is_active", true);
      return data || [];
    },
  });

  const uniqueDivisions = useMemo(() => {
    return [...new Set(deliveryZones.map((z: any) => z.division).filter(Boolean))].sort();
  }, [deliveryZones]);

  const uniqueZillas = useMemo(() => {
    const filtered = division !== "all" ? deliveryZones.filter((d: any) => d.division === division) : deliveryZones;
    return [...new Set(filtered.map((d: any) => d.zilla).filter(Boolean))].sort();
  }, [deliveryZones, division]);

  const getDoctorCategoryIds = (doctorId: string): string[] => {
    return assignments.filter((a: any) => a.doctor_id === doctorId).map((a: any) => a.category_id);
  };

  const getDoctorCategoryNames = (doctorId: string): string[] => {
    const catIds = getDoctorCategoryIds(doctorId);
    return catIds.map((id: string) => {
      const cat = categories.find((c: any) => c.id === id);
      return cat ? `${cat.icon ? cat.icon + " " : ""}${cat.name}` : "";
    }).filter(Boolean);
  };

  const filtered = useMemo(() => {
    return doctors.filter((doc: any) => {
      const matchSearch = !search || doc.name?.toLowerCase().includes(search.toLowerCase()) || doc.specialty?.toLowerCase().includes(search.toLowerCase());
      const matchDiv = division === "all" || doc.division === division;
      const matchZilla = zilla === "all" || doc.zilla === zilla;
      const matchCat = categoryId === "all" || getDoctorCategoryIds(doc.id).includes(categoryId);
      return matchSearch && matchDiv && matchZilla && matchCat;
    });
  }, [doctors, search, division, zilla, categoryId, assignments]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 space-y-4">
        <BackButton className="mb-1" />
        <div className="flex items-center gap-3">
          <Stethoscope className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold">বিশেষজ্ঞ চিকিৎসক বৃন্দ</h1>
            <p className="text-sm text-muted-foreground">আমাদের অভিজ্ঞ ডাক্তারদের তালিকা</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-2">

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="ডাক্তারের নাম খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 text-xs border-2 border-border" />
          </div>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="border-2 border-border"><SelectValue placeholder="বিশেষজ্ঞ খুঁজুন" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল বিশেষজ্ঞ</SelectItem>
              {categories.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.icon ? `${cat.icon} ` : ""}{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={division} onValueChange={v => { setDivision(v); setZilla("all"); }}>
            <SelectTrigger className="border-2 border-border"><SelectValue placeholder="বিভাগ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল বিভাগ</SelectItem>
              {uniqueDivisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={zilla} onValueChange={setZilla}>
            <SelectTrigger className="border-2 border-border"><SelectValue placeholder="জেলা" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল জেলা</SelectItem>
              {uniqueZillas.map((z: string) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || categoryId !== "all" || division !== "all" || zilla !== "all") && (
            <button
              onClick={() => { setSearch(""); setCategoryId("all"); setDivision("all"); setZilla("all"); }}
              className="text-xs font-medium text-destructive hover:text-destructive/80 border-2 border-destructive/30 rounded-md px-3 py-2 hover:bg-destructive/5 transition-colors"
            >
              ✕ ক্লিয়ার করুন
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-10">লোড হচ্ছে...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">কোনো ডাক্তার পাওয়া যায়নি</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((doc: any) => {
              const catNames = getDoctorCategoryNames(doc.id);
              return (
                <Card key={doc.id} className="overflow-hidden rounded-2xl border border-purple-200/60 bg-gradient-to-br from-violet-50/50 via-background to-purple-50/30 shadow-sm hover:shadow-lg hover:border-purple-300/50 transition-all duration-300">
                  <CardContent className="p-5 space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                        <Stethoscope className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-[15px] leading-tight text-foreground">{doc.name}</h3>
                        {catNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {catNames.map((name: string) => (
                              <Badge key={name} variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">{name}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs border-t border-border/40 pt-3">
                      {doc.qualification && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <GraduationCap className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/60" />
                          <span>{doc.qualification}</span>
                        </div>
                      )}
                      {doc.specialty && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <Stethoscope className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/60" />
                          <span>{doc.specialty}</span>
                        </div>
                      )}
                      {doc.chamber && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/60" />
                          <span>{doc.chamber}</span>
                        </div>
                      )}
                    </div>

                    {doc.phone && (
                      <a href={`tel:${doc.phone}`} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/85 text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                        <Phone className="h-4 w-4" />
                        সিরিয়ালের জন্য কল করুন
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SpecialistDoctors;
