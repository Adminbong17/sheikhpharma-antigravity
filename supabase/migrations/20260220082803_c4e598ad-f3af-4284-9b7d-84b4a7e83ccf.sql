
ALTER TABLE public.marketing_settings
ADD COLUMN google_analytics_id text DEFAULT '',
ADD COLUMN ga_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN gtm_id text DEFAULT '',
ADD COLUMN gtm_enabled boolean NOT NULL DEFAULT false;
