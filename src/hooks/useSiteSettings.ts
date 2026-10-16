import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  id: string;
  site_name: string;
  site_title: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  background_color: string | null;
  foreground_color: string | null;
  card_color: string | null;
  accent_color: string | null;
  border_color: string | null;
  muted_color: string | null;
  is_multivendor: boolean | null;
  updated_at: string;
}

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async (): Promise<SiteSettings> => {
      const { data, error } = await supabase
        .from("site_settings" as any)
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as any;
    },
    staleTime: 1000 * 60 * 5,
  });
};
