import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Store, UserPlus, UserCheck, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import { toast } from "sonner";
import { useState, useMemo } from "react";

const AllVendors = () => {
  const { user } = useAuth();
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("name-asc");

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["all-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, store_name, logo_url, store_description")
        .eq("status", "approved")
        .order("store_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: followerCounts = {} } = useQuery({
    queryKey: ["all-vendor-follower-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_follows")
        .select("vendor_id");
      const counts: Record<string, number> = {};
      (data || []).forEach((f: any) => {
        counts[f.vendor_id] = (counts[f.vendor_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: follows = [], refetch: refetchFollows } = useQuery({
    queryKey: ["my-follows", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("vendor_follows")
        .select("vendor_id")
        .eq("user_id", user.id);
      return (data || []).map((f) => f.vendor_id);
    },
    enabled: !!user,
  });

  const filteredVendors = useMemo(() => {
    let result = [...vendors].filter((v) =>
      v.store_name.toLowerCase().includes(search.toLowerCase())
    );
    switch (sortBy) {
      case "name-asc":
        result.sort((a, b) => a.store_name.localeCompare(b.store_name));
        break;
      case "name-desc":
        result.sort((a, b) => b.store_name.localeCompare(a.store_name));
        break;
      case "followers-desc":
        result.sort((a, b) => (followerCounts[b.id] || 0) - (followerCounts[a.id] || 0));
        break;
      case "followers-asc":
        result.sort((a, b) => (followerCounts[a.id] || 0) - (followerCounts[b.id] || 0));
        break;
    }
    return result;
  }, [vendors, search, sortBy, followerCounts]);

  const toggleFollow = async (vendorId: string) => {
    if (!user) {
      toast.error("Please login to follow vendors");
      return;
    }
    setFollowLoading(vendorId);
    try {
      const isFollowing = follows.includes(vendorId);
      if (isFollowing) {
        await supabase
          .from("vendor_follows")
          .delete()
          .eq("user_id", user.id)
          .eq("vendor_id", vendorId);
        toast.success("Unfollowed");
      } else {
        await supabase
          .from("vendor_follows")
          .insert({ user_id: user.id, vendor_id: vendorId });
        toast.success("Following!");
      }
      refetchFollows();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setFollowLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-3"><BackButton /></div>
        <h1 className="text-2xl font-bold mb-4">All Vendors</h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="followers-desc">Most Followers</SelectItem>
              <SelectItem value="followers-asc">Least Followers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="flex flex-col items-center gap-3 p-6">
                  <div className="h-16 w-16 rounded-full bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-8 w-20 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Store className="h-14 w-14 opacity-20" />
            <p className="font-medium">No vendors found</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredVendors.map((v) => {
              const isFollowing = follows.includes(v.id);
              const count = followerCounts[v.id] || 0;
              return (
                <Card key={v.id} className="overflow-hidden transition hover:shadow-md">
                  <CardContent className="flex flex-col items-center gap-3 p-6">
                    <Link to={`/store/${v.id}`} className="flex flex-col items-center gap-3">
                      {v.logo_url ? (
                        <img
                          src={v.logo_url}
                          alt={v.store_name}
                          className="h-16 w-16 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <Store className="h-8 w-8 text-primary" />
                        </div>
                      )}
                      <h3 className="font-semibold text-center">{v.store_name}</h3>
                    </Link>
                    {v.store_description && (
                      <p className="text-xs text-muted-foreground text-center line-clamp-2">
                        {v.store_description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{count} Followers</span>
                    </div>
                    <Button
                      size="sm"
                      variant={isFollowing ? "secondary" : "default"}
                      className="w-full mt-1"
                      disabled={followLoading === v.id}
                      onClick={() => toggleFollow(v.id)}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="h-4 w-4" /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" /> Follow
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AllVendors;
