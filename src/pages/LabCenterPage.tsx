import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2, Phone, MapPin, Search, Check, Plus, ShoppingCart, Beaker, Microscope, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

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

interface LabTestItem {
  id: string;
  name: string;
  name_bn: string | null;
  price: number;
  category: string | null;
  is_popular: boolean;
}

interface CenterTestAssignment {
  test_id: string;
  price: number;
  govt_price: number;
}

const centerTypeLabel = (t: string) =>
  t === "hospital" ? "Hospital" : t === "clinic" ? "Clinic" : "Diagnostic Center";

const LabCenterPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locState = location.state as { fromLabTest?: boolean; division?: string; zilla?: string; upazilla?: string } | null;
  const { addItem, clearCart } = useCart();

  const [center, setCenter] = useState<LabCenter | null>(null);
  const [allTests, setAllTests] = useState<LabTestItem[]>([]);
  const [assignments, setAssignments] = useState<CenterTestAssignment[]>([]);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [centerRes, testsRes, assignRes] = await Promise.all([
        (supabase.from("lab_centers" as any) as any).select("*").eq("id", id).single(),
        (supabase.from("lab_tests" as any) as any).select("*").eq("is_active", true).order("sort_order"),
        (supabase.from("lab_center_tests" as any) as any).select("test_id, price, govt_price").eq("center_id", id).eq("is_active", true),
      ]);
      if (centerRes.data) setCenter(centerRes.data as LabCenter);
      if (testsRes.data) setAllTests(testsRes.data as LabTestItem[]);
      if (assignRes.data) setAssignments(assignRes.data as CenterTestAssignment[]);
      setLoading(false);
    };
    load();
  }, [id]);

  const assignedTestIds = useMemo(() => new Set(assignments.map(a => a.test_id)), [assignments]);
  const availableTests = useMemo(() => allTests.filter(t => assignedTestIds.has(t.id)), [allTests, assignedTestIds]);

  const getTestPrice = (testId: string, defaultPrice: number) => {
    const a = assignments.find(x => x.test_id === testId);
    if (!a) return defaultPrice;
    if (a.govt_price && a.govt_price > 0) return a.govt_price;
    return a.price;
  };

  const isGovtRate = (testId: string) => {
    const a = assignments.find(x => x.test_id === testId);
    return !!(a && a.govt_price && a.govt_price > 0);
  };

  const categories = useMemo(() => {
    return [...new Set(availableTests.map(t => t.category).filter(Boolean))].sort();
  }, [availableTests]);

  const filtered = availableTests.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.name_bn && t.name_bn.includes(search));
    const matchCat = selectedCategory === "all" || t.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const toggleTest = (tid: string) => {
    setSelectedTests(prev => {
      const n = new Set(prev);
      if (n.has(tid)) n.delete(tid); else n.add(tid);
      return n;
    });
  };

  const selectedList = availableTests.filter(t => selectedTests.has(t.id));
  const subtotal = selectedList.reduce((s, t) => s + getTestPrice(t.id, t.price), 0);

  const handleCheckout = () => {
    if (selectedTests.size === 0) { toast.error("Please select at least one test"); return; }
    clearCart();
    setTimeout(() => {
      selectedList.forEach(t => {
        addItem({ id: `lab-${t.id}`, name: `${t.name} (${center?.name || ""})`, price: getTestPrice(t.id, t.price), image_url: null });
      });
      toast.success("Lab tests added to cart!");
      navigate("/checkout");
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!center) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center py-20 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-bold">Center not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-lg md:max-w-2xl lg:max-w-4xl pb-32">
        <button
          onClick={() => navigate("/lab-test", { state: locState ? { division: locState.division, zilla: locState.zilla, upazilla: locState.upazilla } : undefined })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Center Info Card */}
        <div className="border-2 border-primary/20 rounded-2xl p-4 bg-card mb-5 shadow-sm">
          <div className="flex items-start gap-3">
            {center.logo_url ? (
              <img src={center.logo_url} alt={center.name} className="h-16 w-16 rounded-xl object-cover border-2 border-primary/20" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-extrabold text-foreground">{center.name}</h1>
              <span className="inline-block text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md mt-0.5">
                {centerTypeLabel(center.type)}
              </span>
              {center.address && (
                <p className="flex items-start gap-1 text-xs text-muted-foreground mt-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {center.address}
                </p>
              )}
              {center.phone && (
                <a href={`tel:${center.phone}`} className="flex items-center gap-1 text-xs font-bold text-primary mt-1">
                  <Phone className="h-3.5 w-3.5" /> {center.phone}
                </a>
              )}
              {center.division && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  📍 {[center.upazilla, center.zilla, center.division].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tests Section */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow">
            <Microscope className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-foreground">Available Tests</h2>
            <p className="text-xs text-muted-foreground font-medium">{availableTests.length} tests available</p>
          </div>
        </div>

        {availableTests.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Beaker className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No tests assigned to this center</p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tests..."
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
                <Beaker className="h-3.5 w-3.5" /> All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat!)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    selectedCategory === cat ? "bg-primary text-primary-foreground shadow-md scale-105" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Test list */}
            <div className="space-y-2">
              {filtered.map(t => {
                const isSelected = selectedTests.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTest(t.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground">{t.name_bn}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {isGovtRate(t.id) ? (
                        <p className="text-xs font-bold text-green-600">GOVT FIXED RATE</p>
                      ) : (
                        <p className="text-sm font-extrabold text-primary">৳{getTestPrice(t.id, t.price)}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{t.category}</p>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Microscope className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No tests found</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Sticky Bottom Bar */}
      {selectedTests.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-card border-t-2 border-primary/20 shadow-2xl p-3 z-40 safe-area-pb md:bottom-0">
          <div className="container mx-auto max-w-lg md:max-w-2xl lg:max-w-4xl">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{selectedTests.size} test(s) selected</p>
                <p className="text-lg font-extrabold text-primary">৳{subtotal}</p>
              </div>
              <button onClick={() => setSelectedTests(new Set())} className="text-xs text-destructive font-bold hover:underline">
                Clear All
              </button>
            </div>
            <Button
              onClick={handleCheckout}
              className="w-full font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white shadow-lg h-12 text-base"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Checkout — ৳{subtotal}
            </Button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default LabCenterPage;
