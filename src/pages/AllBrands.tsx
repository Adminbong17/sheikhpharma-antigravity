import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Search, Store } from "lucide-react";
import BackButton from "@/components/BackButton";
import { Skeleton } from "@/components/ui/skeleton";

const AllBrands = () => {
  const [search, setSearch] = useState("");

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["all-brands"],
    queryFn: async () => {
      const { data } = await supabase
        .from("brands")
        .select("*")
        .eq("status", "approved")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return brands;
    return brands.filter((b: any) =>
      b.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [brands, search]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-5">
          <div className="mb-3"><BackButton /></div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">All Brands</h1>
              <p className="text-sm text-muted-foreground">{brands.length} brands available</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {[...Array(16)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Store className="h-14 w-14 opacity-20" />
            <p className="font-medium">No brands found</p>
            {search && <p className="text-sm">Try a different search term</p>}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {filtered.map((b: any) => (
              <Link
                key={b.id}
                to={`/brand/${b.id}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30"
              >
                {b.logo_url ? (
                  <img src={b.logo_url} alt={b.name} className="h-14 w-14 rounded-lg object-contain" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                    {b.name[0]}
                  </div>
                )}
                <span className="text-xs font-medium text-center leading-tight line-clamp-2">{b.name}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AllBrands;
