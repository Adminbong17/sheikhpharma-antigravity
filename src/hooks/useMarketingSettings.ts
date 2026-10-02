import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MarketingSettings {
  id: string;
  facebook_pixel_id: string;
  pixel_enabled: boolean;
  pixel_test_mode: boolean;
  default_currency: string;
  google_analytics_id: string;
  ga_enabled: boolean;
  gtm_id: string;
  gtm_enabled: boolean;
  updated_at: string;
}

export const useMarketingSettings = () => {
  return useQuery({
    queryKey: ["marketing-settings"],
    queryFn: async (): Promise<MarketingSettings | null> => {
      const { data, error } = await (supabase.from("marketing_settings" as any) as any)
        .select("*")
        .limit(1)
        .single();
      if (error) return null;
      return data as MarketingSettings;
    },
    staleTime: 1000 * 60 * 5,
  });
};
