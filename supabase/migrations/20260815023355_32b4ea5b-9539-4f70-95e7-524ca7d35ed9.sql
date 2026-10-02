ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS brand_logo_url text,
  ADD COLUMN IF NOT EXISTS brand_color text,
  ADD COLUMN IF NOT EXISTS brand_website text,
  ADD COLUMN IF NOT EXISTS brand_footer_note text,
  ADD COLUMN IF NOT EXISTS hide_site_chrome boolean NOT NULL DEFAULT false;