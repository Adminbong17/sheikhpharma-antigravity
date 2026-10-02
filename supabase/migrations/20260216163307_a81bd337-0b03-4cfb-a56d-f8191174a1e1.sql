
ALTER TABLE public.site_settings
  ADD COLUMN primary_color text DEFAULT '24 95% 53%',
  ADD COLUMN background_color text DEFAULT '0 0% 96%',
  ADD COLUMN foreground_color text DEFAULT '0 0% 12%',
  ADD COLUMN card_color text DEFAULT '0 0% 100%',
  ADD COLUMN accent_color text DEFAULT '24 100% 48%',
  ADD COLUMN border_color text DEFAULT '0 0% 88%',
  ADD COLUMN muted_color text DEFAULT '0 0% 93%';
