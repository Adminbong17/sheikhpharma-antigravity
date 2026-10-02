
ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_area text;
ALTER TABLE public.incomplete_orders ADD COLUMN IF NOT EXISTS customer_area text;
ALTER TABLE public.prescription_orders ADD COLUMN IF NOT EXISTS customer_area text;
ALTER TABLE public.lab_test_bookings ADD COLUMN IF NOT EXISTS customer_area text;
