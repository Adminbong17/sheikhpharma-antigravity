ALTER TABLE public.payment_links ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'payment';

CREATE TABLE IF NOT EXISTS public.payment_link_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.payment_links(id) ON DELETE CASCADE,
  name text,
  phone text,
  phone_verified boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.payment_link_submissions TO authenticated;
GRANT ALL ON public.payment_link_submissions TO service_role;

ALTER TABLE public.payment_link_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view submissions" ON public.payment_link_submissions
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete submissions" ON public.payment_link_submissions
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_pls_link_id ON public.payment_link_submissions(link_id);