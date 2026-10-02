CREATE TABLE public.homepage_left_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.homepage_left_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read homepage_left_menu_items"
ON public.homepage_left_menu_items FOR SELECT USING (true);

CREATE POLICY "Admins can manage homepage_left_menu_items"
ON public.homepage_left_menu_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.homepage_left_menu_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.homepage_left_menu_items(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(menu_item_id, product_id)
);

ALTER TABLE public.homepage_left_menu_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read homepage_left_menu_products"
ON public.homepage_left_menu_products FOR SELECT USING (true);

CREATE POLICY "Admins can manage homepage_left_menu_products"
ON public.homepage_left_menu_products FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_hlmp_menu_item ON public.homepage_left_menu_products(menu_item_id);