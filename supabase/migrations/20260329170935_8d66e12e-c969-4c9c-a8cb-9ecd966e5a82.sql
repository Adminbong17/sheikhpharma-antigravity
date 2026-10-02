
CREATE TABLE public.flash_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  end_time timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  banner_color text DEFAULT '#ef4444',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.flash_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage flash_deals" ON public.flash_deals FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read flash_deals" ON public.flash_deals FOR SELECT USING (true);

CREATE TABLE public.flash_deal_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.flash_deals(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  deal_price numeric DEFAULT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.flash_deal_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage flash_deal_products" ON public.flash_deal_products FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read flash_deal_products" ON public.flash_deal_products FOR SELECT USING (true);

CREATE TABLE public.section_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  link_url text,
  after_section_id uuid NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.section_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage section_banners" ON public.section_banners FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read section_banners" ON public.section_banners FOR SELECT USING (true);
