
CREATE OR REPLACE FUNCTION public.increment_preorder_count(p_id uuid, qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products SET preorder_count = preorder_count + qty WHERE id = p_id AND is_preorder = true;
END;
$$;
