
-- Vendor Payment Methods table
CREATE TABLE public.vendor_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  method_type text NOT NULL, -- 'bkash', 'nagad', 'bank'
  account_name text NOT NULL,
  account_number text NOT NULL,
  bank_name text,
  branch_name text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_payment_methods ENABLE ROW LEVEL SECURITY;

-- Vendors can CRUD their own payment methods
CREATE POLICY "Vendors can view own payment methods"
  ON public.vendor_payment_methods FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors can insert own payment methods"
  ON public.vendor_payment_methods FOR INSERT
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can update own payment methods"
  ON public.vendor_payment_methods FOR UPDATE
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can delete own payment methods"
  ON public.vendor_payment_methods FOR DELETE
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Vendor Payouts table
CREATE TABLE public.vendor_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'done'
  payment_method_id uuid REFERENCES public.vendor_payment_methods(id) ON DELETE SET NULL,
  admin_trx_id text,
  admin_method text,
  admin_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;

-- Vendors can view and insert their own payouts
CREATE POLICY "Vendors can view own payouts"
  ON public.vendor_payouts FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors can insert own payouts"
  ON public.vendor_payouts FOR INSERT
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Admins can update payouts
CREATE POLICY "Admins can update payouts"
  ON public.vendor_payouts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Admins can delete payouts
CREATE POLICY "Admins can delete payouts"
  ON public.vendor_payouts FOR DELETE
  USING (has_role(auth.uid(), 'admin'));
