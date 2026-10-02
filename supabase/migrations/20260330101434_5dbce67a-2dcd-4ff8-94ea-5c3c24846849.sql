CREATE TABLE public.prescription_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  customer_address text,
  customer_division text,
  customer_zilla text,
  customer_upazilla text,
  prescription_url text,
  notes text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.prescription_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prescription_orders"
  ON public.prescription_orders FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert prescription_orders"
  ON public.prescription_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read own prescription_orders"
  ON public.prescription_orders FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));