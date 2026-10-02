ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_division text,
  ADD COLUMN IF NOT EXISTS customer_zilla text,
  ADD COLUMN IF NOT EXISTS customer_upazilla text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'saved',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.invoices ALTER COLUMN invoice_number DROP NOT NULL;

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq;

CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_invoice_number_trg ON public.invoices;
CREATE TRIGGER set_invoice_number_trg
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.set_invoice_number();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.invoice_number_seq TO authenticated, service_role;

DROP POLICY IF EXISTS "Vendors can insert own invoices" ON public.invoices;
CREATE POLICY "Vendors can insert own invoices" ON public.invoices
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  OR vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Vendors can update own invoices" ON public.invoices;
CREATE POLICY "Vendors can update own invoices" ON public.invoices
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid())
);