
CREATE TABLE public.hero_slides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  subtitle text,
  image_url text NOT NULL,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active slides" ON public.hero_slides
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert slides" ON public.hero_slides
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update slides" ON public.hero_slides
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete slides" ON public.hero_slides
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for hero images
INSERT INTO storage.buckets (id, name, public) VALUES ('hero-slides', 'hero-slides', true);

CREATE POLICY "Anyone can view hero slides" ON storage.objects
  FOR SELECT USING (bucket_id = 'hero-slides');

CREATE POLICY "Admins can upload hero slides" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'hero-slides' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete hero slides" ON storage.objects
  FOR DELETE USING (bucket_id = 'hero-slides' AND has_role(auth.uid(), 'admin'::app_role));
