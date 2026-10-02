import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed" | "free_shipping";
  discount_value: number;
  minimum_order_amount: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  current_uses: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  is_user_specific: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponAssignment {
  id: string;
  coupon_id: string;
  user_id: string;
  reason: string | null;
  assigned_at: string;
}

export const useCoupons = () => {
  return useQuery({
    queryKey: ["coupons"],
    queryFn: async (): Promise<Coupon[]> => {
      const { data, error } = await (supabase.from("coupons" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });
};

export const useCreateCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (coupon: Partial<Coupon>) => {
      const { error } = await (supabase.from("coupons" as any) as any).insert(coupon);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
};

export const useUpdateCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Coupon> & { id: string }) => {
      const { error } = await (supabase.from("coupons" as any) as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
};

export const useDeleteCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("coupons" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
};

/** Validate and apply a coupon code at checkout */
export const useValidateCoupon = () => {
  return useMutation({
    mutationFn: async ({ code, userId, orderTotal }: { code: string; userId: string; orderTotal: number }) => {
      // Fetch the coupon
      const { data: coupon, error } = await (supabase.from("coupons" as any) as any)
        .select("*")
        .eq("code", code.toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (error || !coupon) throw new Error("Invalid or expired coupon code");

      const c = coupon as Coupon;
      const now = new Date();

      if (c.starts_at && new Date(c.starts_at) > now) throw new Error("This coupon is not yet active");
      if (c.expires_at && new Date(c.expires_at) < now) throw new Error("This coupon has expired");
      if (c.max_uses && c.current_uses >= c.max_uses) throw new Error("This coupon has reached its usage limit");
      if (orderTotal < c.minimum_order_amount) throw new Error(`Minimum order amount is ৳${c.minimum_order_amount}`);

      // Check if coupon is user-specific
      if (c.is_user_specific) {
        const { data: assignment } = await (supabase.from("coupon_assignments" as any) as any)
          .select("id")
          .eq("coupon_id", c.id)
          .eq("user_id", userId)
          .maybeSingle();
        if (!assignment) throw new Error("This coupon is not available for your account");
      }

      // Check per-user limit
      if (c.max_uses_per_user) {
        const { count } = await (supabase.from("coupon_usages" as any) as any)
          .select("id", { count: "exact", head: true })
          .eq("coupon_id", c.id)
          .eq("user_id", userId);
        if ((count || 0) >= c.max_uses_per_user) throw new Error("You have already used this coupon");
      }

      // Calculate discount
      let discount = 0;
      if (c.discount_type === "percentage") {
        discount = Math.round((orderTotal * c.discount_value) / 100);
      } else if (c.discount_type === "fixed") {
        discount = Math.min(c.discount_value, orderTotal);
      }
      // free_shipping discount is handled separately in checkout

      return { coupon: c, discount };
    },
  });
};

/** Fetch assignments for a coupon */
export const useCouponAssignments = (couponId: string | null) => {
  return useQuery({
    queryKey: ["coupon-assignments", couponId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("coupon_assignments" as any) as any)
        .select("*")
        .eq("coupon_id", couponId!)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data as CouponAssignment[];
    },
    enabled: !!couponId,
  });
};

/** Add a coupon assignment */
export const useAssignCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ coupon_id, user_id, reason }: { coupon_id: string; user_id: string; reason?: string }) => {
      const { error } = await (supabase.from("coupon_assignments" as any) as any)
        .insert({ coupon_id, user_id, reason: reason || null });
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["coupon-assignments", v.coupon_id] }),
  });
};

/** Remove a coupon assignment */
export const useRemoveCouponAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, coupon_id }: { id: string; coupon_id: string }) => {
      const { error } = await (supabase.from("coupon_assignments" as any) as any).delete().eq("id", id);
      if (error) throw error;
      return coupon_id;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["coupon-assignments", v.coupon_id] }),
  });
};
