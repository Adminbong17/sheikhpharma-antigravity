import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useWishlist = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: wishlistIds = [] } = useQuery({
    queryKey: ["wishlist-ids", user?.id],
    queryFn: async () => {
      const { data } = await (supabase.from("wishlists" as any) as any)
        .select("product_id")
        .eq("user_id", user!.id);
      return (data || []).map((w: any) => w.product_id as string);
    },
    enabled: !!user,
  });

  const toggleWishlist = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("Login required");
      const isInWishlist = wishlistIds.includes(productId);
      if (isInWishlist) {
        await (supabase.from("wishlists" as any) as any)
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        return { added: false };
      } else {
        await (supabase.from("wishlists" as any) as any)
          .insert({ user_id: user.id, product_id: productId });
        return { added: true };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-ids"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist-products"] });
      toast.success(result.added ? "Wishlist এ যোগ হয়েছে!" : "Wishlist থেকে সরানো হয়েছে!");
    },
    onError: () => {
      toast.error("Please login first");
    },
  });

  return {
    wishlistIds,
    isInWishlist: (productId: string) => wishlistIds.includes(productId),
    toggle: toggleWishlist.mutate,
    isToggling: toggleWishlist.isPending,
  };
};

export const useWishlistProducts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wishlist-products", user?.id],
    queryFn: async () => {
      const { data } = await (supabase.from("wishlists" as any) as any)
        .select("product_id, products(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data || []).map((w: any) => w.products).filter(Boolean);
    },
    enabled: !!user,
  });
};
