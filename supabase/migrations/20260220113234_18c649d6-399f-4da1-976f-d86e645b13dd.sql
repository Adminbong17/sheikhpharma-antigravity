
-- Table for homepage sections (Flash Sale, Just For You, etc.)
CREATE TABLE public.homepage_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  subtitle text,
  section_type text NOT NULL DEFAULT 'grid', -- grid, carousel, banner
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Junction table: which products belong to which section
CREATE TABLE public.homepage_section_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id uuid NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(section_id, product_id)
);

-- RLS
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_section_products ENABLE ROW LEVEL SECURITY;

-- Anyone can view active sections
CREATE POLICY "Anyone can view active sections" ON public.homepage_sections FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert sections" ON public.homepage_sections FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update sections" ON public.homepage_sections FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete sections" ON public.homepage_sections FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view section products
CREATE POLICY "Anyone can view section products" ON public.homepage_section_products FOR SELECT USING (true);
CREATE POLICY "Admins can insert section products" ON public.homepage_section_products FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update section products" ON public.homepage_section_products FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete section products" ON public.homepage_section_products FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_homepage_sections_updated_at
BEFORE UPDATE ON public.homepage_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
