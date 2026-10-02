import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Banner {
  id: string;
  image_url: string;
  link_url?: string | null;
}

const BannerCarousel = ({ banners }: { banners: Banner[] }) => {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);

  const next = useCallback(() => {
    if (banners.length > 0) {
      setIsTransitioning(true);
      setCurrent((c) => c + 1);
    }
  }, [banners.length]);

  const prev = useCallback(() => {
    if (banners.length > 0) {
      setIsTransitioning(true);
      setCurrent((c) => c - 1 + banners.length);
    }
  }, [banners.length]);

  const handleTransitionEnd = useCallback(() => {
    if (current >= banners.length) {
      setIsTransitioning(false);
      setCurrent(0);
    }
  }, [current, banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(next, 2500);
    return () => clearInterval(timer);
  }, [next, banners.length]);

  if (banners.length === 0) return null;

  // Single banner - no carousel needed
  if (banners.length === 1) {
    const banner = banners[0];
    return (
      <div className="overflow-hidden rounded-xl border-2 border-primary animate-float">
        {banner.link_url ? (
          <a href={banner.link_url} target="_blank" rel="noopener noreferrer">
            <img src={banner.image_url} alt="Banner" className="w-full object-cover aspect-[1000/432]" loading="lazy" />
          </a>
        ) : (
          <img src={banner.image_url} alt="Banner" className="w-full object-cover aspect-[1000/432]" loading="lazy" />
        )}
      </div>
    );
  }

  const slides = [...banners, banners[0]];

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-primary animate-float" style={{ aspectRatio: "1000/432" }}>
      <div
        className={`flex h-full ${isTransitioning ? "transition-transform duration-700 ease-in-out" : ""}`}
        style={{
          width: `${slides.length * 100}%`,
          transform: `translateX(-${current * (100 / slides.length)}%)`,
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {slides.map((banner, idx) => {
          const content = (
            <img src={banner.image_url} alt="Banner" className="h-full w-full object-cover" loading="lazy" />
          );
          return (
            <div key={`${banner.id}-${idx}`} className="relative h-full flex-shrink-0" style={{ width: `${100 / slides.length}%` }}>
              {banner.link_url ? (
                <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="block h-full">
                  {content}
                </a>
              ) : content}
            </div>
          );
        })}
      </div>

      {/* Navigation arrows */}
      <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/50">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/50">
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIsTransitioning(true); setCurrent(i); }}
            className={`h-2 rounded-full transition-all ${i === (current % banners.length) ? "w-6 bg-white" : "w-2 bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default BannerCarousel;
