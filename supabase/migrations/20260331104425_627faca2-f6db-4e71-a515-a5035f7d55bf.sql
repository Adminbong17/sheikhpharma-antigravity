-- Create doctor_categories table
CREATE TABLE public.doctor_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.doctor_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read doctor_categories" ON public.doctor_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage doctor_categories" ON public.doctor_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add category_id to doctors
ALTER TABLE public.doctors ADD COLUMN category_id uuid REFERENCES public.doctor_categories(id) ON DELETE SET NULL;