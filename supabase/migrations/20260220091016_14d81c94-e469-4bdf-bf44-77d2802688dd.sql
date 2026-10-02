
-- Create incomplete order type enum
CREATE TYPE public.incomplete_order_type AS ENUM ('abandoned_cart', 'draft', 'pending_followup');
CREATE TYPE public.incomplete_order_status AS ENUM ('open', 'contacted', 'converted', 'lost', 'cancelled');

-- Create incomplete_orders table
CREATE TABLE public.incomplete_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type incomplete_order_type NOT NULL DEFAULT 'draft',
  status incomplete_order_status NOT NULL DEFAULT 'open',
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_address text,
  customer_division text,
  customer_zilla text,
  customer_upazilla text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  notes text,
  follow_up_date timestamp with time zone,
  last_contacted_at timestamp with time zone,
  converted_order_id uuid REFERENCES public.orders(id),
  user_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incomplete_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can do everything with incomplete orders"
ON public.incomplete_orders FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Vendors can view incomplete orders for their products"
ON public.incomplete_orders FOR SELECT
USING (has_role(auth.uid(), 'vendor'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_incomplete_orders_updated_at
BEFORE UPDATE ON public.incomplete_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
