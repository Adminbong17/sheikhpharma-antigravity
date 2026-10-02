
-- Create currencies table
CREATE TABLE public.currencies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  symbol text NOT NULL,
  exchange_rate numeric NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Anyone can view active currencies
CREATE POLICY "Anyone can view active currencies" ON public.currencies
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage currencies
CREATE POLICY "Admins can insert currencies" ON public.currencies
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update currencies" ON public.currencies
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete currencies" ON public.currencies
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_currencies_updated_at
  BEFORE UPDATE ON public.currencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default currencies
INSERT INTO public.currencies (code, name, symbol, exchange_rate, is_default) VALUES
  ('BDT', 'Bangladeshi Taka', '৳', 1, true),
  ('USD', 'US Dollar', '$', 0.0091, false),
  ('EUR', 'Euro', '€', 0.0084, false),
  ('GBP', 'British Pound', '£', 0.0072, false);
