import { Link } from "react-router-dom";
import ScrollReveal from "@/components/ScrollReveal";
import { useCategories } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import CategoryIcon, { getCategoryMeta } from "@/components/CategoryIcon";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const CategoryGrid = () => {
  const { data: categories = [], isLoading } = useCategories();
  const isMobile = useIsMobile();
  const { b } = useLanguage();

  // Show all 12 categories so none are hidden
  const visibleCount = isMobile ? 12 : 16;
  const visibleCategories = categories.slice(0, visibleCount);

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-6">
        <h2 className="mb-4 text-xl font-bold">{b("ক্যাটাগরি", "Categories")}</h2>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3.5 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-12">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="h-28 sm:h-32 rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <ScrollReveal>
      <section className="container mx-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">{b("ক্যাটাগরি", "Categories")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{b("আপনার প্রয়োজনীয় স্বাস্থ্যসেবা ও ওষুধ বিভাগ বেছে নিন", "Browse by healthcare & medicine categories")}</p>
          </div>
          <Link to="/categories">
            <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary/80 font-medium">
              {b("সব দেখুন", "See All")} <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3.5 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-12">
          {visibleCategories.map(({ name, slug, icon_url }) => {
            const meta = getCategoryMeta(slug, name);
            return (
              <Link
                key={slug}
                to={`/category/${slug}`}
                className="group relative flex flex-col items-center justify-between rounded-2xl bg-card p-3 sm:p-3.5 border border-border/70 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 active:scale-95"
              >
                <div className="relative mb-2 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center transition-transform duration-300 ease-out group-hover:scale-110">
                  <CategoryIcon iconUrl={icon_url} name={name} slug={slug} className="h-full w-full drop-shadow-sm" />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-foreground/90 text-center leading-tight group-hover:text-primary transition-colors line-clamp-2">
                  {b(meta?.nameBn || name, meta?.nameEn || name)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </ScrollReveal>
  );
};

export default CategoryGrid;
