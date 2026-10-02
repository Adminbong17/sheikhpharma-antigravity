
-- Create vendors table
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  store_name TEXT NOT NULL,
  store_description TEXT,
  logo_url TEXT,
  phone TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  commission_rate NUMERIC NOT NULL DEFAULT 10,
  total_earnings NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Vendors can view their own vendor profile
CREATE POLICY "Vendors can view own profile" ON public.vendors
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Public can view approved vendors
CREATE POLICY "Anyone can view approved vendors" ON public.vendors
  FOR SELECT USING (status = 'approved');

-- Users can create vendor application
CREATE POLICY "Users can apply as vendor" ON public.vendors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Vendors can update own profile
CREATE POLICY "Vendors can update own profile" ON public.vendors
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete vendors
CREATE POLICY "Admins can delete vendors" ON public.vendors
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Add vendor_id to products
ALTER TABLE public.products ADD COLUMN vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;

-- Vendors can manage their own products
CREATE POLICY "Vendors can insert own products" ON public.products
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'vendor'::app_role) AND
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid() AND status = 'approved')
  );

CREATE POLICY "Vendors can update own products" ON public.products
  FOR UPDATE USING (
    has_role(auth.uid(), 'vendor'::app_role) AND
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

CREATE POLICY "Vendors can delete own products" ON public.products
  FOR DELETE USING (
    has_role(auth.uid(), 'vendor'::app_role) AND
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

-- Vendors can view orders containing their products
CREATE POLICY "Vendors can view orders with their products" ON public.orders
  FOR SELECT USING (
    has_role(auth.uid(), 'vendor'::app_role) AND
    id IN (
      SELECT oi.order_id FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      JOIN public.vendors v ON v.id = p.vendor_id
      WHERE v.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
