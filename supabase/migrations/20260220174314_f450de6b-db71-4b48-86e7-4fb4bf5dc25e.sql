-- Add foreign key from messages.product_id to products.id
ALTER TABLE public.messages
ADD CONSTRAINT messages_product_id_fkey
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;