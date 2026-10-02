
-- Junction table: subcategory <-> brand
CREATE TABLE public.subcategory_brands (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcategory_id uuid NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(subcategory_id, brand_id)
);

ALTER TABLE public.subcategory_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subcategory brands"
  ON public.subcategory_brands FOR SELECT USING (true);

CREATE POLICY "Admins can insert subcategory brands"
  ON public.subcategory_brands FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete subcategory brands"
  ON public.subcategory_brands FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
