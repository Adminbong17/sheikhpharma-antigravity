
-- Table for people who hold money
CREATE TABLE public.money_holders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.money_holders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage money holders" ON public.money_holders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Table for tracking which order's money is with which person
CREATE TABLE public.order_money_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  holder_id uuid REFERENCES public.money_holders(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  tracking_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.order_money_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage order money tracking" ON public.order_money_tracking
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
