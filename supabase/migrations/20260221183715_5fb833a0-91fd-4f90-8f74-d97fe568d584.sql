
-- Fix vendor FK constraints to CASCADE on delete
ALTER TABLE public.products DROP CONSTRAINT products_vendor_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;

ALTER TABLE public.invoices DROP CONSTRAINT invoices_vendor_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;

ALTER TABLE public.messages DROP CONSTRAINT messages_vendor_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;

ALTER TABLE public.refund_requests DROP CONSTRAINT refund_requests_vendor_id_fkey;
ALTER TABLE public.refund_requests ADD CONSTRAINT refund_requests_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;
