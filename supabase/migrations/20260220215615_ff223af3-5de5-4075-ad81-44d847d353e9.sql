-- Add foreign key from messages.vendor_id to vendors.id
ALTER TABLE public.messages
ADD CONSTRAINT messages_vendor_id_fkey
FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);