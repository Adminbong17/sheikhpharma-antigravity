CREATE TABLE public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  fixed_amount numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_links TO authenticated;
GRANT ALL ON public.payment_links TO service_role;

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active payment links"
ON public.payment_links FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage payment links"
ON public.payment_links FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.payment_link_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid REFERENCES public.payment_links(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  payer_name text,
  payer_phone text,
  payment_id text,
  trx_id text,
  status text NOT NULL DEFAULT 'pending',
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_link_payments TO authenticated;
GRANT ALL ON public.payment_link_payments TO service_role;

ALTER TABLE public.payment_link_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view payment link payments"
ON public.payment_link_payments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_plp_link ON public.payment_link_payments(link_id);
CREATE INDEX idx_plp_payment_id ON public.payment_link_payments(payment_id);