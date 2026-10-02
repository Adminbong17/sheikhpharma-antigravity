
CREATE TABLE public.section_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  link_url text,
  after_section_id uuid REFERENCES public.homepage_sections(id) ON DELETE CASCADE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.section_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active section banners" ON public.section_banners
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert section banners" ON public.section_banners
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update section banners" ON public.section_banners
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete section banners" ON public.section_banners
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
