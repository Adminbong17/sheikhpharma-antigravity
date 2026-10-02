import Navbar from "@/components/Navbar";
import { Store, ArrowLeft, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Followed = () => {
  const { user } = useAuth();

  const { data: follows = [], isLoading } = useQuery({
    queryKey: ["user-followed-vendors", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("vendor_follows")
        .select("id, created_at, vendor_id, vendors(id, store_name, logo_url, store_description)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <div className="mb-4 flex items-center gap-2">
          <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
        <h1 className="mb-6 text-xl font-bold">Followed Stores</h1>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : follows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Store className="h-14 w-14 opacity-20" />
            <p className="font-medium">You haven't followed any stores yet</p>
            <p className="text-sm text-center">Follow your favourite stores to stay updated on their latest products.</p>
            <Link to="/" className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              Explore Stores
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {follows.map((f: any) => {
              const v = f.vendors;
              if (!v) return null;
              return (
                <Link
                  key={f.id}
                  to={`/store/${v.id}`}
                  className="flex items-center gap-4 rounded-xl border bg-card p-4 hover:border-primary hover:shadow-sm transition-all group"
                >
                  {v.logo_url ? (
                    <img src={v.logo_url} alt={v.store_name} className="h-12 w-12 rounded-xl object-cover border shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold group-hover:text-primary transition-colors truncate">{v.store_name}</p>
                    {v.store_description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{v.store_description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Following since {new Date(f.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <Heart className="h-4 w-4 text-primary fill-primary shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Followed;
