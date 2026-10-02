import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import { useCategories } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";
import CategoryIcon from "@/components/CategoryIcon";

const AllCategories = () => {
  const { data: categories = [], isLoading } = useCategories();

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="All Medicine & Healthcare Categories | Sheikh Pharma"
        description="Explore every medicine, healthcare and personal care category at Sheikh Pharma — Bangladesh's trusted online model pharmacy."
        path="/categories"
      />
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-4"><BackButton /></div>
        <h1 className="mb-6 text-2xl font-bold">All Categories</h1>
        {isLoading ? (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {categories.map(({ name, slug, icon_url }) => (
              <Link
                key={slug}
                to={`/category/${slug}`}
                className="flex flex-col items-center gap-3 rounded-xl bg-card p-5 shadow-sm border border-border transition hover:shadow-md hover:-translate-y-1 hover:border-primary/30"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
                  <CategoryIcon iconUrl={icon_url} name={name} />
                </div>
                <span className="text-sm font-medium text-card-foreground text-center leading-tight">
                  {name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AllCategories;
