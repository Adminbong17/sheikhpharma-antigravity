import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Store, Star, Package, Heart, Users, ShoppingCart, Zap } from "lucide-react";
import BackButton from "@/components/BackButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isEffectivePreorder } from "@/lib/preorder";
import TrustBadges from "@/components/TrustBadges";

const VendorStorePage = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ["vendor-store", vendorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendors")
        .select("id, store_name, logo_url, store_description, address, status")
        .eq("id", vendorId!)
        .maybeSingle();
      return data;
    },
    enabled: !!vendorId,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["vendor-store-products", vendorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", vendorId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!vendorId,
  });

  // Follower count (public — all vendor_follows for this vendor)
  const { data: followerCount = 0 } = useQuery({
    queryKey: ["vendor-followers-count", vendorId],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("vendor_follows")
        .select("*", { count: "exact", head: true })
        .eq("vendor_id", vendorId!);
      return count ?? 0;
    },
    enabled: !!vendorId,
  });

  // Is current user following this vendor?
  const { data: isFollowing = false } = useQuery({
    queryKey: ["vendor-follow-status", vendorId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await (supabase as any)
        .from("vendor_follows")
        .select("id")
        .eq("vendor_id", vendorId!)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!vendorId && !!user,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      if (isFollowing) {
        await (supabase as any)
          .from("vendor_follows")
          .delete()
          .eq("vendor_id", vendorId!)
          .eq("user_id", user.id);
      } else {
        await (supabase as any)
          .from("vendor_follows")
          .insert({ vendor_id: vendorId!, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-follow-status", vendorId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["vendor-followers-count", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["user-followed-vendors", user?.id] });
      toast.success(isFollowing ? "Unfollowed store" : "Following store!");
    },
    onError: (err: any) => {
      if (err.message === "Login required") {
        toast.error("Please login to follow stores");
      } else {
        toast.error("Something went wrong");
      }
    },
  });

  if (vendorLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Store not found</h1>
          <Link to="/" className="text-primary hover:underline mt-4 inline-block">Back to Home</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-4"><BackButton /></div>
        {/* Vendor Header */}
        <div className="rounded-xl border bg-card p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {vendor.logo_url ? (
              <img
                src={vendor.logo_url}
                alt={vendor.store_name}
                className="h-20 w-20 rounded-xl object-cover border shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Store className="h-10 w-10 text-primary" />
              </div>
            )}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-2xl font-bold">{vendor.store_name}</h1>
                {vendor.status === "approved" && (
                  <Badge variant="secondary" className="text-xs">✓ Verified Seller</Badge>
                )}
              </div>
              {vendor.store_description && (
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">{vendor.store_description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground justify-center sm:justify-start">
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  <span>{products.length} Products</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{followerCount} Followers</span>
                </div>
                {vendor.address && (
                  <span>📍 {vendor.address}</span>
                )}
              </div>
            </div>

            {/* Follow Button */}
            <Button
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              className="shrink-0 gap-2"
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
            >
              <Heart className={`h-4 w-4 ${isFollowing ? "fill-primary text-primary" : ""}`} />
              {isFollowing ? "Following" : "Follow"}
            </Button>
          </div>
        </div>

        <TrustBadges />

        {/* Products Grid */}
        <h2 className="text-lg font-semibold mb-4">All Products</h2>
        {productsLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No active products in this store.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {products.map((p: any) => (
              <div key={p.id} className="group flex flex-col cursor-pointer overflow-hidden rounded-xl border-2 border-primary bg-card shadow-sm transition hover:shadow-md animate-float">
                <Link to={`/product/${p.slug || p.id}`} className="flex-1">
                  <div className="relative flex h-40 items-center justify-center bg-muted overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className={`h-full w-full object-cover transition group-hover:scale-105 ${p.stock <= 0 ? "opacity-50 grayscale" : ""}`} loading="lazy" />
                    ) : (
                      <span className="text-4xl text-muted-foreground">📦</span>
                    )}
                    {isEffectivePreorder(p) && (
                      <div className="absolute top-1 left-1">
                        <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground shadow">Pre-Order</span>
                      </div>
                    )}
                    {p.stock <= 0 && !isEffectivePreorder(p) && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-destructive text-destructive-foreground text-xs font-bold px-6 py-1 rotate-[-35deg] shadow-lg">
                          Out of Stock
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm text-card-foreground">{p.name}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <p className="text-lg font-bold text-primary">{formatPrice(p.price)}</p>
                      {p.price_unit && (
                        <span className="rounded bg-accent px-1 py-0.5 text-[9px] font-semibold text-accent-foreground">{p.price_unit}</span>
                      )}
                    </div>
                    {p.original_price && p.original_price > p.price && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground line-through">{formatPrice(p.original_price)}</span>
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          -{Math.round((1 - p.price / p.original_price) * 100)}%
                        </span>
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                      {p.rating ? (
                        <><Star className="h-3 w-3 fill-primary text-primary" /><span>{p.rating}</span></>
                      ) : <><Star className="h-3 w-3 text-muted-foreground" /><span>0</span></>}
                      {p.sold_count ? <span>· {p.sold_count} sold</span> : null}
                    </div>
                  </div>
                </Link>
                <div className="flex gap-1.5 px-3 pb-3 mt-auto">
                  {isEffectivePreorder(p) ? (
                    <Button
                      size="sm"
                      className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={(e) => { e.stopPropagation(); addItem({ id: p.id, name: p.name, price: p.price, image_url: p.image_url }); toast.success("Pre-Order সফল হয়েছে!"); }}
                    >
                      <ShoppingCart className="h-3 w-3 shrink-0" /> <span className="truncate">Pre-Order</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full"
                        onClick={(e) => { e.stopPropagation(); addItem({ id: p.id, name: p.name, price: p.price, image_url: p.image_url }); toast.success("কার্টে যোগ হয়েছে!"); }}
                      >
                        <ShoppingCart className="h-3 w-3 shrink-0" /> <span className="truncate">Cart</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full border-2 border-primary"
                        onClick={(e) => { e.stopPropagation(); addItem({ id: p.id, name: p.name, price: p.price, image_url: p.image_url }); navigate("/checkout"); }}
                      >
                        <Zap className="h-3 w-3 shrink-0" /> <span className="truncate">Buy</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default VendorStorePage;
