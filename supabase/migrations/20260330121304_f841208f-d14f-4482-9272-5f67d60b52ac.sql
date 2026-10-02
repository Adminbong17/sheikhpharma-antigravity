
CREATE TABLE public.lab_center_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.lab_centers(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.lab_tests(id) ON DELETE CASCADE,
  price numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(center_id, test_id)
);

ALTER TABLE public.lab_center_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lab_center_tests" ON public.lab_center_tests
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read lab_center_tests" ON public.lab_center_tests
  FOR SELECT TO public USING (true);
