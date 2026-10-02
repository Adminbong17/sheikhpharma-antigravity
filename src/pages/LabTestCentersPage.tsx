import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Building2, Phone, MapPin, ArrowLeft, Plus, ShoppingCart, Beaker,
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

interface CenterAssignment {
  center_id: string;
  test_id: string;
  price: number;
  govt_price: number;
}

interface LabTestItem {
  id: string;
  name: string;
  price: number;
}

const centerTypeLabel = (t: string) =>
  t === "hospital" ? "Hospital" : t === "clinic" ? "Clinic" : "Diagnostic Center";

const LabTestCentersPage = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locState = location.state as {
    testIds?: string[];
    testNames?: string[];
    testName?: string;
    division?: string;
    zilla?: string;
    upazilla?: string;
  } | null;

  // Support both single test (from URL param) and multiple tests (from state)
  const testIds = useMemo(() => {
    if (locState?.testIds && locState.testIds.length > 0) return locState.testIds;
    if (testId) return [testId];
    return [];
  }, [testId, locState?.testIds]);

  const testNames = locState?.testNames || (locState?.testName ? [locState.testName] : []);

  const { addItem, clearCart } = useCart();

  const [centers, setCenters] = useState<LabCenter[]>([]);
  const [assignments, setAssignments] = useState<CenterAssignment[]>([]);
  const [allTests, setAllTests] = useState<LabTestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (testIds.length === 0) return;
    const load = async () => {
      setLoading(true);
      const [assignRes, centersRes, testsRes] = await Promise.all([
        (supabase.from("lab_center_tests" as any) as any)
          .select("center_id, test_id, price, govt_price")
          .in("test_id", testIds)
          .eq("is_active", true),
        (supabase.from("lab_centers" as any) as any)
          .select("*")
          .eq("is_active", true),
        (supabase.from("lab_tests" as any) as any)
          .select("id, name, price")
          .in("id", testIds),
      ]);
      if (assignRes.data) setAssignments(assignRes.data as CenterAssignment[]);
      if (centersRes.data) setCenters(centersRes.data as LabCenter[]);
      if (testsRes.data) setAllTests(testsRes.data as LabTestItem[]);
      setLoading(false);
    };
    load();
  }, [testIds.join(",")]);

  // Centers that have ALL selected tests
  const matchedCenters = useMemo(() => {
    const centerTestMap = new Map<string, Set<string>>();
    assignments.forEach(a => {
      if (!centerTestMap.has(a.center_id)) centerTestMap.set(a.center_id, new Set());
      centerTestMap.get(a.center_id)!.add(a.test_id);
    });

    return centers.filter(c => {
      const cTests = centerTestMap.get(c.id);
      if (!cTests || !testIds.every(tid => cTests.has(tid))) return false;
      if (locState?.division && c.division && c.division !== locState.division) return false;
      if (locState?.zilla && c.zilla && c.zilla !== locState.zilla) return false;
      if (locState?.upazilla && c.upazilla && c.upazilla !== locState.upazilla) return false;
      return true;
    });
  }, [centers, assignments, locState, testIds]);

  const getCenterTotal = (centerId: string) => {
    let total = 0;
    let hasGovt = false;
    testIds.forEach(tid => {
      const a = assignments.find(x => x.center_id === centerId && x.test_id === tid);
      if (a) {
        if (a.govt_price && a.govt_price > 0) {
          total += a.govt_price;
          hasGovt = true;
        } else {
          total += a.price;
        }
      }
    });
    return { total, hasGovt };
  };

  const handleAddToCart = (center: LabCenter) => {
    clearCart();
    setTimeout(() => {
      testIds.forEach(tid => {
        const a = assignments.find(x => x.center_id === center.id && x.test_id === tid);
        const test = allTests.find(t => t.id === tid);
        if (!a || !test) return;
        const price = (a.govt_price && a.govt_price > 0) ? a.govt_price : a.price;
        addItem({
          id: `lab-${tid}-${center.id}`,
          name: `${test.name} (${center.name})`,
          price,
          image_url: null,
        });
      });
      toast.success(`${testIds.length} test(s) added to cart!`);
      navigate("/checkout");
    }, 100);
  };

  const headerText = testNames.length > 2
    ? `${testNames[0]}, ${testNames[1]} +${testNames.length - 2} more`
    : testNames.join(", ") || "Lab Tests";

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-lg md:max-w-2xl lg:max-w-4xl">
        <button
          onClick={() => navigate("/lab-test", { state: locState ? { division: locState.division, zilla: locState.zilla, upazilla: locState.upazilla } : undefined })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow">
            <Beaker className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-foreground">{headerText}</h1>
            <p className="text-xs text-muted-foreground font-medium">
              {matchedCenters.length} center(s) available • {testIds.length} test(s)
            </p>
          </div>
        </div>

        {/* Selected tests chips */}
        {testNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {testNames.map((name, i) => (
              <span key={i} className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary">
                {name}
              </span>
            ))}
          </div>
        )}

        {locState?.division && (
          <div className="flex items-center gap-1.5 mb-4 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
            <MapPin className="h-3.5 w-3.5" />
            {[locState.upazilla, locState.zilla, locState.division].filter(Boolean).join(", ")}
          </div>
        )}

        {matchedCenters.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No centers found with all selected tests in your area</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matchedCenters.map(c => {
              const { total, hasGovt } = getCenterTotal(c.id);
              return (
                <div
                  key={c.id}
                  className="border-2 border-border rounded-xl p-3 bg-card hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt={c.name} className="h-12 w-12 rounded-lg object-cover border" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{c.name}</p>
                      <span className="inline-block text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md mt-0.5">
                        {centerTypeLabel(c.type)}
                      </span>
                      {c.address && (
                        <p className="flex items-start gap-1 text-[11px] text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 shrink-0 mt-0.5" /> {c.address}
                        </p>
                      )}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-[11px] font-bold text-primary mt-0.5">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {hasGovt ? (
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">GOVT RATE</span>
                      ) : (
                        <span className="text-sm font-extrabold text-primary">৳{total}</span>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(c)}
                        className="h-8 px-3 text-xs font-bold bg-gradient-to-r from-primary to-blue-600 text-white"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Book
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default LabTestCentersPage;
