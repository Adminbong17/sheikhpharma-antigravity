
-- Flash deals with timer
CREATE TABLE public.flash_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Super Deals',
  end_time timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flash_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active flash deals"
  ON public.flash_deals FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage flash deals"
  ON public.flash_deals FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Flash deal products junction
CREATE TABLE public.flash_deal_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.flash_deals(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(deal_id, product_id)
);

ALTER TABLE public.flash_deal_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read flash deal products"
  ON public.flash_deal_products FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage flash deal products"
  ON public.flash_deal_products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
