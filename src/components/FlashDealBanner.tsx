import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, ChevronRight } from "lucide-react";

const FlashDealBanner = () => {
  const { data: activeDeal } = useQuery({
    queryKey: ["active-flash-deal"],
    queryFn: async () => {
      const { data } = await (supabase
        .from("flash_deals" as any)
        .select("*")
        .eq("is_active", true)
        .gt("end_time", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single() as any);
      return data;
    },
    refetchInterval: 60000,
  });

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!activeDeal) return;
    const calc = () => {
      const diff = new Date(activeDeal.end_time).getTime() - Date.now();
      if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 };
      return {
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      };
    };
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [activeDeal]);

  if (!activeDeal) return null;
  if (timeLeft.hours <= 0 && timeLeft.minutes <= 0 && timeLeft.seconds <= 0) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const color = (activeDeal as any).banner_color || "#ef4444";

  return (
    <section className="container mx-auto px-4 py-4">
      <Link to="/flash-deals" className="block">
        <div
          className="relative overflow-hidden rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 transition hover:shadow-lg hover:scale-[1.005] group"
          style={{ border: `2px solid ${color}`, background: `linear-gradient(135deg, ${color}08, transparent, ${color}08)` }}
        >
          {/* Decorative pulse */}
          <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full blur-2xl animate-pulse" style={{ backgroundColor: `${color}18` }} />
          <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full blur-2xl animate-pulse" style={{ backgroundColor: `${color}18` }} />

          <div className="flex items-center gap-3 relative z-10">
            <div className="rounded-full p-3 shadow-md" style={{ backgroundColor: `${color}15`, boxShadow: `0 0 0 2px ${color}30` }}>
              <Clock className="h-6 w-6 animate-[spin_8s_linear_infinite]" style={{ color }} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-extrabold text-foreground tracking-tight italic">{activeDeal.title}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-muted-foreground font-medium">Ends in:</span>
                <div className="flex items-center gap-1">
                  {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((v, i) => (
                    <span key={i} className="contents">
                      {i > 0 && <span className="font-black text-sm" style={{ color }}>:</span>}
                      <span
                        className="inline-flex items-center justify-center font-black text-base rounded-lg px-2.5 py-1 min-w-[2.2rem] shadow-sm tabular-nums text-white"
                        style={{ backgroundColor: color }}
                      >
                        {pad(v)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <Button
            className="gap-1 rounded-full font-bold relative z-10 group-hover:scale-105 transition-transform text-white py-6 px-6 text-sm overflow-hidden water-vibe-btn"
            style={{ backgroundColor: color, boxShadow: `0 4px 20px ${color}60, 0 2px 8px ${color}40` }}
          >
            <span className="relative z-10 flex items-center gap-1">Shop Now <ChevronRight className="h-4 w-4" /></span>
          </Button>
        </div>
      </Link>
    </section>
  );
};

export default FlashDealBanner;
