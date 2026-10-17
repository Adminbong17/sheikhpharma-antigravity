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

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: "41fe698d-fda6-4bee-ae1a-0c102e60b59f",
  site_name: "Sheikh Pharma",
  site_title: "Sheikh Pharma - Online Pharmacy",
  logo_url: "https://vkfloynvxqkxbqpdlzbd.supabase.co/storage/v1/object/public/product-images/site/site-logo-1773477536405.jpg",
  favicon_url: "https://vkfloynvxqkxbqpdlzbd.supabase.co/storage/v1/object/public/product-images/site/site-favicon-1773477549370.jpg",
  primary_color: "231 72% 56%",
  background_color: "152 30% 96%",
  foreground_color: "160 30% 10%",
  card_color: "0 0% 100%",
  accent_color: "160 84% 39%",
  border_color: "155 18% 89%",
  muted_color: "155 12% 65%",
  is_multivendor: false,
  updated_at: "2026-03-14T08:33:45.409243+00:00",
};

const STORAGE_KEY = "sheikhpharma_site_settings";

const getStoredSettings = (): SiteSettings => {
  if (typeof window === "undefined") return DEFAULT_SITE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.site_name === "Sheikh Pharma" && parsed.logo_url?.startsWith("http")) {
        return { ...DEFAULT_SITE_SETTINGS, ...parsed };
      }
    }
  } catch {}
  return DEFAULT_SITE_SETTINGS;
};

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async (): Promise<SiteSettings> => {
      try {
        const { data, error } = await supabase
          .from("site_settings" as any)
          .select("*")
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn("Could not fetch site_settings from DB, using fallback:", error.message);
          return getStoredSettings();
        }

        if (data) {
          const merged = { ...DEFAULT_SITE_SETTINGS, ...data };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        }

        return getStoredSettings();
      } catch (err) {
        console.warn("Failed to retrieve site_settings, using fallback:", err);
        return getStoredSettings();
      }
    },
    initialData: getStoredSettings,
    staleTime: 1000 * 60 * 10,
  });
};
