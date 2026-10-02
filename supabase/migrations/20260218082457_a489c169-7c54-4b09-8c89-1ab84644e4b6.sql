
-- Function to auto-fill reviewer_name from profiles on review insert
CREATE OR REPLACE FUNCTION public.fill_reviewer_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reviewer_name IS NULL THEN
    SELECT COALESCE(username, split_part(email, '@', 1), 'Customer')
    INTO NEW.reviewer_name
    FROM public.profiles
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on insert
DROP TRIGGER IF EXISTS trigger_fill_reviewer_name ON public.product_reviews;
CREATE TRIGGER trigger_fill_reviewer_name
  BEFORE INSERT ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_reviewer_name();

-- Backfill existing reviews that don't have reviewer_name
UPDATE public.product_reviews pr
SET reviewer_name = COALESCE(p.username, split_part(p.email, '@', 1), 'Customer')
FROM public.profiles p
WHERE p.user_id = pr.user_id
  AND pr.reviewer_name IS NULL;
