
-- Create categories table with icon_url
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Anyone can view subcategories
CREATE POLICY "Anyone can view subcategories" ON public.subcategories FOR SELECT USING (true);
CREATE POLICY "Admins can insert subcategories" ON public.subcategories FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update subcategories" ON public.subcategories FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete subcategories" ON public.subcategories FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for category icons
INSERT INTO storage.buckets (id, name, public) VALUES ('category-icons', 'category-icons', true);

CREATE POLICY "Anyone can view category icons" ON storage.objects FOR SELECT USING (bucket_id = 'category-icons');
CREATE POLICY "Admins can upload category icons" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'category-icons' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update category icons" ON storage.objects FOR UPDATE USING (bucket_id = 'category-icons' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete category icons" ON storage.objects FOR DELETE USING (bucket_id = 'category-icons' AND has_role(auth.uid(), 'admin'));

-- Seed with existing categories
INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Electronics', 'electronics', 0),
  ('Fashion', 'fashion', 1),
  ('Home & Living', 'home-living', 2),
  ('Groceries', 'groceries', 3),
  ('Health & Beauty', 'health-beauty', 4),
  ('Toys & Games', 'toys-games', 5),
  ('Sports', 'sports', 6),
  ('Automotive', 'automotive', 7);

-- Seed subcategories
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, s.name, s.slug, s.sort_order FROM public.categories c
CROSS JOIN LATERAL (VALUES
  ('Mobile Phones', 'mobile-phones', 0),
  ('Laptops', 'laptops', 1),
  ('Tablets', 'tablets', 2),
  ('Headphones', 'headphones', 3),
  ('Cameras', 'cameras', 4),
  ('Smart Watches', 'smart-watches', 5)
) AS s(name, slug, sort_order) WHERE c.slug = 'electronics';

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, s.name, s.slug, s.sort_order FROM public.categories c
CROSS JOIN LATERAL (VALUES
  ('Men''s Clothing', 'mens-clothing', 0),
  ('Women''s Clothing', 'womens-clothing', 1),
  ('Shoes', 'shoes', 2),
  ('Bags', 'bags', 3),
  ('Watches', 'watches', 4),
  ('Jewelry', 'jewelry', 5)
) AS s(name, slug, sort_order) WHERE c.slug = 'fashion';

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, s.name, s.slug, s.sort_order FROM public.categories c
CROSS JOIN LATERAL (VALUES
  ('Furniture', 'furniture', 0),
  ('Bedding & Pillows', 'bedding', 1),
  ('Kitchen Appliances', 'kitchen', 2),
  ('Bathroom', 'bathroom', 3),
  ('Decor', 'decor', 4)
) AS s(name, slug, sort_order) WHERE c.slug = 'home-living';

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, s.name, s.slug, s.sort_order FROM public.categories c
CROSS JOIN LATERAL (VALUES
  ('Fruits & Vegetables', 'fruits-vegetables', 0),
  ('Spices', 'spices', 1),
  ('Snacks', 'snacks', 2),
  ('Beverages', 'beverages', 3),
  ('Dairy', 'dairy', 4)
) AS s(name, slug, sort_order) WHERE c.slug = 'groceries';

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, s.name, s.slug, s.sort_order FROM public.categories c
CROSS JOIN LATERAL (VALUES
  ('Skincare', 'skincare', 0),
  ('Makeup', 'makeup', 1),
  ('Hair Care', 'haircare', 2),
  ('Perfume', 'perfume', 3),
  ('Health Tools', 'health-tools', 4)
) AS s(name, slug, sort_order) WHERE c.slug = 'health-beauty';

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, s.name, s.slug, s.sort_order FROM public.categories c
CROSS JOIN LATERAL (VALUES
  ('Kids Toys', 'kids-toys', 0),
  ('Board Games', 'board-games', 1),
  ('Puzzles', 'puzzles', 2),
  ('Outdoor Games', 'outdoor-games', 3)
) AS s(name, slug, sort_order) WHERE c.slug = 'toys-games';

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, s.name, s.slug, s.sort_order FROM public.categories c
CROSS JOIN LATERAL (VALUES
  ('Fitness Equipment', 'fitness-equipment', 0),
  ('Sportswear', 'sportswear', 1),
  ('Cricket', 'cricket', 2),
  ('Football', 'football', 3),
  ('Cycling', 'cycling', 4)
) AS s(name, slug, sort_order) WHERE c.slug = 'sports';

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, s.name, s.slug, s.sort_order FROM public.categories c
CROSS JOIN LATERAL (VALUES
  ('Car Parts', 'car-parts', 0),
  ('Bike Accessories', 'bike-accessories', 1),
  ('Car Decor', 'car-decor', 2),
  ('Oils & Lubricants', 'oils', 3)
) AS s(name, slug, sort_order) WHERE c.slug = 'automotive';
