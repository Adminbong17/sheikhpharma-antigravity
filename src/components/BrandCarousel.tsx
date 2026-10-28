import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { useLanguage } from "@/contexts/LanguageContext";

export const DEFAULT_BRANDS = [
  {
    id: "1b028d29-e3e1-4c1c-8317-66c459a24214",
    name: "Square Pharmaceuticals PLC",
    logo_url: "https://api.bongbangla.top/vault-api/share.php?t=411b61b4e1fe24192da8239e6e3ddfba",
  },
  {
    id: "93f66632-b379-43cd-857f-e47ea1334de1",
    name: "Beximco Pharmaceuticals Ltd.",
    logo_url: "https://api.bongbangla.top/vault-api/share.php?t=40c5a8e98d74db72bff3d8604dcbd4f2",
  },
  {
    id: "dad52299-a1ae-4de4-ac43-c26e713ae598",
    name: "Incepta Pharmaceuticals Ltd.",
    logo_url: "https://api.bongbangla.top/vault-api/share.php?t=3d3943e4b8e2548f8347d1046f7c0546",
  },
  {
    id: "a26fc38a-98ab-4639-8160-0012ccdd5ccd",
    name: "Renata PLC",
    logo_url: "https://api.bongbangla.top/vault-api/share.php?t=19220d7b214e7cee489121a02cf55e7c",
  },
  {
    id: "f7deb056-4faf-4451-a4e0-4c5259b1725f",
    name: "ACME Laboratories Ltd.",
    logo_url: "https://api.bongbangla.top/vault-api/share.php?t=7fbf0cc1db1e82c48938fa61dff7ac1d",
  },
  {
    id: "c5eadf80-bf4a-4ce9-a5a1-2b2ead61e496",
    name: "Eskayef Pharmaceuticals Ltd.",
    logo_url: "https://api.bongbangla.top/vault-api/share.php?t=0004fa98e6f84bdf26d84e1e86c74ea3",
  },
  {
    id: "154261be-cba3-438a-8ba2-7c3cdee6b0fa",
    name: "Aristopharma Ltd.",
    logo_url: "https://medex.com.bd/storage/images/company_logos/Se0laSDXU2PlTjr5Y9kSeW3PPeptno.png",
  },
  {
    id: "dcb26393-28a2-4a5a-a8d7-9a09d7a6cb5f",
    name: "Opsonin Pharma Ltd.",
    logo_url: "https://medex.com.bd/storage/images/company_logos/2S73wdZb94grsmT847MVvDeL9dAaea.png",
  },
  {
    id: "ddbd2d3b-5b59-43f7-ac66-f879cd31d4fc",
    name: "Popular Pharmaceuticals Ltd.",
    logo_url: "https://vkfloynvxqkxbqpdlzbd.supabase.co/storage/v1/object/public/product-images/brands/1777033992504.jpeg",
  },
  {
    id: "a3f278a5-1e26-4fee-9916-e7b6285437a0",
    name: "Healthcare Pharmaceuticals Ltd.",
    logo_url: "https://medex.com.bd/storage/images/company_logos/6ShbZ14Bwer1s0Y3oAsXHOrJlE8DsD.png",
  },
];

const STORAGE_KEY = "sheikhpharma_brands";

const getStoredBrands = () => {
  if (typeof window === "undefined") return DEFAULT_BRANDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_BRANDS;
};

const BrandCarousel = () => {
  const { b } = useLanguage();
  const [isPaused, setIsPaused] = useState(false);

  const { data: brands = DEFAULT_BRANDS } = useQuery({
    queryKey: ["homepage-brands"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("brands")
          .select("id, name, logo_url")
          .eq("status", "approved")
          .eq("is_active", true)
          .order("name")
          .limit(60);
        if (error || !data || data.length === 0) return getStoredBrands();

        // Sort so brands with valid logo_url appear first
        const sorted = [...data].sort((a, b) => {
          if (a.logo_url && !b.logo_url) return -1;
          if (!a.logo_url && b.logo_url) return 1;
          return a.name.localeCompare(b.name);
        });

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
        } catch {}
        return sorted;
      } catch {
        return getStoredBrands();
      }
    },
    initialData: getStoredBrands,
    staleTime: 1000 * 60 * 30,
  });

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // Autoplay functionality with pause on hover/interaction
  useEffect(() => {
    if (!emblaApi || isPaused) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 2800);
    return () => clearInterval(interval);
  }, [emblaApi, isPaused]);

  if (!brands || brands.length === 0) return null;

  // Duplicate items if list is small to ensure smooth infinite loop
  const displayItems = brands.length < 15 ? [...brands, ...brands] : brands;

  return (
    <ScrollReveal>
      <section className="py-6 sm:py-8 bg-background border-y border-border/40">
        {/* Title with Red Accent Bar matching reference design */}
        <div className="text-center mb-5 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {b("আমাদের পার্টনার্স", "Our Partners")}
          </h2>
          <div className="w-12 h-1 bg-red-600 rounded-full mx-auto mt-2" />
        </div>

        {/* Carousel Row with navigation arrows on left & right */}
        <div
          className="container mx-auto px-2 sm:px-4"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {/* Left Chevron Arrow */}
            <button
              type="button"
              onClick={scrollPrev}
              aria-label="Previous Brand"
              className="shrink-0 p-1 text-sky-500 hover:text-sky-700 active:scale-90 transition-all focus:outline-none select-none"
            >
              <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8 stroke-[2.5]" />
            </button>

            {/* Embla Viewport */}
            <div className="overflow-hidden flex-1" ref={emblaRef}>
              <div className="flex items-center -ml-1 sm:-ml-2">
                {displayItems.map((brand: any, i: number) => (
                  <div
                    key={`${brand.id}-${i}`}
                    /* Mobile: exactly 5 items (basis-1/5); Tablet: 6-7 items; Desktop: 8 items */
                    className="min-w-0 shrink-0 grow-0 basis-1/5 sm:basis-1/6 md:basis-1/7 lg:basis-1/8 pl-1 sm:pl-2"
                  >
                    <Link
                      to={`/brand/${brand.id}`}
                      className="flex items-center justify-center h-10 sm:h-12 md:h-14 px-1 rounded-lg transition-transform duration-200 hover:scale-110 group select-none"
                      title={brand.name}
                    >
                      {brand.logo_url ? (
                        <img
                          src={brand.logo_url}
                          alt={brand.name}
                          loading="lazy"
                          className="max-h-7 sm:max-h-9 md:max-h-11 w-auto max-w-[90%] sm:max-w-[85%] object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.05)] group-hover:brightness-105"
                          onError={(e) => {
                            // If logo fails to load, gracefully hide img & show fallback text
                            const target = e.currentTarget;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector(".fallback-text")) {
                              const span = document.createElement("span");
                              span.className =
                                "fallback-text text-[10px] sm:text-xs font-semibold text-slate-700 text-center line-clamp-1 bg-slate-100 dark:bg-slate-800 dark:text-slate-200 rounded px-1 py-0.5 max-w-[95%]";
                              span.textContent = brand.name;
                              parent.appendChild(span);
                            }
                          }}
                        />
                      ) : (
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 text-center line-clamp-1 bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5 max-w-[95%]">
                          {brand.name}
                        </span>
                      )}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Chevron Arrow */}
            <button
              type="button"
              onClick={scrollNext}
              aria-label="Next Brand"
              className="shrink-0 p-1 text-sky-500 hover:text-sky-700 active:scale-90 transition-all focus:outline-none select-none"
            >
              <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Subtle "View All" link below */}
        <div className="flex justify-center mt-3 sm:mt-4">
          <Link
            to="/brands"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors py-1 px-3 rounded-full hover:bg-muted/60"
          >
            {b("সব ব্র্যান্ড দেখুন", "View All Brands")} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </ScrollReveal>
  );
};

export default BrandCarousel;
