
-- Create marketing_settings table (single-row config)
CREATE TABLE public.marketing_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facebook_pixel_id text DEFAULT '',
  pixel_enabled boolean NOT NULL DEFAULT false,
  pixel_test_mode boolean NOT NULL DEFAULT false,
  default_currency text NOT NULL DEFAULT 'BDT',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default row
INSERT INTO public.marketing_settings (facebook_pixel_id, pixel_enabled, pixel_test_mode, default_currency)
VALUES ('', false, false, 'BDT');

-- Enable RLS
ALTER TABLE public.marketing_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for pixel injection on frontend)
CREATE POLICY "Anyone can view marketing settings"
ON public.marketing_settings FOR SELECT
USING (true);

-- Only admins can update
CREATE POLICY "Admins can update marketing settings"
ON public.marketing_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert
CREATE POLICY "Admins can insert marketing settings"
ON public.marketing_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_marketing_settings_updated_at
BEFORE UPDATE ON public.marketing_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
