import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Microscope,
  Plus,
  Check,
  ShoppingCart,
  Beaker,
  MapPin,
  ChevronRight,
  Building2,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";

interface LabTestItem {
  id: string;
  name: string;
  name_bn: string | null;
  price: number;
  category: string | null;
  is_popular: boolean;
}

interface DeliveryZone {
  id: string;
  division: string;
  zilla: string | null;
  upazilla: string | null;
  charge: number;
}

interface LabCenter {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  division: string | null;
  zilla: string | null;
  upazilla: string | null;
}

interface CenterTestAssignment {
  test_id: string;
  price: number;
  govt_price: number;
}

const LabTest = () => {
  const { addItem, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const locState = location.state as { division?: string; zilla?: string; upazilla?: string } | null;

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [labTests, setLabTests] = useState<LabTestItem[]>([]);

  // Location step
  const [locationConfirmed, setLocationConfirmed] = useState(!!locState?.division);
  const [selectedDivision, setSelectedDivision] = useState(locState?.division || "");
  const [selectedZilla, setSelectedZilla] = useState(locState?.zilla || "");
  const [selectedUpazilla, setSelectedUpazilla] = useState(locState?.upazilla || "");
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [labCenters, setLabCenters] = useState<LabCenter[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<LabCenter | null>(null);
  const [selectedCenterType, setSelectedCenterType] = useState<string>("all");
  const [centerTestAssignments, setCenterTestAssignments] = useState<CenterTestAssignment[]>([]);

  useEffect(() => {
    (supabase.from("delivery_zones" as any) as any).select("*").eq("is_active", true).then(({ data }: any) => {
      if (data) setDeliveryZones(data as DeliveryZone[]);
    });
    (supabase.from("lab_tests" as any) as any).select("*").eq("is_active", true).order("sort_order").then(({ data }: any) => {
      if (data) setLabTests(data as LabTestItem[]);
    });
    (supabase.from("lab_centers" as any) as any).select("*").eq("is_active", true).order("sort_order").then(({ data }: any) => {
      if (data) setLabCenters(data as LabCenter[]);
    });
  }, []);

  const divisions = useMemo(() => [...new Set(deliveryZones.map((z) => z.division))].sort(), [deliveryZones]);
  const zillas = useMemo(() => selectedDivision ? [...new Set(deliveryZones.filter((z) => z.division === selectedDivision && z.zilla).map((z) => z.zilla!))].sort() : [], [deliveryZones, selectedDivision]);
  const upazillas = useMemo(() => selectedZilla ? [...new Set(deliveryZones.filter((z) => z.division === selectedDivision && z.zilla === selectedZilla && z.upazilla).map((z) => z.upazilla!))].sort() : [], [deliveryZones, selectedDivision, selectedZilla]);

  const categories = useMemo(() => {
    const cats = [...new Set(labTests.map(t => t.category).filter(Boolean))].sort();
    return cats;
  }, [labTests]);

  const matchedCenters = useMemo(() => {
    if (!locationConfirmed || !selectedDivision) return [];
    return labCenters.filter(c => {
      if (c.division && c.division !== selectedDivision) return false;
      if (selectedZilla && c.zilla && c.zilla !== selectedZilla) return false;
      if (selectedUpazilla && c.upazilla && c.upazilla !== selectedUpazilla) return false;
      return true;
    });
  }, [labCenters, locationConfirmed, selectedDivision, selectedZilla, selectedUpazilla]);

  const centerTypeLabel = (t: string) => t === "hospital" ? "Hospital" : t === "clinic" ? "Clinic" : "Diagnostic Center";

  const handleSelectCenter = async (center: LabCenter) => {
    setSelectedCenter(center);
    setSelectedTests(new Set());
    const { data } = await (supabase.from("lab_center_tests" as any) as any)
      .select("test_id, price, govt_price").eq("center_id", center.id).eq("is_active", true);
    setCenterTestAssignments((data || []) as CenterTestAssignment[]);
  };

  const clearCenter = () => {
    setSelectedCenter(null);
    setCenterTestAssignments([]);
    setSelectedTests(new Set());
  };

  const getTestPrice = (testId: string, defaultPrice: number) => {
    if (!selectedCenter) return defaultPrice;
    const a = centerTestAssignments.find(x => x.test_id === testId);
    if (!a) return defaultPrice;
    // If govt_price > 0, admin marked it as govt rate
    if (a.govt_price && a.govt_price > 0) return a.govt_price;
    return a.price;
  };

  const isGovtRate = (testId: string) => {
    if (!selectedCenter) return false;
    const a = centerTestAssignments.find(x => x.test_id === testId);
    return a && a.govt_price && a.govt_price > 0;
  };

  const availableTests = useMemo(() => {
    if (!selectedCenter || centerTestAssignments.length === 0) return labTests;
    const assignedIds = new Set(centerTestAssignments.map(a => a.test_id));
    return labTests.filter(t => assignedIds.has(t.id));
  }, [labTests, selectedCenter, centerTestAssignments]);

  const filtered = availableTests.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.name_bn && t.name_bn.includes(search));
    const matchCat = selectedCategory === "all" || t.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const popularTests = availableTests.filter((t) => t.is_popular);

  const toggleTest = (id: string) => {
    setSelectedTests((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectedList = availableTests.filter((t) => selectedTests.has(t.id));
  const subtotal = selectedList.reduce((s, t) => s + getTestPrice(t.id, t.price), 0);

  const handleCheckout = () => {
    if (selectedTests.size === 0) {
      toast.error("Please select at least one test");
      return;
    }
    clearCart();
    setTimeout(() => {
      selectedList.forEach((t) => {
        addItem({ id: `lab-${t.id}`, name: `${t.name}${selectedCenter ? ` (${selectedCenter.name})` : ""}`, price: getTestPrice(t.id, t.price), image_url: null });
      });
      toast.success("Lab tests added to cart!");
      navigate("/checkout");
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-lg md:max-w-2xl lg:max-w-4xl pb-32">
        <BackButton className="mb-3" />

        {/* Location Selection Step */}
        {!locationConfirmed ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-xl mb-5">
              <MapPin className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground mb-1">Select Your Location</h1>
            <p className="text-sm text-muted-foreground font-medium mb-6 text-center">
              আপনার এলাকা নির্বাচন করুন যেখানে স্যাম্পল কালেকশন করা হবে
            </p>

            <div className="w-full max-w-md space-y-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-sm">Division (বিভাগ) *</Label>
                <Select value={selectedDivision} onValueChange={(v) => { setSelectedDivision(v); setSelectedZilla(""); setSelectedUpazilla(""); }}>
                  <SelectTrigger className="bg-background h-11 rounded-xl border-2 border-primary/20 font-medium">
                    <SelectValue placeholder="Select Division" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {selectedDivision && zillas.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="font-bold text-sm">Zilla (জেলা) *</Label>
                  <Select value={selectedZilla} onValueChange={(v) => { setSelectedZilla(v); setSelectedUpazilla(""); }}>
                    <SelectTrigger className="bg-background h-11 rounded-xl border-2 border-primary/20 font-medium">
                      <SelectValue placeholder="Select Zilla" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {zillas.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedZilla && upazillas.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="font-bold text-sm">Upazilla (উপজেলা)</Label>
                  <Select value={selectedUpazilla} onValueChange={setSelectedUpazilla}>
                    <SelectTrigger className="bg-background h-11 rounded-xl border-2 border-primary/20 font-medium">
                      <SelectValue placeholder="Select Upazilla" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {upazillas.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={() => {
                  if (!selectedDivision) { toast.error("Please select a division"); return; }
                  setLocationConfirmed(true);
                }}
                disabled={!selectedDivision}
                className="w-full font-bold bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg h-12 text-base rounded-xl mt-2"
              >
                <ChevronRight className="h-5 w-5 mr-2" />
                Continue — টেস্ট নির্বাচন করুন
              </Button>
            </div>
          </div>
        ) : (
        <>
        {/* Location badge */}
        <button
          onClick={() => setLocationConfirmed(false)}
          className="flex items-center gap-1.5 mb-4 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
        >
          <MapPin className="h-3.5 w-3.5" />
          {[selectedUpazilla, selectedZilla, selectedDivision].filter(Boolean).join(", ")}
          <span className="text-muted-foreground font-medium ml-1">— Change</span>
        </button>

        {/* Nearby Lab Centers */}
        {matchedCenters.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-extrabold text-foreground mb-2 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-primary" />
              Nearby Centers
              <span className="text-muted-foreground font-medium">({matchedCenters.length})</span>
            </h2>
            {/* Center type filter */}
            <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
              {["all", "clinic", "diagnostic", "hospital"].map(type => {
                const count = type === "all" ? matchedCenters.length : matchedCenters.filter(c => c.type === type).length;
                if (type !== "all" && count === 0) return null;
                const label = type === "all" ? "All" : centerTypeLabel(type);
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedCenterType(type)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
                      selectedCenterType === type
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {matchedCenters
                .filter(c => selectedCenterType === "all" || c.type === selectedCenterType)
                .map(c => (
                <button key={c.id} onClick={() => navigate(`/lab-center/${c.id}`, { state: { fromLabTest: true, division: selectedDivision, zilla: selectedZilla, upazilla: selectedUpazilla } })} className={`flex-shrink-0 w-56 border-2 rounded-xl p-3 bg-card transition-colors text-left ${selectedCenter?.id === c.id ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40"}`}>
                  <div className="flex items-center gap-2.5 mb-2">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt={c.name} className="h-10 w-10 rounded-lg object-cover border" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{c.name}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedCenterType(c.type); }}
                        className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md hover:bg-primary/20 transition-colors"
                      >
                        {centerTypeLabel(c.type)}
                      </button>
                    </div>
                  </div>
                  {c.address && <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1">{c.address}</p>}
                  {c.phone && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-primary">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Center Badge */}
        {selectedCenter && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-accent/50 border border-accent text-xs">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span className="font-bold">{selectedCenter.name}</span>
            <span className="text-muted-foreground">— {centerTestAssignments.length} tests available</span>
            <button onClick={clearCenter} className="ml-auto text-destructive font-bold hover:underline text-[11px]">All Tests</button>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
            <Microscope className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">Lab Test</h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">আপনার প্রয়োজনীয় টেস্ট নির্বাচন করুন</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tests (টেস্ট খুঁজুন)..."
            className="pl-10 h-11 rounded-xl border-2 border-primary/20 focus:border-primary"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              selectedCategory === "all" ? "bg-primary text-primary-foreground shadow-md scale-105" : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            <Beaker className="h-3.5 w-3.5" />
            All Tests
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                selectedCategory === cat ? "bg-primary text-primary-foreground shadow-md scale-105" : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Find Centers Button - inline after category tabs */}
        {selectedTests.size > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl border-2 border-primary/30 bg-primary/5">
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">{selectedTests.size} test(s) selected</p>
              <button onClick={() => setSelectedTests(new Set())} className="text-[11px] text-destructive font-bold hover:underline">Clear All</button>
            </div>
            <Button
              onClick={() => {
                const testNames = availableTests.filter(t => selectedTests.has(t.id)).map(t => t.name);
                navigate("/lab-test/centers", {
                  state: {
                    testIds: [...selectedTests],
                    testNames,
                    division: selectedDivision,
                    zilla: selectedZilla,
                    upazilla: selectedUpazilla,
                  }
                });
              }}
              className="font-bold bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg h-10 px-5 text-xs"
            >
              <Search className="h-3.5 w-3.5 mr-1.5" />
              Find Centers
            </Button>
          </div>
        )}

        {/* Popular Tests (only when no search & all category) */}
        {!search && selectedCategory === "all" && popularTests.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-extrabold text-foreground mb-2 flex items-center gap-1.5">
              🔥 Popular Tests
            </h2>
            <div className="flex flex-wrap gap-2">
              {popularTests.map((t) => {
                const isSelected = selectedTests.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTest(t.id)}
                    className={`px-3 py-2 rounded-xl border-2 transition-all text-xs font-bold ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/40 text-foreground"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 inline mr-1" />}
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* All Tests grouped by category */}
        <div className="mb-4 space-y-4">
          <h2 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
            <Beaker className="h-4 w-4 text-primary" />
            {selectedCategory === "all" ? "All Tests" : `${selectedCategory} Tests`}
            <span className="text-muted-foreground font-medium ml-1">({filtered.length})</span>
          </h2>

          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Microscope className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No tests found</p>
            </div>
          ) : selectedCategory !== "all" ? (
            <div className="flex flex-wrap gap-1.5">
              {filtered.map((t) => {
                const isSelected = selectedTests.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTest(t.id)}
                    className={`px-2.5 py-1.5 rounded-lg border transition-all text-[11px] font-bold ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/40 text-foreground"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 inline mr-1" />}
                    {t.name}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Grouped by category */
            (() => {
              const grouped = new Map<string, typeof filtered>();
              filtered.forEach(t => {
                const cat = t.category || "Other";
                if (!grouped.has(cat)) grouped.set(cat, []);
                grouped.get(cat)!.push(t);
              });
              return [...grouped.entries()].map(([cat, tests]) => (
                <div key={cat} className="border rounded-xl bg-card overflow-hidden">
                  <div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-foreground">{cat}</span>
                    <span className="text-[10px] font-bold text-muted-foreground">{tests.length} tests</span>
                  </div>
                  <div className="p-2 flex flex-wrap gap-1.5">
                    {tests.map((t) => {
                      const isSelected = selectedTests.has(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleTest(t.id)}
                          className={`px-2.5 py-1.5 rounded-lg border transition-all text-[11px] font-bold ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/60 bg-background hover:border-primary/40 text-foreground"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 inline mr-1" />}
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ));
            })()
          )}
        </div>
        </>
        )}
      </main>





      <Footer />
    </div>
  );
};

export default LabTest;
