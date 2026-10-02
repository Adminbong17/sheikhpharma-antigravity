import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

const HeroBanner = () => {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ["hero-slides"],
    queryFn: async () => {
      const { data } = await supabase
        .from("hero_slides")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const next = useCallback(() => {
    if (slides.length > 0) {
      setIsTransitioning(true);
      setCurrent((c) => c + 1);
    }
  }, [slides.length]);

  const prev = useCallback(() => {
    if (slides.length > 0) {
      setIsTransitioning(true);
      setCurrent((c) => (c - 1 + slides.length) % slides.length);
    }
  }, [slides.length]);

  // When reaching the cloned first slide, jump back to real first smoothly
  const handleTransitionEnd = useCallback(() => {
    if (current >= slides.length) {
      setIsTransitioning(false);
      setCurrent(0);
    }
  }, [current, slides.length]);

  // Autoplay with pause on hover/touch
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setInterval(next, 3800);
    return () => clearInterval(timer);
  }, [next, slides.length, isPaused]);

  // Touch swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 45) {
      next(); // Swiped left -> Next poster
    } else if (distance < -45) {
      prev(); // Swiped right -> Previous poster
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <Skeleton className="w-full rounded-xl sm:rounded-2xl aspect-[1000/432]" />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="w-full">
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary via-emerald-600 to-teal-700 p-6 md:p-12 shadow-lg ring-1 ring-white/20 aspect-[1000/432] flex items-center">
          <div className="relative z-10 max-w-md text-white">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest opacity-90">Sheikh Pharma</p>
            <h1 className="mb-2 text-2xl font-black md:text-4xl">অরিজিনাল ওষুধ ও স্বাস্থ্যসেবা</h1>
            <p className="mb-4 text-xs md:text-base opacity-90">দ্রুততম সময়ে সারা দেশে হোম ডেলিভারি</p>
            <Link
              to="/categories"
              className="inline-block rounded-full bg-white text-emerald-800 px-5 py-2 font-bold text-xs md:text-sm shadow-md transition hover:bg-white/90"
            >
              এখনই অর্ডার করুন
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeIndex = current % slides.length;

  return (
    <div
      className="group relative w-full overflow-hidden rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 select-none aspect-[1000/432]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slider Track */}
      <div
        className={`flex h-full w-full ${isTransitioning ? "transition-transform duration-500 ease-out" : ""}`}
        style={{
          width: `${(slides.length + 1) * 100}%`,
          transform: `translateX(-${current * (100 / (slides.length + 1))}%)`,
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {[...slides, slides[0]].map((s, idx) => {
          const SlideWrapper = s.link_url ? Link : "div";
          const slideProps = s.link_url ? { to: s.link_url } : {};
          return (
            <SlideWrapper
              key={`${s.id}-${idx}`}
              className="relative h-full flex-shrink-0 flex items-center justify-center bg-slate-50 dark:bg-slate-950 overflow-hidden"
              style={{ width: `${100 / (slides.length + 1)}%` }}
              {...(slideProps as any)}
            >
              <img
                src={s.image_url}
                alt={s.title || "Poster"}
                className="w-full h-full object-contain sm:object-cover pointer-events-none select-none transition-all duration-300"
                loading={idx === 0 ? "eager" : "lazy"}
                draggable={false}
              />
              {(s.title || s.subtitle) && (
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 sm:p-6 pointer-events-none">
                  <div className="text-white drop-shadow-md">
                    {s.title && <h2 className="text-lg sm:text-2xl font-bold">{s.title}</h2>}
                    {s.subtitle && <p className="text-xs sm:text-sm opacity-90">{s.subtitle}</p>}
                  </div>
                </div>
              )}
            </SlideWrapper>
          );
        })}
      </div>

      {/* Floating Navigation Arrows (Desktop hover) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              prev();
            }}
            aria-label="Previous poster"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-white shadow-md hover:bg-white dark:hover:bg-slate-800 hover:scale-110 active:scale-95 transition-all duration-200 opacity-0 group-hover:opacity-100 hidden sm:flex items-center justify-center z-10 border border-slate-200/60 dark:border-slate-700"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              next();
            }}
            aria-label="Next poster"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-white shadow-md hover:bg-white dark:hover:bg-slate-800 hover:scale-110 active:scale-95 transition-all duration-200 opacity-0 group-hover:opacity-100 hidden sm:flex items-center justify-center z-10 border border-slate-200/60 dark:border-slate-700"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </>
      )}

      {/* Mobile Badge Counter (Does NOT block poster text!) */}
      {slides.length > 1 && (
        <div className="sm:hidden absolute bottom-2 right-2 z-10">
          <div className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white tracking-widest ring-1 ring-white/20 shadow-sm">
            {activeIndex + 1}/{slides.length}
          </div>
        </div>
      )}

      {/* Desktop Dots Indicator (Centered at bottom, slim and modern) */}
      {slides.length > 1 && (
        <div className="hidden sm:flex absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 gap-1.5 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-md ring-1 ring-white/20">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to poster ${i + 1}`}
              onClick={(e) => {
                e.preventDefault();
                setIsTransitioning(true);
                setCurrent(i);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex ? "w-6 bg-white shadow-sm" : "w-1.5 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroBanner;
