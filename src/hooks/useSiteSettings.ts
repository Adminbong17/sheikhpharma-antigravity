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
  id: "default-settings",
  site_name: "শেখ ফার্মা",
  site_title: "শেখ ফার্মা — মডেল ফার্মেসি ও হেলথকেয়ার",
  logo_url: "/pwa-192.png",
  favicon_url: "/favicon.ico",
  primary_color: "#0F3577",
  background_color: "#ffffff",
  foreground_color: "#0f172a",
  card_color: "#ffffff",
  accent_color: "#0284c7",
  border_color: "#e2e8f0",
  muted_color: "#f1f5f9",
  is_multivendor: true,
  updated_at: new Date().toISOString(),
};

const STORAGE_KEY = "sheikhpharma_site_settings";

const getStoredSettings = (): SiteSettings => {
  if (typeof window === "undefined") return DEFAULT_SITE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { ...DEFAULT_SITE_SETTINGS, ...parsed };
      }
    }
  } catch (err) {
    console.warn("Error reading cached site settings:", err);
  }
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
    staleTime: 1000 * 60 * 10, // 10 minutes cache freshness
  });
};
