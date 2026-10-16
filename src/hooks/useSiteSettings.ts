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

const DEFAULT_SETTINGS: SiteSettings = {
  id: "default",
  site_name: "শেখ ফার্মা",
  site_title: "Sheikh Pharma — Online Medicine Shop & Model Pharmacy in BD",
  logo_url: null,
  favicon_url: null,
  primary_color: "231 72% 56%",
  background_color: null,
  foreground_color: null,
  card_color: null,
  accent_color: "160 84% 39%",
  border_color: null,
  muted_color: null,
  is_multivendor: true,
  updated_at: "",
};

const STORAGE_KEY = "sheikhpharma_site_settings";

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async (): Promise<SiteSettings> => {
      try {
        const { data, error } = await supabase
          .from("site_settings" as any)
          .select("*")
          .limit(1)
          .single();
        if (error) {
          console.error("Error fetching site settings:", error);
          return DEFAULT_SETTINGS;
        }
        if (data) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          } catch {}
          return data as any;
        }
      } catch {
        // network abort or timeout
      }
      return DEFAULT_SETTINGS;
    },
    initialData: () => {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {}
      return DEFAULT_SETTINGS;
    },
    initialDataUpdatedAt: () => Date.now(),
    staleTime: 1000 * 60 * 15,
  });
};
