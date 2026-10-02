ALTER TABLE public.homepage_left_menu_items
ADD COLUMN IF NOT EXISTS link_url text,
ADD COLUMN IF NOT EXISTS use_link boolean NOT NULL DEFAULT false;