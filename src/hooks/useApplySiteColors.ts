import { useEffect } from "react";
import { useSiteSettings } from "./useSiteSettings";

export const useApplySiteColors = () => {
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    const set = (prop: string, val: string | null) => {
      if (val) root.style.setProperty(prop, val);
    };
    set("--primary", settings.primary_color);
    set("--accent", settings.accent_color);
    set("--background", settings.background_color);
    set("--foreground", settings.foreground_color);
    set("--card", settings.card_color);
    set("--border", settings.border_color);
    set("--input", settings.border_color);
    set("--muted", settings.muted_color);
    set("--ring", settings.primary_color);
    set("--sidebar-primary", settings.primary_color);
    set("--sidebar-ring", settings.primary_color);
    set("--accent-foreground", "0 0% 100%");
    set("--primary-foreground", "0 0% 100%");
  }, [settings]);
};
