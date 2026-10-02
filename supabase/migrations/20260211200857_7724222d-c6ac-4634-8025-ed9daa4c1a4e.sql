
-- Create brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved brands" ON public.brands FOR SELECT USING (status = 'approved' OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert brands" ON public.brands FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update brands" ON public.brands FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete brands" ON public.brands FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create brand_requests table for vendors to request new brands
CREATE TABLE public.brand_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own brand requests" ON public.brand_requests FOR SELECT USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Vendors can insert brand requests" ON public.brand_requests FOR INSERT WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid() AND status = 'approved'));
CREATE POLICY "Admins can update brand requests" ON public.brand_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete brand requests" ON public.brand_requests FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create product_images table for multiple images
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Admins can insert product images" ON public.product_images FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete product images" ON public.product_images FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Vendors can insert own product images" ON public.product_images FOR INSERT WITH CHECK (has_role(auth.uid(), 'vendor'::app_role) AND product_id IN (SELECT p.id FROM products p JOIN vendors v ON v.id = p.vendor_id WHERE v.user_id = auth.uid()));
CREATE POLICY "Vendors can delete own product images" ON public.product_images FOR DELETE USING (has_role(auth.uid(), 'vendor'::app_role) AND product_id IN (SELECT p.id FROM products p JOIN vendors v ON v.id = p.vendor_id WHERE v.user_id = auth.uid()));

-- Add brand_id to products
ALTER TABLE public.products ADD COLUMN brand_id UUID REFERENCES public.brands(id);
