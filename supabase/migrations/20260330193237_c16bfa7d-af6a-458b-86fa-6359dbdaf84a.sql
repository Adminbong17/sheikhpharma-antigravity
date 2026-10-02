CREATE TABLE public.lab_test_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  customer_name text,
  customer_phone text,
  customer_address text,
  customer_division text,
  customer_zilla text,
  customer_upazilla text,
  items jsonb DEFAULT '[]'::jsonb,
  service_charge numeric DEFAULT 200,
  total numeric DEFAULT 0,
  status text DEFAULT 'pending',
  payment_status text DEFAULT 'unpaid',
  transaction_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.lab_test_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lab_test_bookings" ON public.lab_test_bookings
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert lab_test_bookings" ON public.lab_test_bookings
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Users can read own lab_test_bookings" ON public.lab_test_bookings
  FOR SELECT TO public USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));