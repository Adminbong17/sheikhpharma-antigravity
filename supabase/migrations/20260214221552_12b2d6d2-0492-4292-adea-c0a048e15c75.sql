
-- Add slug column to products
ALTER TABLE public.products ADD COLUMN slug text;

-- Create unique index on slug
CREATE UNIQUE INDEX idx_products_slug ON public.products(slug) WHERE slug IS NOT NULL;

-- Function to generate slug from product name
CREATE OR REPLACE FUNCTION public.generate_product_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Convert name to lowercase, replace non-alphanumeric with hyphens, trim
  base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(trim(base_slug), '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- If empty, use product id
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := NEW.id::text;
  END IF;
  
  -- Ensure uniqueness
  final_slug := base_slug;
  LOOP
    -- Check if slug exists (excluding current record on update)
    IF NOT EXISTS (
      SELECT 1 FROM products WHERE slug = final_slug AND id != NEW.id
    ) THEN
      EXIT;
    END IF;
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate slug on insert/update
CREATE TRIGGER generate_product_slug_trigger
BEFORE INSERT OR UPDATE OF name ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.generate_product_slug();

-- Populate slugs for existing products
UPDATE public.products SET slug = NULL WHERE slug IS NULL;
-- The trigger won't fire on this update since we're not updating 'name'.
-- So let's do it by updating name to itself:
UPDATE public.products SET name = name;
