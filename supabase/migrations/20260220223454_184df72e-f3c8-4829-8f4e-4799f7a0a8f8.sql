
-- Create invoice number sequence
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'QBD-IV-' || LPAD(nextval('public.invoice_number_seq')::text, 11, '0');
END;
$$;

-- Create invoices table
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL UNIQUE DEFAULT public.generate_invoice_number(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  customer_name text,
  customer_phone text,
  customer_address text,
  customer_division text,
  customer_zilla text,
  customer_upazilla text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  delivery_charge numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  payment_method text,
  status text NOT NULL DEFAULT 'saved',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all invoices"
ON public.invoices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Vendors can view their own invoices
CREATE POLICY "Vendors can view own invoices"
ON public.invoices
FOR SELECT
USING (
  has_role(auth.uid(), 'vendor'::app_role) AND
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);

-- Updated at trigger
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
