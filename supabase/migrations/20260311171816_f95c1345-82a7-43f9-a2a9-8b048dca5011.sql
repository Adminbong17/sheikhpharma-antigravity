
-- Auto cash_out when investment expense is added
CREATE OR REPLACE FUNCTION public.auto_cashbook_on_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO cash_transactions (type, amount, transaction_id, description, category, transaction_date, created_by)
  VALUES (
    'cash_out',
    NEW.amount,
    'EXP-' || LEFT(NEW.id::text, 8),
    NEW.name,
    'Investment Expense',
    NEW.expense_date,
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cashbook_expense
AFTER INSERT ON investment_expenses
FOR EACH ROW EXECUTE FUNCTION auto_cashbook_on_expense();

-- Auto cash_out when purchase invoice is added
CREATE OR REPLACE FUNCTION public.auto_cashbook_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO cash_transactions (type, amount, transaction_id, description, category, transaction_date, created_by)
  VALUES (
    'cash_out',
    NEW.total,
    'PUR-' || LEFT(NEW.id::text, 8),
    COALESCE(NEW.supplier_name, 'Product Purchase'),
    'Product Purchase',
    NEW.purchase_date,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cashbook_purchase
AFTER INSERT ON purchase_invoices
FOR EACH ROW EXECUTE FUNCTION auto_cashbook_on_purchase();

-- Auto cash_in when order status changes to 'delivered'
CREATE OR REPLACE FUNCTION public.auto_cashbook_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    INSERT INTO cash_transactions (type, amount, transaction_id, description, category, transaction_date, created_by)
    VALUES (
      'cash_in',
      NEW.total,
      'ORD-' || NEW.order_number::text,
      COALESCE(NEW.customer_name, 'Order') || ' - ' || NEW.payment_method,
      'Order Delivery',
      CURRENT_DATE,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cashbook_delivery
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION auto_cashbook_on_delivery();
