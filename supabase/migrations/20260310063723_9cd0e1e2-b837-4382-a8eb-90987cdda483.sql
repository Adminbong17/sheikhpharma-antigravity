
-- SMS Settings table
CREATE TABLE public.sms_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url text NOT NULL DEFAULT 'https://smpp.revesms.com:7790/sendtext',
  api_key text NOT NULL DEFAULT '',
  secret_key text NOT NULL DEFAULT '',
  caller_id text NOT NULL DEFAULT '',
  is_enabled boolean NOT NULL DEFAULT false,
  -- Event toggles
  on_new_order boolean NOT NULL DEFAULT true,
  on_order_confirmed boolean NOT NULL DEFAULT true,
  on_order_shipped boolean NOT NULL DEFAULT true,
  on_order_delivered boolean NOT NULL DEFAULT true,
  on_order_cancelled boolean NOT NULL DEFAULT true,
  on_payment_received boolean NOT NULL DEFAULT true,
  on_refund_approved boolean NOT NULL DEFAULT true,
  -- Recipient toggles
  notify_admin boolean NOT NULL DEFAULT true,
  notify_customer boolean NOT NULL DEFAULT true,
  notify_vendor boolean NOT NULL DEFAULT true,
  -- Admin phone
  admin_phone text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sms settings" ON public.sms_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view sms settings" ON public.sms_settings
  FOR SELECT USING (true);

-- SMS Logs table
CREATE TABLE public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  message text NOT NULL,
  event_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'pending',
  response jsonb,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sms logs" ON public.sms_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings row
INSERT INTO public.sms_settings (id) VALUES (gen_random_uuid());
