import { Link } from "react-router-dom";
import ScrollReveal from "@/components/ScrollReveal";
import { useCategories } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import CategoryIcon from "@/components/CategoryIcon";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const CategoryGrid = () => {
  const { data: categories = [], isLoading } = useCategories();
  const isMobile = useIsMobile();
  const { b } = useLanguage();

  // Mobile: 3 cols × 3 rows = 9, Desktop: 8 cols × 2 rows = 16
  const visibleCount = isMobile ? 9 : 16;
  const visibleCategories = categories.slice(0, visibleCount);

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-6">
        <h2 className="mb-4 text-xl font-bold">{b("ক্যাটাগরি", "Categories")}</h2>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-8">
          {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <ScrollReveal>
      <section className="container mx-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{b("ক্যাটাগরি", "Categories")}</h2>
          <Link to="/categories">
            <Button variant="ghost" size="sm" className="gap-1 text-primary">
              {b("সব দেখুন", "See All")} <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {visibleCategories.map(({ name, slug, icon_url }) => (
            <Link
              key={slug}
              to={`/category/${slug}`}
              className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 shadow-sm border-2 border-primary transition hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
                <CategoryIcon iconUrl={icon_url} name={name} />
              </div>
              <span className="text-xs font-medium text-card-foreground text-center leading-tight">{name}</span>
            </Link>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
};

export default CategoryGrid;
