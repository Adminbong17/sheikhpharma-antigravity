-- ==========================================================
-- POS SYSTEM — Phase 1: Database Foundation
-- ==========================================================

-- 1. POS Register Sessions (day open/close)
CREATE TABLE public.pos_register_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid,
  opened_by uuid NOT NULL,
  opening_cash numeric NOT NULL DEFAULT 0,
  closing_cash numeric,
  expected_cash numeric,
  cash_difference numeric,
  total_sales numeric DEFAULT 0,
  total_refunds numeric DEFAULT 0,
  total_transactions integer DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pos_register_sessions_vendor ON public.pos_register_sessions(vendor_id, status);
CREATE INDEX idx_pos_register_sessions_opened_by ON public.pos_register_sessions(opened_by);

ALTER TABLE public.pos_register_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pos_register_sessions"
  ON public.pos_register_sessions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors can manage own register sessions"
  ON public.pos_register_sessions FOR ALL
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));


-- 2. Held / Suspended sales
CREATE TABLE public.pos_held_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hold_reference text NOT NULL,
  vendor_id uuid,
  held_by uuid NOT NULL,
  customer_name text,
  customer_phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pos_held_sales_vendor ON public.pos_held_sales(vendor_id);
CREATE INDEX idx_pos_held_sales_held_by ON public.pos_held_sales(held_by);

ALTER TABLE public.pos_held_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pos_held_sales"
  ON public.pos_held_sales FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors can manage own held sales"
  ON public.pos_held_sales FOR ALL
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));


-- 3. Sales Returns (header)
CREATE TABLE public.sales_returns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_number text NOT NULL UNIQUE,
  original_order_id uuid,
  vendor_id uuid,
  register_session_id uuid,
  customer_name text,
  customer_phone text,
  customer_user_id uuid,
  total_refund numeric NOT NULL DEFAULT 0,
  refund_method text NOT NULL DEFAULT 'cash',
  status text NOT NULL DEFAULT 'pending',
  processed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_returns_order ON public.sales_returns(original_order_id);
CREATE INDEX idx_sales_returns_vendor ON public.sales_returns(vendor_id);
CREATE INDEX idx_sales_returns_status ON public.sales_returns(status);

ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sales_returns"
  ON public.sales_returns FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors can manage own sales returns"
  ON public.sales_returns FOR ALL
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Customers can read own returns"
  ON public.sales_returns FOR SELECT
  USING (customer_user_id = auth.uid());


-- 4. Sales Return items
CREATE TABLE public.sales_return_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id uuid NOT NULL,
  product_id uuid,
  product_name text,
  quantity integer NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  refund_amount numeric NOT NULL DEFAULT 0,
  restock boolean DEFAULT true,
  variant_info jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_return_items_return ON public.sales_return_items(return_id);

ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sales_return_items"
  ON public.sales_return_items FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors can manage own return items"
  ON public.sales_return_items FOR ALL
  USING (return_id IN (
    SELECT id FROM sales_returns
    WHERE vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  ))
  WITH CHECK (return_id IN (
    SELECT id FROM sales_returns
    WHERE vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  ));


-- 5. Stock Transfers (header)
CREATE TABLE public.stock_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_number text NOT NULL UNIQUE,
  from_vendor_id uuid,
  to_vendor_id uuid,
  transferred_by uuid NOT NULL,
  received_by uuid,
  status text NOT NULL DEFAULT 'pending',
  total_items integer DEFAULT 0,
  total_value numeric DEFAULT 0,
  notes text,
  dispatched_at timestamptz,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_transfers_from ON public.stock_transfers(from_vendor_id);
CREATE INDEX idx_stock_transfers_to ON public.stock_transfers(to_vendor_id);
CREATE INDEX idx_stock_transfers_status ON public.stock_transfers(status);

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stock_transfers"
  ON public.stock_transfers FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors can read own transfers"
  ON public.stock_transfers FOR SELECT
  USING (
    from_vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()) OR
    to_vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

CREATE POLICY "Vendors can update received transfers"
  ON public.stock_transfers FOR UPDATE
  USING (to_vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()))
  WITH CHECK (to_vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can insert outgoing transfers"
  ON public.stock_transfers FOR INSERT
  WITH CHECK (from_vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));


-- 6. Stock Transfer items
CREATE TABLE public.stock_transfer_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id uuid NOT NULL,
  product_id uuid,
  product_name text,
  quantity integer NOT NULL DEFAULT 1,
  unit_cost numeric DEFAULT 0,
  variant_info jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_transfer_items_transfer ON public.stock_transfer_items(transfer_id);

ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stock_transfer_items"
  ON public.stock_transfer_items FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors can manage transfer items"
  ON public.stock_transfer_items FOR ALL
  USING (transfer_id IN (
    SELECT id FROM stock_transfers
    WHERE from_vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
       OR to_vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  ))
  WITH CHECK (transfer_id IN (
    SELECT id FROM stock_transfers
    WHERE from_vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
       OR to_vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  ));


-- 7. Staff Commissions
CREATE TABLE public.staff_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL,
  order_id uuid,
  return_id uuid,
  vendor_id uuid,
  sale_amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  paid_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_commissions_staff ON public.staff_commissions(staff_id, status);
CREATE INDEX idx_staff_commissions_order ON public.staff_commissions(order_id);
CREATE INDEX idx_staff_commissions_vendor ON public.staff_commissions(vendor_id);

ALTER TABLE public.staff_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage staff_commissions"
  ON public.staff_commissions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors can manage own staff commissions"
  ON public.staff_commissions FOR ALL
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Staff can read own commissions"
  ON public.staff_commissions FOR SELECT
  USING (staff_id = auth.uid());


-- 8. Add POS-related columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_pos_sale boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS register_session_id uuid,
  ADD COLUMN IF NOT EXISTS staff_id uuid,
  ADD COLUMN IF NOT EXISTS amount_received numeric,
  ADD COLUMN IF NOT EXISTS change_returned numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vendor_id uuid;

CREATE INDEX IF NOT EXISTS idx_orders_register_session ON public.orders(register_session_id) WHERE register_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_staff ON public.orders(staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_pos ON public.orders(is_pos_sale, vendor_id) WHERE is_pos_sale = true;


-- 9. Helper sequences for human-readable numbers
CREATE SEQUENCE IF NOT EXISTS sales_return_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS stock_transfer_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS pos_hold_reference_seq START 1;