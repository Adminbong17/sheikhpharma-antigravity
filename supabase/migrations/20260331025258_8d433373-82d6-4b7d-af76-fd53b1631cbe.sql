CREATE TABLE public.blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  location TEXT NOT NULL,
  details TEXT,
  type TEXT NOT NULL DEFAULT 'need',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert blood requests" ON public.blood_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read blood requests" ON public.blood_requests FOR SELECT TO authenticated USING (true);