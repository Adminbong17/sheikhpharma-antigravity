
-- Refund requests table
CREATE TABLE public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  order_item_id uuid REFERENCES public.order_items(id),
  user_id uuid NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id),
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  admin_trx_id text,
  admin_method text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own refund requests" ON public.refund_requests FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create refund requests" ON public.refund_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update refund requests" ON public.refund_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete refund requests" ON public.refund_requests FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Vendors can view refund requests for their products" ON public.refund_requests FOR SELECT USING (has_role(auth.uid(), 'vendor'::app_role) AND vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Customer credits table (tracks credit/debit transactions)
CREATE TABLE public.customer_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'credit',
  reference_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON public.customer_credits FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert credits" ON public.customer_credits FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete credits" ON public.customer_credits FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Customer credit payouts (customer requests payment of their credit balance)
CREATE TABLE public.customer_credit_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'bkash',
  account_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_trx_id text,
  admin_method text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE public.customer_credit_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit payouts" ON public.customer_credit_payouts FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create credit payouts" ON public.customer_credit_payouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update credit payouts" ON public.customer_credit_payouts FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete credit payouts" ON public.customer_credit_payouts FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
