
-- Create payment_methods table for footer payment icons
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Everyone can view active payment methods (public footer)
CREATE POLICY "Payment methods are publicly viewable"
ON public.payment_methods FOR SELECT
USING (true);

-- Only admins can manage payment methods
CREATE POLICY "Admins can insert payment methods"
ON public.payment_methods FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payment methods"
ON public.payment_methods FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payment methods"
ON public.payment_methods FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for payment method logos
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-icons', 'payment-icons', true);

CREATE POLICY "Payment icons are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-icons');

CREATE POLICY "Admins can upload payment icons"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-icons');

CREATE POLICY "Admins can update payment icons"
ON storage.objects FOR UPDATE
USING (bucket_id = 'payment-icons');

CREATE POLICY "Admins can delete payment icons"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-icons');
