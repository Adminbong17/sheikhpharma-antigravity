CREATE TABLE public.doctor_category_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.doctor_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(doctor_id, category_id)
);

ALTER TABLE public.doctor_category_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read doctor_category_assignments" ON public.doctor_category_assignments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth manage doctor_category_assignments" ON public.doctor_category_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.doctor_category_assignments (doctor_id, category_id)
SELECT id, category_id FROM public.doctors WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;