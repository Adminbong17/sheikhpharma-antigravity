import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Store, ChevronRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { useLanguage } from "@/contexts/LanguageContext";

const CARD_COLORS = [
  "border-blue-500", "border-green-500", "border-red-500", "border-yellow-500",
  "border-purple-500", "border-pink-500", "border-teal-500", "border-orange-500",
  "border-indigo-500", "border-cyan-500",
];

const TopVendors = () => {
  const { b } = useLanguage();
  const { data: vendors = [] } = useQuery({
    queryKey: ["homepage-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, store_name, logo_url")
        .eq("status", "approved")
        .order("total_earnings", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  if (vendors.length === 0) return null;

  const items = [...vendors, ...vendors];

  return (
    <ScrollReveal>
      <section className="py-8 overflow-hidden">
        <div className="container mx-auto px-4 mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{b("শীর্ষ ভেন্ডর ও ফার্মেসি", "Shop by Top Vendor")}</h2>
          <Link
            to="/vendors"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {b("সব দেখুন", "See All")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="relative group overflow-hidden">
          <div className="flex animate-scroll-fast gap-4 w-max group-hover:[animation-play-state:paused]">
            {items.map((v, i) => (
              <Link
                key={`${v.id}-${i}`}
                to={`/store/${v.id}`}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 ${CARD_COLORS[i % CARD_COLORS.length]} bg-card p-4 min-w-[120px] shadow-sm transition hover:shadow-md hover:-translate-y-0.5`}
              >
                {v.logo_url ? (
                  <img
                    src={v.logo_url}
                    alt={v.store_name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                )}
                <span className="text-xs font-medium text-center leading-tight max-w-[100px] truncate">
                  {v.store_name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
};

export default TopVendors;
