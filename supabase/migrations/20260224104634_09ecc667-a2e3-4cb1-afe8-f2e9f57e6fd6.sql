
CREATE OR REPLACE FUNCTION public.prevent_duplicate_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check duplicate by name + vendor_id
  IF EXISTS (
    SELECT 1 FROM products
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(NEW.name))
      AND vendor_id IS NOT DISTINCT FROM NEW.vendor_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Duplicate product: A product with the same name already exists for this vendor.';
  END IF;

  -- Check duplicate by SKU (only if SKU is not null/empty)
  IF NEW.sku IS NOT NULL AND TRIM(NEW.sku) != '' THEN
    IF EXISTS (
      SELECT 1 FROM products
      WHERE LOWER(TRIM(sku)) = LOWER(TRIM(NEW.sku))
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Duplicate SKU: A product with SKU "%" already exists.', NEW.sku;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on INSERT and UPDATE
CREATE TRIGGER check_duplicate_product
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_product();
