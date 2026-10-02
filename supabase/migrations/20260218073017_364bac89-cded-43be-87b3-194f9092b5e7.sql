-- Create delivery_zones table for location-based COD charges
CREATE TABLE public.delivery_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  division text NOT NULL,
  zilla text,
  upazilla text,
  charge numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add check constraint: if upazilla is set, zilla must also be set
ALTER TABLE public.delivery_zones
  ADD CONSTRAINT upazilla_requires_zilla CHECK (
    upazilla IS NULL OR zilla IS NOT NULL
  );

-- Enable RLS
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Anyone can view delivery zones (needed for checkout)
CREATE POLICY "Anyone can view delivery zones"
  ON public.delivery_zones
  FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert delivery zones"
  ON public.delivery_zones
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Admins can update delivery zones"
  ON public.delivery_zones
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete delivery zones"
  ON public.delivery_zones
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at
CREATE TRIGGER update_delivery_zones_updated_at
  BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
