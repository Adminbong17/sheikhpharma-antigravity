
CREATE TABLE public.lab_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'diagnostic',
  phone text,
  address text,
  division text,
  zilla text,
  upazilla text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.lab_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lab_centers" ON public.lab_centers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read active lab_centers" ON public.lab_centers FOR SELECT USING (true);
