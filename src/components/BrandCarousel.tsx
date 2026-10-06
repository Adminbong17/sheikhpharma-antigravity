import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { useLanguage } from "@/contexts/LanguageContext";

const CARD_COLORS = [
  "border-red-500", "border-teal-500", "border-purple-500", "border-orange-500",
  "border-blue-500", "border-pink-500", "border-green-500", "border-yellow-500",
  "border-indigo-500", "border-cyan-500",
];

const BrandCarousel = () => {
  const { b } = useLanguage();
  const { data: brands = [] } = useQuery({
    queryKey: ["homepage-brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("status", "approved")
        .order("name");
      if (error) throw error;
      return (data || []).filter((b: any) => b.is_active !== false && Boolean(b.logo_url && b.logo_url.trim() !== ""));
    },
  });

  if (brands.length === 0) return null;

  const items = [...brands, ...brands];

  return (
    <ScrollReveal>
      <section className="py-8 overflow-hidden">
        <div className="container mx-auto px-4 mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{b("জনপ্রিয় ব্র্যান্ডসমূহ", "Shop by Brand")}</h2>
          <Link to="/brands">
            <Button variant="outline" size="sm" className="gap-1">
              {b("সব দেখুন", "See All")} <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="relative group overflow-hidden">
          <div className="flex animate-scroll gap-4 w-max group-hover:[animation-play-state:paused]">
            {items.map((b_item: any, i) => (
              <Link
                key={`${b_item.id}-${i}`}
                to={`/brand/${b_item.id}`}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 ${CARD_COLORS[i % CARD_COLORS.length]} bg-card p-4 min-w-[120px] shadow-sm transition hover:shadow-md hover:-translate-y-0.5`}
              >
                {b_item.logo_url ? (
                  <img src={b_item.logo_url} alt={b_item.name} className="h-12 w-12 rounded-lg object-contain" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                    {b_item.name[0]}
                  </div>
                )}
                <span className="text-xs font-medium text-center leading-tight">{b_item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
};

export default BrandCarousel;
