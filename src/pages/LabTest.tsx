import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  MessageCircle,
  Upload,
  Clock,
  ShieldCheck,
  Sparkles,
  HeartPulse,
  Activity,
  FileText,
  Calendar,
  X,
  CheckCircle2,
  Loader2,
  ArrowRight,
  BadgePercent,
  CheckCheck,
  Droplets,
  Zap,
  Dna,
  Scan,
  Radio,
  Waves,
  Bone,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Layers,
  SlidersHorizontal,
  Filter,
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

export const DEFAULT_LAB_TESTS: LabTestItem[] = [
  { id: "lt-1", name: "Complete Blood Count (CBC)", name_bn: "সিবিসি (রক্তের সাধারণ পরীক্ষা)", price: 400, category: "Hematology", is_popular: true },
  { id: "lt-2", name: "Serum Creatinine", name_bn: "সিরাম ক্রিয়েটিনিন (কিডনি পরীক্ষা)", price: 350, category: "Biochemistry", is_popular: true },
  { id: "lt-3", name: "Fasting Blood Sugar (FBS)", name_bn: "রক্তের শর্করা (খালি পেটে)", price: 150, category: "Biochemistry", is_popular: true },
  { id: "lt-4", name: "HbA1c (Glycated Hemoglobin)", name_bn: "এইচবিএ১সি (৩ মাসের গড় সুগার)", price: 900, category: "Biochemistry", is_popular: true },
  { id: "lt-5", name: "Lipid Profile (Cholesterol)", name_bn: "লিপিড প্রোফাইল (রক্তের চর্বি)", price: 1000, category: "Biochemistry", is_popular: true },
  { id: "lt-6", name: "Urine Routine Examination (R/E)", name_bn: "প্রস্রাবের সাধারণ পরীক্ষা", price: 200, category: "Clinical Pathology", is_popular: true },
  { id: "lt-7", name: "Serum Bilirubin", name_bn: "বিলিরুবিন (জন্ডিস পরীক্ষা)", price: 300, category: "Biochemistry", is_popular: true },
  { id: "lt-8", name: "SGPT / ALT", name_bn: "এসজিপিটি (লিভার ফাংশন)", price: 400, category: "Biochemistry", is_popular: true },
  { id: "lt-9", name: "Thyroid Stimulating Hormone (TSH)", name_bn: "থাইরয়েড হরমোন (TSH)", price: 650, category: "Immunology", is_popular: true },
  { id: "lt-10", name: "Serum Electrolytes (Na, K, Cl)", name_bn: "ইলেক্ট্রোলাইটস", price: 850, category: "Biochemistry", is_popular: true },
  { id: "lt-11", name: "Uric Acid", name_bn: "ইউরিক অ্যাসিড", price: 350, category: "Biochemistry", is_popular: true },
  { id: "lt-12", name: "Blood Grouping & Rh Factor", name_bn: "ব্লাড গ্রুপিং ও আরএইচ ফ্যাক্টর", price: 150, category: "Hematology", is_popular: true },
];

export const DEFAULT_LAB_CENTERS: LabCenter[] = [
  { id: "lc-1", name: "Popular Diagnostic Centre", type: "diagnostic", phone: "09613787801", address: "Dhanmondi, Dhaka", logo_url: null, division: "Dhaka", zilla: "Dhaka", upazilla: "Dhanmondi" },
  { id: "lc-2", name: "Ibn Sina Diagnostic Center", type: "diagnostic", phone: "09610009610", address: "Dhanmondi, Dhaka", logo_url: null, division: "Dhaka", zilla: "Dhaka", upazilla: "Dhanmondi" },
  { id: "lc-3", name: "Labaid Diagnostic", type: "diagnostic", phone: "10606", address: "Gulshan, Dhaka", logo_url: null, division: "Dhaka", zilla: "Dhaka", upazilla: "Gulshan" },
  { id: "lc-4", name: "Square Hospital Lab", type: "hospital", phone: "10616", address: "Panthapath, Dhaka", logo_url: null, division: "Dhaka", zilla: "Dhaka", upazilla: "Tejgaon" },
];

const LAB_TESTS_STORAGE_KEY = "sheikhpharma_cached_lab_tests";
const LAB_CENTERS_STORAGE_KEY = "sheikhpharma_cached_lab_centers";

const getStoredLabTests = (): LabTestItem[] => {
  if (typeof window === "undefined") return DEFAULT_LAB_TESTS;
  try {
    const raw = localStorage.getItem(LAB_TESTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_LAB_TESTS;
};

const getStoredLabCenters = (): LabCenter[] => {
  if (typeof window === "undefined") return DEFAULT_LAB_CENTERS;
  try {
    const raw = localStorage.getItem(LAB_CENTERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_LAB_CENTERS;
};

// Curated high-converting preventive health packages
interface HealthPackage {
  id: string;
  title: string;
  title_bn: string;
  subtitle: string;
  badge: string;
  regularPrice: number;
  offerPrice: number;
  reportTime: string;
  sampleType: string;
  includedKeywords: string[]; // matching keywords to look up actual tests
  highlights: string[];
}

const HEALTH_PACKAGES: HealthPackage[] = [
  {
    id: "pkg-full-body",
    title: "Full Body Wellness Profile",
    title_bn: "ফুল বডি প্রিমিয়াম চেকআপ",
    subtitle: "সার্বিক শারীরিক সুস্থতা ও ভাইটাল অর্গান মনিটরিং",
    badge: "সবচেয়ে জনপ্রিয়",
    regularPrice: 3250,
    offerPrice: 2350,
    reportTime: "২৪ ঘণ্টা",
    sampleType: "রক্ত ও প্রস্রাব",
    includedKeywords: ["CBC", "Creatinine", "Electrolytes", "TSH", "Glucose", "Urine R/E"],
    highlights: ["রক্তের সম্পূর্ণ চিত্র (CBC)", "কিডনি কার্যকারিতা (Creatinine)", "হরমোন ব্যালান্স (TSH)", "ইলেক্ট্রোলাইটস ও সুগার"],
  },
  {
    id: "pkg-diabetes",
    title: "Diabetes Care Profile",
    title_bn: "ডায়াবেটিস কমপ্লিট কেয়ার",
    subtitle: "সুগার লেভেল ও ডায়াবেটিস জনিত ঝুঁকি পর্যবেক্ষণ",
    badge: "৩০% সাশ্রয়",
    regularPrice: 2000,
    offerPrice: 1450,
    reportTime: "১২ ঘণ্টা",
    sampleType: "রক্ত ও প্রস্রাব",
    includedKeywords: ["Glucose", "Urine Microalbumin", "Electrolytes"],
    highlights: ["২ ঘণ্টা গ্লুকোজ টেস্ট", "কিডনি প্রটেকশন (Microalbumin)", "ইলেক্ট্রোলাইটস ব্যালান্স"],
  },
  {
    id: "pkg-cardiac",
    title: "Healthy Heart & Lipid Care",
    title_bn: "হার্ট ও কার্ডিয়াক স্ক্রিনিং",
    subtitle: "হৃদযন্ত্রের সুস্থতা ও লিপিড প্রোফাইল চেকআপ",
    badge: "বিশেষ ছাড়",
    regularPrice: 2500,
    offerPrice: 1850,
    reportTime: "২৪ ঘণ্টা",
    sampleType: "রক্ত",
    includedKeywords: ["Electrolytes", "Acid Total Phosphate"],
    highlights: ["ইলেক্ট্রোলাইটস পরীক্ষা", "কার্ডিয়াক মার্কার স্ক্রিনিং", "হার্ট রিস্ক অ্যাসেসমেন্ট"],
  },
  {
    id: "pkg-women",
    title: "Women's Wellness Profile",
    title_bn: "মহিলাদের বিশেষ হেলথ চেকআপ",
    subtitle: "থাইরয়েড, রক্তস্বল্পতা ও মেটাবলিক স্বাস্থ্য",
    badge: "নারী স্বাস্থ্য",
    regularPrice: 2250,
    offerPrice: 1650,
    reportTime: "২৪ ঘণ্টা",
    sampleType: "রক্ত ও প্রস্রাব",
    includedKeywords: ["CBC", "TSH", "Albumin", "Urine R/E"],
    highlights: ["হিমোগ্লোবিন ও রক্তস্বল্পতা", "থাইরয়েড হরমোন (TSH)", "প্রোটিন লেভেল ও ইউরিন"],
  },
];

export const CATEGORY_META_MAP: Record<
  string,
  {
    title_bn: string;
    subtitle: string;
    icon: any;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  Pathology: {
    title_bn: "রক্ত ও প্যাথলজি",
    subtitle: "CBC, অ্যালার্জি ও রুটিন ব্লাড",
    icon: Droplets,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50/80 dark:bg-rose-950/30",
    borderColor: "border-rose-200/60 dark:border-rose-900/40",
  },
  Biochemistry: {
    title_bn: "বায়োকেমিস্ট্রি ও সুগার",
    subtitle: "ইলেক্ট্রোলাইটস, সুগার, ফেরিটিন",
    icon: Zap,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50/80 dark:bg-amber-950/30",
    borderColor: "border-amber-200/60 dark:border-amber-900/40",
  },
  Hormone: {
    title_bn: "থাইরয়েড ও হরমোন",
    subtitle: "TSH, T3, T4, টেস্টোস্টেরন",
    icon: Activity,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50/80 dark:bg-purple-950/30",
    borderColor: "border-purple-200/60 dark:border-purple-900/40",
  },
  "Urine Test": {
    title_bn: "ইউরিন ও কিডনি ফাংশন",
    subtitle: "Urine R/E, C/S, ইউরিয়া, ক্রিয়েটিনিন",
    icon: Beaker,
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-50/80 dark:bg-sky-950/30",
    borderColor: "border-sky-200/60 dark:border-sky-900/40",
  },
  Cardiac: {
    title_bn: "হার্ট ও হৃদরোগ টেস্ট",
    subtitle: "ECG, 2D Echo, ETT, ডপলার",
    icon: HeartPulse,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50/80 dark:bg-red-950/30",
    borderColor: "border-red-200/60 dark:border-red-900/40",
  },
  USG: {
    title_bn: "আল্ট্রাসনোগ্রাম (USG)",
    subtitle: "হোল অ্যাবডোমেন, প্রেগন্যান্সি, থাইরয়েড",
    icon: Waves,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-50/80 dark:bg-teal-950/30",
    borderColor: "border-teal-200/60 dark:border-teal-900/40",
  },
  "CT Scan": {
    title_bn: "সিটি স্ক্যান (CT Scan)",
    subtitle: "ব্রেন, কন্ট্রাস্ট, KUB, অ্যাবডোমেন",
    icon: Scan,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50/80 dark:bg-indigo-950/30",
    borderColor: "border-indigo-200/60 dark:border-indigo-900/40",
  },
  MRI: {
    title_bn: "এমআরআই স্ক্যান (MRI)",
    subtitle: "ব্রেন, স্পাইন, অরবিট, MRCP",
    icon: Radio,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50/80 dark:bg-violet-950/30",
    borderColor: "border-violet-200/60 dark:border-violet-900/40",
  },
  "X-Ray": {
    title_bn: "ডিজিটাল এক্স-রে",
    subtitle: "চেস্ট, স্পাইন, IVU, ম্যামোগ্রাফি",
    icon: Bone,
    color: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-100 dark:bg-slate-800/60",
    borderColor: "border-slate-200/80 dark:border-slate-700/60",
  },
  Endoscopy: {
    title_bn: "এন্ডোস্কোপি ও স্পেশাল",
    subtitle: "এন্ডোস্কোপি, কলোনোস্কোপি, স্পাইরোমেট্রি",
    icon: Stethoscope,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50/80 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200/60 dark:border-emerald-900/40",
  },
  Immunology: {
    title_bn: "ইমিউনোলজি ও সেরোলজি",
    subtitle: "RA টেস্ট, রুবেলা, Rh অ্যান্টিবডি",
    icon: ShieldCheck,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50/80 dark:bg-cyan-950/30",
    borderColor: "border-cyan-200/60 dark:border-cyan-900/40",
  },
  Microbiology: {
    title_bn: "মাইক্রোবায়োলজি ও মল-কফ",
    subtitle: "সিমেন, স্টুল R/E, স্পুটাম AFB",
    icon: Microscope,
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-50/80 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200/60 dark:border-emerald-900/40",
  },
  "ICT Test": {
    title_bn: "আইসিটি র‍্যাপিড টেস্ট",
    subtitle: "ডেঙ্গু, ম্যালেরিয়া, কালাজ্বর, টিবি",
    icon: Sparkles,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50/80 dark:bg-orange-950/30",
    borderColor: "border-orange-200/60 dark:border-orange-900/40",
  },
  "PCR/Viral": {
    title_bn: "পিসিআর ও ভাইরাল লোড",
    subtitle: "HBV-DNA, HCV-RNA মলিকুলার",
    icon: Dna,
    color: "text-fuchsia-600 dark:text-fuchsia-400",
    bgColor: "bg-fuchsia-50/80 dark:bg-fuchsia-950/30",
    borderColor: "border-fuchsia-200/60 dark:border-fuchsia-900/40",
  },
};

export const getCategoryMeta = (cat: string) => {
  return (
    CATEGORY_META_MAP[cat] || {
      title_bn: cat,
      subtitle: `${cat} টেস্ট`,
      icon: Microscope,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20 hover:border-primary/50",
    }
  );
};

const LabTest = () => {
  const { addItem, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locState = location.state as { division?: string; zilla?: string; upazilla?: string } | null;

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [labTests, setLabTests] = useState<LabTestItem[]>(() => getStoredLabTests());
  const [loadingTests, setLoadingTests] = useState(false);
  const [showAllTestsList, setShowAllTestsList] = useState(false);
  const testsListRef = useRef<HTMLDivElement>(null);

  // Location handling (non-blocking, browse-first)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState(() => {
    if (locState?.division) return locState.division;
    try {
      const saved = localStorage.getItem("sheikhpharma_lab_location");
      if (saved) return JSON.parse(saved).division || "";
    } catch { /* ignore */ }
    return "Mymensingh"; // Sensible default for Sheikh Pharma headquarters
  });
  const [selectedZilla, setSelectedZilla] = useState(() => {
    if (locState?.zilla) return locState.zilla;
    try {
      const saved = localStorage.getItem("sheikhpharma_lab_location");
      if (saved) return JSON.parse(saved).zilla || "";
    } catch { /* ignore */ }
    return "Mymensingh";
  });
  const [selectedUpazilla, setSelectedUpazilla] = useState(() => {
    if (locState?.upazilla) return locState.upazilla;
    try {
      const saved = localStorage.getItem("sheikhpharma_lab_location");
      if (saved) return JSON.parse(saved).upazilla || "";
    } catch { /* ignore */ }
    return "Mymensingh Sadar";
  });

  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [labCenters, setLabCenters] = useState<LabCenter[]>(() => getStoredLabCenters());
  const [selectedCenter, setSelectedCenter] = useState<LabCenter | null>(null);
  const [selectedCenterType, setSelectedCenterType] = useState<string>("all");
  const [centerTestAssignments, setCenterTestAssignments] = useState<CenterTestAssignment[]>([]);

  // Prescription Upload Modal State
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [prescriptionUploading, setPrescriptionUploading] = useState(false);
  const [prescriptionSubmitting, setPrescriptionSubmitting] = useState(false);
  const [prescriptionUrl, setPrescriptionUrl] = useState("");
  const [prescriptionPreview, setPrescriptionPreview] = useState("");
  const [prescriptionForm, setPrescriptionForm] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Save location preference
    try {
      if (selectedDivision) {
        localStorage.setItem(
          "sheikhpharma_lab_location",
          JSON.stringify({ division: selectedDivision, zilla: selectedZilla, upazilla: selectedUpazilla })
        );
      }
    } catch { /* ignore */ }
  }, [selectedDivision, selectedZilla, selectedUpazilla]);

  useEffect(() => {
    try {
      (supabase.from("delivery_zones" as any) as any)
        .select("*")
        .eq("is_active", true)
        .then(({ data }: any) => {
          if (data && data.length > 0) setDeliveryZones(data as DeliveryZone[]);
        })
        .catch(() => {});

      (supabase.from("lab_tests" as any) as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .then(({ data }: any) => {
          if (data && data.length > 0) {
            setLabTests(data as LabTestItem[]);
            try {
              localStorage.setItem(LAB_TESTS_STORAGE_KEY, JSON.stringify(data));
            } catch {}
          }
        })
        .catch(() => {});

      (supabase.from("lab_centers" as any) as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .then(({ data }: any) => {
          if (data && data.length > 0) {
            setLabCenters(data as LabCenter[]);
            try {
              localStorage.setItem(LAB_CENTERS_STORAGE_KEY, JSON.stringify(data));
            } catch {}
          }
        })
        .catch(() => {});
    } catch {
      // Fallback already loaded
    }
  }, []);

  const divisions = useMemo(() => [...new Set(deliveryZones.map((z) => z.division))].sort(), [deliveryZones]);
  const zillas = useMemo(
    () => (selectedDivision ? [...new Set(deliveryZones.filter((z) => z.division === selectedDivision && z.zilla).map((z) => z.zilla!))].sort() : []),
    [deliveryZones, selectedDivision]
  );
  const upazillas = useMemo(
    () => (selectedZilla ? [...new Set(deliveryZones.filter((z) => z.division === selectedDivision && z.zilla === selectedZilla && z.upazilla).map((z) => z.upazilla!))].sort() : []),
    [deliveryZones, selectedDivision, selectedZilla]
  );

  const categories = useMemo(() => {
    const cats = [...new Set(labTests.map((t) => t.category).filter(Boolean))].sort();
    return cats;
  }, [labTests]);

  const matchedCenters = useMemo(() => {
    if (!selectedDivision) return labCenters;
    return labCenters.filter((c) => {
      if (c.division && c.division !== selectedDivision) return false;
      if (selectedZilla && c.zilla && c.zilla !== selectedZilla) return false;
      if (selectedUpazilla && c.upazilla && c.upazilla !== selectedUpazilla) return false;
      return true;
    });
  }, [labCenters, selectedDivision, selectedZilla, selectedUpazilla]);

  const centerTypeLabel = (t: string) => (t === "hospital" ? "Hospital" : t === "clinic" ? "Clinic" : "Diagnostic Center");

  const handleSelectCenter = async (center: LabCenter) => {
    setSelectedCenter(center);
    setSelectedTests(new Set());
    const { data } = await (supabase.from("lab_center_tests" as any) as any)
      .select("test_id, price, govt_price")
      .eq("center_id", center.id)
      .eq("is_active", true);
    setCenterTestAssignments((data || []) as CenterTestAssignment[]);
    toast.info(`${center.name} নির্বাচিত হয়েছে`);
  };

  const clearCenter = () => {
    setSelectedCenter(null);
    setCenterTestAssignments([]);
    setSelectedTests(new Set());
    toast.info("সব ল্যাব সেন্টারের টেস্ট দেখানো হচ্ছে");
  };

  const getTestPrice = (testId: string, defaultPrice: number) => {
    if (!selectedCenter) return defaultPrice;
    const a = centerTestAssignments.find((x) => x.test_id === testId);
    if (!a) return defaultPrice;
    if (a.govt_price && a.govt_price > 0) return a.govt_price;
    return a.price;
  };

  const isGovtRate = (testId: string) => {
    if (!selectedCenter) return false;
    const a = centerTestAssignments.find((x) => x.test_id === testId);
    return Boolean(a && a.govt_price && a.govt_price > 0);
  };

  const availableTests = useMemo(() => {
    if (!selectedCenter || centerTestAssignments.length === 0) return labTests;
    const assignedIds = new Set(centerTestAssignments.map((a) => a.test_id));
    return labTests.filter((t) => assignedIds.has(t.id));
  }, [labTests, selectedCenter, centerTestAssignments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return availableTests.filter((t) => {
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.name_bn && t.name_bn.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q));
      // When searching, search all available tests directly; otherwise respect selected category
      const matchCat = q ? true : selectedCategory === "all" || t.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [availableTests, search, selectedCategory]);

  const handleCategoryClick = (cat: string) => {
    if (selectedCategory === cat) {
      setSelectedCategory("all");
    } else {
      setSelectedCategory(cat);
      setSearch("");
      setTimeout(() => {
        testsListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  // Popular tests: If none flagged in DB, pick common essential tests like CBC, Creatinine, Electrolytes, TSH, Glucose, etc.
  const popularTests = useMemo(() => {
    const flagged = availableTests.filter((t) => t.is_popular);
    if (flagged.length > 0) return flagged;
    const topKeywords = ["cbc", "glucose", "creatinine", "tsh", "electrolytes", "urine r/e", "albumin"];
    return availableTests.filter((t) => topKeywords.some((k) => t.name.toLowerCase().includes(k))).slice(0, 8);
  }, [availableTests]);

  const toggleTest = (id: string) => {
    setSelectedTests((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
        const item = availableTests.find((x) => x.id === id);
        if (item) toast.success(`"${item.name}" তালিকায় যোগ করা হয়েছে`);
      }
      return n;
    });
  };

  // One-click booking for health packages
  const handleBookPackage = (pkg: HealthPackage) => {
    // Find tests matching the keywords in this package
    const matchingTestIds: string[] = [];
    pkg.includedKeywords.forEach((kw) => {
      const found = availableTests.find((t) => t.name.toLowerCase().includes(kw.toLowerCase()));
      if (found) matchingTestIds.push(found.id);
    });

    if (matchingTestIds.length > 0) {
      setSelectedTests((prev) => {
        const next = new Set(prev);
        matchingTestIds.forEach((id) => next.add(id));
        return next;
      });
      toast.success(`🎉 ${pkg.title_bn} এর টেস্টগুলো যুক্ত হয়েছে!`, {
        description: `${matchingTestIds.length} টি টেস্ট সিলেক্ট করা হয়েছে`,
      });
    } else {
      // Fallback: Add package as a single item directly to cart
      addItem({
        id: `lab-pkg-${pkg.id}`,
        name: `${pkg.title_bn} (${pkg.title})`,
        price: pkg.offerPrice,
        image_url: null,
      });
      toast.success(`🎉 ${pkg.title_bn} কার্টে যোগ হয়েছে!`);
      navigate("/checkout");
    }
  };

  const selectedList = useMemo(() => availableTests.filter((t) => selectedTests.has(t.id)), [availableTests, selectedTests]);
  const subtotal = useMemo(() => selectedList.reduce((s, t) => s + getTestPrice(t.id, t.price), 0), [selectedList, selectedCenter, centerTestAssignments]);

  const handleCheckout = () => {
    if (selectedTests.size === 0) {
      toast.error("অনুগ্রহ করে অন্তত একটি টেস্ট নির্বাচন করুন");
      return;
    }
    clearCart();
    setTimeout(() => {
      selectedList.forEach((t) => {
        addItem({
          id: `lab-${t.id}`,
          name: `${t.name}${t.name_bn ? ` (${t.name_bn})` : ""}${selectedCenter ? ` - ${selectedCenter.name}` : ""}`,
          price: getTestPrice(t.id, t.price),
          image_url: null,
        });
      });
      toast.success("ল্যাব টেস্ট কার্টে যোগ হয়েছে!");
      navigate("/checkout");
    }, 100);
  };

  // Prescription Upload Handler
  const handlePrescriptionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("ফাইলের সাইজ ১০ এমবি এর কম হতে হবে");
      return;
    }

    setPrescriptionUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const fileName = `lab-prescription-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from("prescriptions").upload(fileName, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

    if (error) {
      toast.error("প্রেসক্রিপশন আপলোড ব্যর্থ হয়েছে: " + error.message);
      setPrescriptionUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("prescriptions").getPublicUrl(fileName);
    setPrescriptionUrl(urlData.publicUrl);
    setPrescriptionPreview(urlData.publicUrl);
    setPrescriptionUploading(false);
    toast.success("প্রেসক্রিপশন সফলভাবে আপলোড হয়েছে!");
  };

  const handlePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionUrl) {
      toast.error("অনুগ্রহ করে প্রেসক্রিপশনের ছবি আপলোড করুন");
      return;
    }
    if (!prescriptionForm.name.trim()) {
      toast.error("অনুগ্রহ করে আপনার নাম লিখুন");
      return;
    }
    if (!prescriptionForm.phone.trim()) {
      toast.error("অনুগ্রহ করে মোবাইল নাম্বার লিখুন");
      return;
    }

    setPrescriptionSubmitting(true);
    const { error } = await (supabase.from("prescription_orders" as any) as any).insert({
      user_id: user?.id || null,
      customer_name: prescriptionForm.name.trim(),
      customer_phone: prescriptionForm.phone.trim(),
      customer_address: prescriptionForm.address.trim() || null,
      customer_division: selectedDivision || null,
      customer_zilla: selectedZilla || null,
      customer_upazilla: selectedUpazilla || null,
      prescription_url: prescriptionUrl,
      notes: `[Lab Test Request] ${prescriptionForm.notes ? prescriptionForm.notes.trim() : ""}`,
    });

    setPrescriptionSubmitting(false);

    if (error) {
      toast.error("বুকিং জমা দেওয়া সম্ভব হয়নি: " + error.message);
      return;
    }

    toast.success("ল্যাব টেস্টের জন্য প্রেসক্রিপশন জমা হয়েছে!", {
      description: "আমাদের প্রতিনিধি দ্রুত আপনার সাথে যোগাযোগ করবেন।",
    });

    setIsPrescriptionModalOpen(false);
    setPrescriptionUrl("");
    setPrescriptionPreview("");
    setPrescriptionForm({ name: "", phone: "", address: "", notes: "" });
  };

  const locationDisplay = [selectedUpazilla, selectedZilla, selectedDivision].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-5xl pb-52 md:pb-32">
        <div className="flex items-center justify-between gap-3 mb-4">
          <BackButton />

          {/* Compact, Classic Location Pill */}
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card hover:bg-muted/60 border border-border/80 hover:border-primary/50 text-xs font-medium text-foreground transition-all shadow-2xs hover:shadow-xs cursor-pointer"
          >
            <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MapPin className="h-3 w-3 text-primary shrink-0" />
            </div>
            <span className="text-muted-foreground font-normal hidden sm:inline text-[11px]">কালেকশন এলাকা:</span>
            <span className="font-bold text-foreground max-w-[140px] sm:max-w-[200px] truncate text-xs">
              {locationDisplay || "এলাকা নির্বাচন করুন"}
            </span>
            <span className="text-[11px] font-semibold text-primary group-hover:underline ml-0.5">পরিবর্তন</span>
          </button>
        </div>

        {/* TOP HERO & DIRECT ORDER SECTION ("YOU CAN ORDER VIA") */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-primary text-white p-4 sm:p-7 shadow-xl mb-6">
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 20% 30%, white 2px, transparent 2px), radial-gradient(circle at 80% 70%, white 2px, transparent 2px)",
              backgroundSize: "32px 32px, 48px 48px",
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] sm:text-xs font-semibold tracking-wide text-white border border-white/25 shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>ডোরস্টেপ হোম স্যাম্পল কালেকশন সার্ভিস</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                ঘরে বসেই ল্যাব টেস্ট করুন, সময় ও খরচ বাঁচান
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
                প্রশিক্ষিত ও সার্টিফাইড টেকনিশিয়ান (Phlebotomist) আপনার বাসায় এসে ব্যথাহীনভাবে স্যাম্পল সংগ্রহ করবেন। ১০০% নির্ভুল ও বিশ্বস্ত ল্যাব রিপোর্ট।
              </p>
            </div>

            {/* Quick Stat Badges */}
            <div className="flex md:flex-col gap-2 w-full md:w-auto shrink-0">
              <div className="flex-1 md:flex-initial flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-xs font-semibold shadow-2xs">
                <Clock className="h-4 w-4 text-emerald-300 shrink-0" />
                <span>১২-২৪ ঘণ্টায় রিপোর্ট</span>
              </div>
              <div className="flex-1 md:flex-initial flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-xs font-semibold shadow-2xs">
                <ShieldCheck className="h-4 w-4 text-amber-300 shrink-0" />
                <span>১০০% নিরাপদ ও স্টেরাইল</span>
              </div>
            </div>
          </div>

          {/* THREE CONVERSION CTA CARDS */}
          <div className="relative z-10 mt-6 pt-5 border-t border-white/20">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-3 flex items-center gap-1.5">
              <span>সহজ উপায়ে অর্ডার করুন (ORDER VIA)</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* WhatsApp Button */}
              <a
                href={`https://wa.me/8801712472839?text=${encodeURIComponent("আসসালামু আলাইকুম Sheikh Pharma, আমি ঘরে বসে ল্যাব টেস্ট বুক করতে চাই / প্রেসক্রিপশন পাঠাতে চাই।")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl bg-white hover:bg-emerald-50 text-gray-900 shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
              >
                <div className="h-11 w-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform shrink-0">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-extrabold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      WhatsApp-এ অর্ডার
                    </span>
                    <ChevronRight className="h-4 w-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-[11px] text-gray-600 truncate">প্রেসক্রিপশন পাঠান বা চ্যাট করুন</p>
                  <p className="text-[11px] font-bold text-emerald-700">01712-472839</p>
                </div>
              </a>

              {/* Direct Call Button */}
              <a
                href="tel:01712472839"
                className="group flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl bg-white hover:bg-blue-50 text-gray-900 shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
              >
                <div className="h-11 w-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform shrink-0">
                  <Phone className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors">
                      সরাসরি কল দিন
                    </span>
                    <ChevronRight className="h-4 w-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-[11px] text-gray-600 truncate">জরুরি টেস্ট বুকিং সহায়তা</p>
                  <p className="text-[11px] font-bold text-blue-700">01712-472839</p>
                </div>
              </a>

              {/* Prescription Upload Button */}
              <button
                type="button"
                onClick={() => setIsPrescriptionModalOpen(true)}
                className="group flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl bg-white hover:bg-purple-50 text-gray-900 shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98] text-left"
              >
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30 group-hover:scale-105 transition-transform shrink-0">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-extrabold text-gray-900 group-hover:text-purple-700 transition-colors">
                      প্রেসক্রিপশন আপলোড
                    </span>
                    <ChevronRight className="h-4 w-4 text-purple-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-[11px] text-gray-600 truncate">ডাক্তারের স্লিপের ছবি দিন</p>
                  <p className="text-[11px] font-bold text-purple-700">১ ক্লিকে বুক করুন</p>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* CURATED HEALTH PACKAGES SECTION */}
        <section className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-extrabold text-foreground flex items-center gap-1.5">
                  <HeartPulse className="h-5 w-5 text-rose-500" />
                  জনপ্রিয় স্বাস্থ্য চেকআপ প্যাকেজ (Health Packages)
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-2xs">
                  <Sparkles className="h-3 w-3 text-rose-500" />
                  Save Up to 35%
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                সম্পূর্ণ বডি ও প্রিভেন্টিভ স্ক্রিনিং প্যাকেজে সাশ্রয়ী মূল্যে টেস্ট করান
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HEALTH_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 p-4 overflow-hidden"
              >
                {/* Top badge */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 shadow-2xs">
                    <Sparkles className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                    {pkg.badge}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/60">
                    <Clock className="h-2.5 w-2.5 text-emerald-600" /> {pkg.reportTime}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {pkg.title_bn}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium mb-3 line-clamp-1">{pkg.subtitle}</p>

                  <div className="space-y-1.5 mb-4 py-2 border-y border-dashed border-border/80">
                    {pkg.highlights.map((h, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-foreground/90">
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-lg font-black text-primary">৳{pkg.offerPrice}</span>
                    <span className="text-xs text-muted-foreground line-through">৳{pkg.regularPrice}</span>
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/40">
                      -{Math.round(((pkg.regularPrice - pkg.offerPrice) / pkg.regularPrice) * 100)}%
                    </span>
                  </div>

                  <Button
                    onClick={() => handleBookPackage(pkg)}
                    className="w-full font-bold text-xs h-9 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    প্যাকেজ বুক করুন
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* NEARBY LAB CENTERS (IF ANY MATCH) */}
        {matchedCenters.length > 0 && (
          <section className="mb-6 rounded-2xl border bg-card/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-extrabold text-foreground">
                  নিকটস্থ ডায়াগনস্টিক পার্টনার ল্যাব
                </h2>
                <span className="text-xs text-muted-foreground font-medium">({matchedCenters.length} টি)</span>
              </div>
              {selectedCenter && (
                <button onClick={clearCenter} className="text-xs text-destructive font-bold hover:underline">
                  সব ল্যাব দেখুন
                </button>
              )}
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {matchedCenters.map((c) => {
                const isSelected = selectedCenter?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => (isSelected ? clearCenter() : handleSelectCenter(c))}
                    className={`flex-shrink-0 w-64 border rounded-xl p-3 bg-card transition-all text-left shadow-2xs ${
                      isSelected ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/30" : "border-border/80 hover:border-primary/40 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt={c.name} className="h-10 w-10 rounded-lg object-cover border" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate text-foreground">{c.name}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-primary/10 text-primary border border-primary/20">
                          {centerTypeLabel(c.type)}
                        </span>
                      </div>
                    </div>
                    {c.address && <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1">{c.address}</p>}
                    <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                      {c.phone ? (
                        <span className="flex items-center gap-1 font-bold text-primary">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">অফিসিয়াল পার্টনার</span>
                      )}
                      <span className="text-[10px] font-bold text-primary">
                        {isSelected ? "✓ সিলেক্টেড" : "টেস্ট দেখুন →"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* TEST SEARCH BAR */}
        <section className="mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="১২৩টি টেস্টের মধ্যে সার্চ করুন (যেমন: CBC, Sugar, TSH, ECG, USG, X-Ray, CT Scan, Urea...)..."
                className="pl-10 pr-10 h-12 rounded-xl border-2 border-primary/25 focus:border-primary text-xs sm:text-sm font-semibold shadow-xs bg-card"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                  title="মুছে ফেলুন"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick Find Centers Button when tests selected */}
            {selectedTests.size > 0 && (
              <Button
                onClick={() => {
                  const testNames = availableTests.filter((t) => selectedTests.has(t.id)).map((t) => t.name);
                  navigate("/lab-test/centers", {
                    state: {
                      testIds: [...selectedTests],
                      testNames,
                      division: selectedDivision,
                      zilla: selectedZilla,
                      upazilla: selectedUpazilla,
                    },
                  });
                }}
                className="font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white shadow-md h-12 px-4 text-xs shrink-0 rounded-xl"
              >
                <Building2 className="h-4 w-4 mr-1.5" />
                সেন্টার খুঁজুন ({selectedTests.size})
              </Button>
            )}
          </div>

          {/* Search Result Header info */}
          {search && (
            <div className="mt-3 flex items-center justify-between text-xs px-1">
              <span className="font-bold text-foreground">
                🔍 "{search}" এর জন্য <span className="text-primary font-black">{filtered.length}টি</span> টেস্ট পাওয়া গেছে
              </span>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-primary font-bold hover:underline cursor-pointer"
              >
                ✕ সার্চ মুছুন
              </button>
            </div>
          )}
        </section>

        {/* 14 CATEGORY SELECTION CARDS (JAR JETA LAGBE CHOISE KORBE) */}
        {!search && (
          <section className="mb-8">
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-foreground flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  ক্যাটাগরি অনুযায়ী টেস্ট বেছে নিন
                </h2>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  যার যে বিভাগের টেস্ট লাগবে সেই কার্ডে ক্লিক করে সহজেই টেস্ট খুঁজে নিন
                </p>
              </div>

              {selectedCategory !== "all" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategory("all")}
                  className="text-xs font-bold border-primary/40 text-primary hover:bg-primary hover:text-white rounded-xl shrink-0"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  সব ক্যাটাগরি ({availableTests.length})
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
              {categories.map((cat) => {
                const meta = getCategoryMeta(cat);
                const IconComp = meta.icon;
                const count = availableTests.filter((t) => t.category === cat).length;
                const isSelected = selectedCategory === cat;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryClick(cat)}
                    className={`group relative flex flex-col items-center text-center p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "border-primary bg-gradient-to-b from-primary/[0.08] via-primary/[0.03] to-card shadow-md ring-1 ring-primary/30 scale-[1.02]"
                        : "border-border/70 bg-card hover:bg-muted/30 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 shadow-2xs"
                    }`}
                  >
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center mb-2.5 transition-all duration-300 group-hover:scale-110 shadow-2xs border ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                          : `${meta.bgColor} ${meta.color} ${meta.borderColor}`
                      }`}
                    >
                      <IconComp className="h-5 w-5" />
                    </div>

                    <p className="text-xs sm:text-sm font-extrabold text-foreground leading-tight line-clamp-1 mb-0.5 group-hover:text-primary transition-colors">
                      {meta.title_bn}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium truncate max-w-full">
                      {cat}
                    </p>

                    <span
                      className={`mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs border border-primary/40"
                          : "bg-muted/60 text-muted-foreground border border-border/60 group-hover:border-primary/30 group-hover:text-foreground group-hover:bg-primary/[0.04]"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSelected ? "bg-white animate-pulse" : "bg-emerald-500"}`} />
                      <span>{count} টি টেস্ট</span>
                    </span>

                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* TESTS DISPLAY SECTION */}
        <section ref={testsListRef} id="tests-list-container" className="mb-8 scroll-mt-20">
          {/* Active Category Header Banner */}
          {!search && selectedCategory !== "all" && (() => {
            const activeMeta = getCategoryMeta(selectedCategory);
            const ActiveIcon = activeMeta.icon;
            return (
              <div className="mb-5 p-4 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/[0.06] via-primary/[0.03] to-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-primary text-primary-foreground border border-primary/30 shrink-0 shadow-sm shadow-primary/20">
                    <ActiveIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                        {activeMeta.title_bn}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {selectedCategory}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        • {filtered.length} টি টেস্ট উপলব্ধ
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeMeta.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCategory("all")}
                    className="font-bold text-xs rounded-xl border-border hover:border-primary/40 text-foreground hover:bg-primary hover:text-white transition-all"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    সব ক্যাটাগরি দেখুন ({availableTests.length})
                  </Button>
                </div>
              </div>
            );
          })()}

          {/* Horizontal Quick Switch Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide p-1.5 bg-muted/40 dark:bg-muted/20 rounded-2xl border border-border/50">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-foreground text-background shadow-xs font-bold"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-card/90 border border-border/60 shadow-2xs font-medium"
              }`}
            >
              <Beaker className="h-3.5 w-3.5" />
              <span>সকল টেস্ট</span>
              <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedCategory === "all" ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
              }`}>
                {availableTests.length}
              </span>
            </button>
            {categories.map((cat) => {
              const count = availableTests.filter((t) => t.category === cat).length;
              const isCatSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    isCatSelected
                      ? "bg-foreground text-background shadow-xs font-bold"
                      : "bg-card text-muted-foreground hover:text-foreground hover:bg-card/90 border border-border/60 shadow-2xs font-medium"
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isCatSelected ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Header test count */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
              <Microscope className="h-4 w-4 text-primary" />
              {search
                ? `সার্চ রেজাল্ট (${filtered.length})`
                : selectedCategory === "all"
                ? "টেস্ট তালিকা"
                : `${selectedCategory} এর টেস্টসমূহ (${filtered.length})`}
            </h2>

            {selectedTests.size > 0 && (
              <button
                onClick={() => setSelectedTests(new Set())}
                className="text-xs font-bold text-destructive hover:underline cursor-pointer"
              >
                সিলেকশন মুছুন ({selectedTests.size})
              </button>
            )}
          </div>

          {/* Loading state */}
          {loadingTests ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm font-medium">টেস্ট তালিকা লোড হচ্ছে...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/20">
              <Microscope className="h-10 w-10 mx-auto mb-2 text-muted-foreground/60" />
              <p className="text-sm font-bold text-foreground">কোনো টেস্ট পাওয়া যায়নি</p>
              <p className="text-xs text-muted-foreground mt-1">
                অন্য কোনো কিওয়ার্ড দিয়ে চেষ্টা করুন বা সরাসরি আমাদের মেডিকেল টিমে ফোন দিন
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                  }}
                >
                  সব টেস্ট দেখুন
                </Button>
                <a href="tel:01712472839">
                  <Button size="sm" className="bg-primary text-white">
                    <Phone className="h-3.5 w-3.5 mr-1" /> কল দিয়ে সাহায্য চাই
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* IF "ALL" IS SELECTED AND NO SEARCH: SHOW TOP POPULAR TESTS FIRST */}
              {!search && selectedCategory === "all" && popularTests.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs sm:text-sm font-extrabold text-foreground flex items-center gap-1.5">
                      <span>🔥 সর্বাধিক বুকড ও প্রয়োজনীয় টেস্টসমূহ</span>
                    </h3>
                    <span className="text-[11px] text-muted-foreground font-semibold">
                      (Top Recommended)
                    </span>
                  </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {popularTests.map((t) => {
                      const isSelected = selectedTests.has(t.id);
                      const price = getTestPrice(t.id, t.price);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleTest(t.id)}
                          className={`flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-200 text-left cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/[0.06] shadow-sm ring-1 ring-primary/30"
                              : "border-border/80 bg-card hover:border-primary/40 hover:shadow-xs shadow-2xs"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                                <span className="h-1 w-1 rounded-full bg-primary" />
                                {t.category || "ল্যাব"}
                              </span>
                              {isSelected && (
                                <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-extrabold text-foreground line-clamp-1">{t.name}</p>
                            {t.name_bn && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{t.name_bn}</p>}
                          </div>

                          <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between">
                            <span className="text-sm font-black text-primary">৳{price}</span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground shadow-2xs"
                                : "bg-muted/80 hover:bg-primary hover:text-white text-foreground"
                            }`}>
                              {isSelected ? "✓ নির্বাচিত" : "+ যোগ"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* COLLAPSIBLE BANNER FOR ALL 123 TESTS (WHEN "ALL" & NO SEARCH) */}
              {!search && selectedCategory === "all" && (
                <div className="mb-6 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 sm:p-5 text-center">
                  <Layers className="h-7 w-7 text-primary mx-auto mb-2" />
                  <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                    সকল ১২৩টি টেস্টের সম্পূর্ণ তালিকা দেখতে চান?
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    নির্দিষ্ট টেস্ট পেতে উপরের ক্যাটাগরি কার্ড অথবা সার্চবার ব্যবহার করুন, অথবা নিচে ক্লিক করে সব টেস্ট একসাথে এক্সপ্লোর করুন।
                  </p>
                  <Button
                    onClick={() => setShowAllTestsList(!showAllTestsList)}
                    variant="outline"
                    className="mt-3 font-bold text-xs sm:text-sm h-10 px-5 rounded-xl border-2 border-primary text-primary hover:bg-primary hover:text-white shadow-xs"
                  >
                    {showAllTestsList ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1.5" />
                        তালিকা সংক্ষেপ করুন (Hide Full List)
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1.5" />
                        সকল ১২৩টি টেস্ট একসাথে দেখুন ({availableTests.length})
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* TESTS CARDS GRID (RENDERED WHEN: SEARCH ACTIVE, OR CATEGORY SELECTED, OR USER EXPANDED ALL TESTS) */}
              {(search || selectedCategory !== "all" || showAllTestsList) && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map((t) => {
                      const isSelected = selectedTests.has(t.id);
                      const price = getTestPrice(t.id, t.price);
                      const isGovt = isGovtRate(t.id);

                      return (
                        <div
                          key={t.id}
                          className={`flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 ${
                            isSelected
                              ? "border-primary bg-gradient-to-b from-primary/[0.06] to-card shadow-sm ring-1 ring-primary/30"
                              : "border-border/80 bg-card hover:border-primary/40 hover:shadow-xs shadow-2xs"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1.5 mb-2.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                                <span className="h-1 w-1 rounded-full bg-primary" />
                                {t.category || "Pathology"}
                              </span>
                              <div className="flex items-center gap-1.5 ml-auto">
                                {isGovt && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 shadow-2xs">
                                    <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" /> সরকারি রেট
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/60">
                                  <Clock className="h-2.5 w-2.5 text-emerald-600" /> ১২-২৪ ঘণ্টা
                                </span>
                              </div>
                            </div>

                            <h3 className="text-sm font-bold text-foreground leading-snug">{t.name}</h3>
                            {t.name_bn && <p className="text-xs text-muted-foreground mt-0.5">{t.name_bn}</p>}

                            <div className="flex items-center gap-2 mt-2.5 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3 text-emerald-500" /> হোম কালেকশন
                              </span>
                              <span>•</span>
                              <span>নির্ভুল ল্যাব রিপোর্ট</span>
                            </div>
                          </div>

                          <div className="mt-3.5 pt-2.5 border-t border-border/60 flex items-center justify-between">
                            <div>
                              <span className="text-base font-black text-primary">৳{price}</span>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => toggleTest(t.id)}
                              className={`h-8 px-3 rounded-xl font-bold text-xs transition-all ${
                                isSelected
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "bg-muted/80 hover:bg-primary hover:text-primary-foreground text-foreground"
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="h-3.5 w-3.5 mr-1" /> নির্বাচিত
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3.5 w-3.5 mr-1" /> যোগ করুন
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Collapse Button if viewing all tests in expanded mode */}
                  {!search && selectedCategory === "all" && showAllTestsList && (
                    <div className="mt-6 text-center">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAllTestsList(false);
                          testsListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="font-bold text-xs rounded-xl border-primary text-primary hover:bg-primary hover:text-white"
                      >
                        <ChevronUp className="h-4 w-4 mr-1.5" />
                        তালিকা সংক্ষেপ করুন (Collapse List)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>

        {/* HOW IT WORKS (ঘরে বসে টেস্টের ৪টি সহজ ধাপ) */}
        <section className="mb-8 rounded-2xl bg-gradient-to-br from-muted/60 via-card to-muted/40 p-5 sm:p-6 border border-border">
          <div className="text-center max-w-lg mx-auto mb-6">
            <h2 className="text-base sm:text-xl font-extrabold text-foreground">
              ঘরে বসে ল্যাব টেস্টের ৪টি সহজ ধাপ
            </h2>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              হাসপাতালে বা ডায়াগনস্টিকে দীর্ঘ লাইনে দাঁড়িয়ে থাকার ঝামেলা ছাড়াই পান নিরাপদ সেবা
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start gap-3 bg-card p-3.5 rounded-xl border border-border shadow-2xs">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black text-sm shrink-0">
                ০১
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">টেস্ট নির্বাচন বা স্লিপ দিন</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  অনলাইনে টেস্ট বেছে নিন অথবা হোয়াটসঅ্যাপে প্রেসক্রিপশন পাঠান।
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-card p-3.5 rounded-xl border border-border shadow-2xs">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-sm shrink-0">
                ০২
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">হোম স্যাম্পল কালেকশন</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  দক্ষ ফ্লেবোটোমিস্ট আপনার বাসায় গিয়ে নিরাপদভাবে স্যাম্পল সংগ্রহ করবেন।
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-card p-3.5 rounded-xl border border-border shadow-2xs">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-black text-sm shrink-0">
                ০৩
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">স্বীকৃত ল্যাবে পরীক্ষা</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  পপুলার ও টপ ডায়াগনস্টিক সেন্টারের সর্বাধুনিক মেশিনে নির্ভুল টেস্ট সম্পন্ন।
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-card p-3.5 rounded-xl border border-border shadow-2xs">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-black text-sm shrink-0">
                ০৪
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">ডিজিটাল রিপোর্ট ডেলিভারি</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  রিপোর্ট প্রস্তুত হওয়া মাত্রই হোয়াটসঅ্যাপ বা অ্যাপে সরাসরি পিডিএফ পেয়ে যাবেন।
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST & SAFETY GUARANTEE */}
        <section className="mb-4 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="flex flex-col items-center">
              <ShieldCheck className="h-6 w-6 text-primary mb-1" />
              <p className="text-xs font-bold text-foreground">১০০% স্টেরাইল কিট</p>
              <p className="text-[10px] text-muted-foreground">একবার ব্যবহারযোগ্য নিডল</p>
            </div>
            <div className="flex flex-col items-center">
              <Activity className="h-6 w-6 text-primary mb-1" />
              <p className="text-xs font-bold text-foreground">কোল্ড চেইন পরিবহন</p>
              <p className="text-[10px] text-muted-foreground">তাপমাত্রা নিয়ন্ত্রিত স্যাম্পল বক্স</p>
            </div>
            <div className="flex flex-col items-center">
              <Microscope className="h-6 w-6 text-primary mb-1" />
              <p className="text-xs font-bold text-foreground">স্বীকৃত পার্টনার ল্যাব</p>
              <p className="text-[10px] text-muted-foreground">মাননিয়ন্ত্রিত আন্তর্জাতিক স্ট্যান্ডার্ড</p>
            </div>
            <div className="flex flex-col items-center">
              <Phone className="h-6 w-6 text-primary mb-1" />
              <p className="text-xs font-bold text-foreground">২৪/৭ কাস্টমার সাপোর্ট</p>
              <p className="text-[10px] text-muted-foreground">মেডিকেল টিমের সরাসরি পরামর্শ</p>
            </div>
          </div>
        </section>
      </main>

      {/* FLOATING BOTTOM CHECKOUT DOCK */}
      {selectedTests.size > 0 && (
        <div className="fixed bottom-[74px] md:bottom-0 left-2 right-2 md:left-0 md:right-0 z-40 bg-card/95 backdrop-blur-md border-2 md:border-t-2 md:border-x-0 md:border-b-0 border-primary/40 rounded-2xl md:rounded-none p-2.5 sm:p-4 shadow-2xl transition-all animate-in slide-in-from-bottom duration-200">
          <div className="container mx-auto max-w-4xl flex items-center justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-extrabold text-foreground truncate">
                  {selectedTests.size} টি টেস্ট নির্বাচিত
                </span>
                <button
                  onClick={() => setSelectedTests(new Set())}
                  className="text-[10px] sm:text-[11px] font-bold text-destructive hover:underline"
                >
                  ক্লিয়ার
                </button>
              </div>
              <p className="text-sm sm:text-lg font-black text-primary">
                মোট: ৳{subtotal}
              </p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const testNames = availableTests.filter((t) => selectedTests.has(t.id)).map((t) => t.name);
                  navigate("/lab-test/centers", {
                    state: {
                      testIds: [...selectedTests],
                      testNames,
                      division: selectedDivision,
                      zilla: selectedZilla,
                      upazilla: selectedUpazilla,
                    },
                  });
                }}
                className="font-bold text-[11px] sm:text-xs h-9 sm:h-10 px-2.5 sm:px-3 border-primary/40 hover:bg-primary/10"
              >
                <Building2 className="h-3.5 w-3.5 mr-1 text-primary hidden xs:inline" />
                সেন্টার
              </Button>

              <Button
                onClick={handleCheckout}
                className="font-extrabold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white shadow-lg h-9 sm:h-10 px-3 sm:px-5 text-xs sm:text-sm rounded-xl"
              >
                <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                বুকিং সম্পন্ন করুন
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LOCATION SELECTION MODAL */}
      <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-foreground">
              <MapPin className="h-5 w-5 text-primary" />
              স্যাম্পল কালেকশনের এলাকা নির্বাচন করুন
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              আপনার বিভাগ ও জেলা নির্বাচন করুন যাতে সঠিক পার্টনার ল্যাব ও রেট দেখানো যায়
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="font-bold text-xs">Division (বিভাগ) *</Label>
              <Select
                value={selectedDivision}
                onValueChange={(v) => {
                  setSelectedDivision(v);
                  setSelectedZilla("");
                  setSelectedUpazilla("");
                }}
              >
                <SelectTrigger className="h-10 rounded-xl border font-medium">
                  <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {divisions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDivision && zillas.length > 0 && (
              <div className="space-y-1.5">
                <Label className="font-bold text-xs">Zilla (জেলা) *</Label>
                <Select
                  value={selectedZilla}
                  onValueChange={(v) => {
                    setSelectedZilla(v);
                    setSelectedUpazilla("");
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border font-medium">
                    <SelectValue placeholder="জেলা নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {zillas.map((z) => (
                      <SelectItem key={z} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedZilla && upazillas.length > 0 && (
              <div className="space-y-1.5">
                <Label className="font-bold text-xs">Upazilla (উপজেলা)</Label>
                <Select value={selectedUpazilla} onValueChange={setSelectedUpazilla}>
                  <SelectTrigger className="h-10 rounded-xl border font-medium">
                    <SelectValue placeholder="উপজেলা নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {upazillas.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLocationModalOpen(false)}
              className="rounded-xl font-bold text-xs"
            >
              বাতিল
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsLocationModalOpen(false);
                toast.success("লোকেশন আপডেট করা হয়েছে!");
              }}
              className="bg-primary text-white rounded-xl font-bold text-xs px-5"
            >
              নিশ্চিত করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PRESCRIPTION UPLOAD MODAL */}
      <Dialog open={isPrescriptionModalOpen} onOpenChange={setIsPrescriptionModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-foreground">
              <Upload className="h-5 w-5 text-primary" />
              ল্যাব টেস্টের প্রেসক্রিপশন আপলোড করুন
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              ডাক্তারের টেস্ট স্লিপের স্পষ্ট ছবি দিন। আমাদের ফার্মাসিস্ট টেস্টগুলো বুক করে কনফার্ম করবেন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePrescriptionSubmit} className="space-y-3.5 py-1">
            {/* File drop area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${
                prescriptionPreview
                  ? "border-emerald-500/60 bg-emerald-50/20"
                  : "border-primary/30 hover:border-primary/60 bg-primary/5"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handlePrescriptionFileChange}
              />

              {prescriptionUploading ? (
                <div className="py-6 flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-xs font-bold text-foreground">প্রেসক্রিপশন আপলোড হচ্ছে...</p>
                </div>
              ) : prescriptionPreview ? (
                <div className="flex flex-col items-center">
                  <img
                    src={prescriptionPreview}
                    alt="Prescription preview"
                    className="h-32 object-contain rounded-lg border shadow-xs mb-2"
                  />
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> ছবি আপলোড সফল হয়েছে (পরিবর্তন করতে ক্লিক করুন)
                  </p>
                </div>
              ) : (
                <div className="py-4 flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-extrabold text-foreground">ক্যামেরা দিয়ে ছবি তুলুন বা ফাইল নির্বাচন করুন</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG, PDF ফাইল সাপোর্ট করে (সর্বোচ্চ ১০ এমবি)</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">রোগীর নাম (Name) *</Label>
                <Input
                  required
                  placeholder="যেমন: মোঃ করিম"
                  value={prescriptionForm.name}
                  onChange={(e) => setPrescriptionForm((p) => ({ ...p, name: e.target.value }))}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">মোবাইল নাম্বার (Phone) *</Label>
                <Input
                  required
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={prescriptionForm.phone}
                  onChange={(e) => setPrescriptionForm((p) => ({ ...p, phone: e.target.value }))}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">স্যাম্পল সংগ্রহের পূর্ণ ঠিকানা (Address)</Label>
              <Input
                placeholder="বাসা, রোড, এলাকা..."
                value={prescriptionForm.address}
                onChange={(e) => setPrescriptionForm((p) => ({ ...p, address: e.target.value }))}
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">কোনো বিশেষ টেস্ট বা নোট (ঐচ্ছিক)</Label>
              <Textarea
                rows={2}
                placeholder="যেমন: সকালে ফাস্টিং স্যাম্পল কালেকশন করতে হবে..."
                value={prescriptionForm.notes}
                onChange={(e) => setPrescriptionForm((p) => ({ ...p, notes: e.target.value }))}
                className="rounded-xl text-xs resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t">
              <a
                href={`https://wa.me/8801712472839?text=${encodeURIComponent("আসসালামু আলাইকুম Sheikh Pharma, আমি প্রেসক্রিপশন পাঠিয়ে সরাসরি টেস্ট বুক করতে চাই।")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <MessageCircle className="h-4 w-4" /> হোয়াটসঅ্যাপে পাঠান
              </a>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPrescriptionModalOpen(false)}
                  className="rounded-xl font-bold text-xs"
                >
                  বাতিল
                </Button>
                <Button
                  type="submit"
                  disabled={prescriptionSubmitting || prescriptionUploading}
                  size="sm"
                  className="bg-primary text-white rounded-xl font-bold text-xs px-4"
                >
                  {prescriptionSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> জমা হচ্ছে...
                    </>
                  ) : (
                    "বুকিং জমা দিন"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default LabTest;
