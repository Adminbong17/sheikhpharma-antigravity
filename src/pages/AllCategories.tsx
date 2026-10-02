import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import { useCategories } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";
import CategoryIcon, { getCategoryMeta } from "@/components/CategoryIcon";
import { useLanguage } from "@/contexts/LanguageContext";

const AllCategories = () => {
  const { data: categories = [], isLoading } = useCategories();
  const { b } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="All Medicine & Healthcare Categories | Sheikh Pharma"
        description="Explore every medicine, healthcare and personal care category at Sheikh Pharma — Bangladesh's trusted online model pharmacy."
        path="/categories"
      />
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <BackButton />
        </div>
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {b("সকল ক্যাটাগরি", "All Categories")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {b(
              "শেখের ফার্মার সকল প্রয়োজনীয় স্বাস্থ্যসেবা, ওষুধ ও কেয়ার ক্যাটাগরি এক নজরে ব্রাউজ করুন।",
              "Browse all healthcare, medicine and personal care categories at a glance."
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-12">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-12">
            {categories.map(({ name, slug, icon_url }) => {
              const meta = getCategoryMeta(slug, name);
              return (
                <Link
                  key={slug}
                  to={`/category/${slug}`}
                  className="group relative flex flex-col items-center justify-between rounded-2xl bg-card p-3 sm:p-4 border border-border/70 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 active:scale-95"
                >
                  <div className="relative mb-2.5 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center transition-transform duration-300 ease-out group-hover:scale-110">
                    <CategoryIcon
                      iconUrl={icon_url}
                      name={name}
                      slug={slug}
                      className="h-full w-full drop-shadow-sm"
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-foreground/90 text-center leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {b(meta?.nameBn || name, meta?.nameEn || name)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AllCategories;
