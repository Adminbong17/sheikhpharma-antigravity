
-- Auto-deduct stock when order items are inserted
CREATE OR REPLACE FUNCTION public.deduct_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE products
  SET stock = GREATEST(stock - NEW.quantity, 0),
      sold_count = COALESCE(sold_count, 0) + NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER deduct_stock_after_order_item
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.deduct_stock_on_order();
