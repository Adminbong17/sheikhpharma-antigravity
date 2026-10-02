ALTER TABLE public.homepage_left_menu_products
  ADD CONSTRAINT homepage_left_menu_products_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;