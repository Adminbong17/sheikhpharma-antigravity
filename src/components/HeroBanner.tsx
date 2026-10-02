import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

const HeroBanner = () => {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);

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
      setCurrent((c) => c - 1 + slides.length);
    }
  }, [slides.length]);

  // When reaching the cloned first slide, jump back to real first instantly
  const handleTransitionEnd = useCallback(() => {
    if (current >= slides.length) {
      setIsTransitioning(false);
      setCurrent(0);
    }
  }, [current, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(next, 2500);
    return () => clearInterval(timer);
  }, [next, slides.length]);

  if (isLoading) {
    return (
      <section className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <Skeleton className="w-full rounded-2xl aspect-[1000/520] sm:aspect-[1000/432]" />
      </section>
    );
  }

  if (slides.length === 0) {
    // Fallback banner
    return (
      <section className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-accent p-8 md:p-14 shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.45)] ring-1 ring-white/20">
          <div className="relative z-10 max-w-md text-primary-foreground">
            <p className="mb-1 text-sm font-semibold uppercase tracking-widest opacity-80">Limited Time</p>
            <h1 className="mb-2 text-4xl font-black md:text-5xl">Mega Sale</h1>
            <p className="mb-6 text-lg opacity-90">Up to 70% OFF on Electronics</p>
            <button className="rounded-full bg-primary-foreground px-6 py-2.5 font-bold text-primary transition hover:opacity-90">Shop Now</button>
          </div>
          <div className="absolute -right-10 -top-10 h-60 w-60 rounded-full bg-primary-foreground/10 blur-2xl" />
          <div className="absolute -bottom-16 right-20 h-40 w-40 rounded-full bg-primary-foreground/10 blur-2xl" />
        </div>
      </section>
    );
  }


  return (
    <section className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
      <div
        className="group relative w-full overflow-hidden rounded-2xl ring-1 ring-primary/20 shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.45)] hover:shadow-[0_30px_70px_-20px_hsl(var(--primary)/0.55)] hover:-translate-y-0.5 transition-all duration-500 bg-card aspect-[1000/520] sm:aspect-[1000/432]"
      >
        {/* Slides */}
        <div
          className={`flex h-full ${isTransitioning ? "transition-transform duration-700 ease-in-out" : ""}`}
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
                className="relative h-full flex-shrink-0"
                style={{ width: `${100 / (slides.length + 1)}%` }}
                {...(slideProps as any)}
              >
                <img
                  src={s.image_url}
                  alt={s.title || "Hero slide"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {(s.title || s.subtitle) && (
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-black/20 to-transparent p-6">
                    <div className="text-white drop-shadow-lg">
                      {s.title && <h2 className="text-2xl font-bold md:text-3xl">{s.title}</h2>}
                      {s.subtitle && <p className="text-sm opacity-90 md:text-base">{s.subtitle}</p>}
                    </div>
                  </div>
                )}
              </SlideWrapper>
            );
          })}
        </div>

        {/* Subtle inner glow ring */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />

        {/* Navigation arrows — floating glass */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-md text-foreground shadow-lg ring-1 ring-black/5 opacity-0 group-hover:opacity-100 hover:scale-110 transition-all duration-300 flex items-center justify-center"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-md text-foreground shadow-lg ring-1 ring-black/5 opacity-0 group-hover:opacity-100 hover:scale-110 transition-all duration-300 flex items-center justify-center"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dots — elegant pill */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md ring-1 ring-white/20">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => { setIsTransitioning(true); setCurrent(i); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === (current % slides.length) ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroBanner;
