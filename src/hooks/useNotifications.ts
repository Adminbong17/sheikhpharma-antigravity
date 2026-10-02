import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  user_id: string | null;
  target_role: string;
  title: string;
  body: string;
  type: string;
  action_url: string | null;
  is_read: boolean;
  metadata: any;
  created_at: string;
}

/** Fetch notifications for the current user/role */
export const useNotifications = (role: "admin" | "vendor" | "user", limit = 50) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", role, user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (role === "admin") {
        // Admin sees all admin-targeted notifications
        const { data, error } = await (supabase.from("notifications" as any) as any)
          .select("*")
          .eq("target_role", "admin")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return data as Notification[];
      } else {
        // Vendor/User sees their own notifications
        const { data, error } = await (supabase.from("notifications" as any) as any)
          .select("*")
          .eq("user_id", user!.id)
          .eq("target_role", role)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return data as Notification[];
      }
    },
    enabled: !!user,
  });
};

export const useUnreadNotificationCount = (role: "admin" | "vendor" | "user") => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notification-unread-count", role, user?.id],
    queryFn: async () => {
      if (role === "admin") {
        const { count } = await (supabase.from("notifications" as any) as any)
          .select("id", { count: "exact", head: true })
          .eq("target_role", "admin")
          .eq("is_read", false);
        return count || 0;
      } else {
        const { count } = await (supabase.from("notifications" as any) as any)
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("target_role", role)
          .eq("is_read", false);
        return count || 0;
      }
    },
    enabled: !!user,
  });
};

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from("notifications" as any) as any).update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-unread-count"] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (role: "admin" | "vendor" | "user") => {
      if (role === "admin") {
        await (supabase.from("notifications" as any) as any)
          .update({ is_read: true })
          .eq("target_role", "admin")
          .eq("is_read", false);
      } else {
        await (supabase.from("notifications" as any) as any)
          .update({ is_read: true })
          .eq("user_id", user!.id)
          .eq("target_role", role)
          .eq("is_read", false);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-unread-count"] });
    },
  });
};

export const useDeleteNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from("notifications" as any) as any).delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-unread-count"] });
    },
  });
};

/** Helper to create a notification from client-side code */
export const createNotification = async (params: {
  user_id?: string | null;
  target_role: "admin" | "vendor" | "user";
  title: string;
  body: string;
  type?: string;
  action_url?: string;
  metadata?: any;
}) => {
  await (supabase.from("notifications" as any) as any).insert({
    user_id: params.user_id || null,
    target_role: params.target_role,
    title: params.title,
    body: params.body,
    type: params.type || "info",
    action_url: params.action_url || null,
    metadata: params.metadata || null,
  });

  // Send SMS to admin when notification targets admin
  if (params.target_role === "admin") {
    try {
      const { data: settings } = await supabase
        .from("site_settings")
        .select("office_phone")
        .limit(1)
        .single();
      
      if (settings?.office_phone) {
        const smsMessage = `🔔 ${params.title}\n${params.body}`;
        await supabase.functions.invoke("send-sms", {
          body: {
            phone: settings.office_phone,
            message: smsMessage,
            event_type: "admin_notification",
          },
        });
      }
    } catch (err) {
      console.error("Admin notification SMS error:", err);
    }
  }
};
