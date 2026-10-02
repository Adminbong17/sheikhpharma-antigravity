
CREATE TABLE public.banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view banks" ON public.banks FOR SELECT USING (true);
CREATE POLICY "Admins can manage banks" ON public.banks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.banks (name, sort_order) VALUES
  ('Sonali Bank', 1),
  ('Janata Bank', 2),
  ('Agrani Bank', 3),
  ('Rupali Bank', 4),
  ('Bangladesh Development Bank', 5),
  ('BASIC Bank', 6),
  ('Bangladesh Krishi Bank', 7),
  ('Rajshahi Krishi Unnayan Bank', 8),
  ('Pubali Bank', 9),
  ('Uttara Bank', 10),
  ('AB Bank', 11),
  ('IFIC Bank', 12),
  ('National Bank', 13),
  ('The City Bank', 14),
  ('United Commercial Bank (UCB)', 15),
  ('Eastern Bank (EBL)', 16),
  ('BRAC Bank', 17),
  ('Dutch-Bangla Bank (DBBL)', 18),
  ('Dhaka Bank', 19),
  ('Southeast Bank', 20),
  ('Prime Bank', 21),
  ('Mutual Trust Bank (MTB)', 22),
  ('Standard Bank', 23),
  ('One Bank', 24),
  ('Islami Bank Bangladesh', 25),
  ('Shahjalal Islami Bank', 26),
  ('Al-Arafah Islami Bank', 27),
  ('EXIM Bank', 28),
  ('Social Islami Bank (SIBL)', 29),
  ('First Security Islami Bank', 30),
  ('Union Bank', 31),
  ('Mercantile Bank', 32),
  ('Trust Bank', 33),
  ('Bank Asia', 34),
  ('NRB Bank', 35),
  ('Midland Bank', 36),
  ('Modhumoti Bank', 37),
  ('NRB Commercial Bank', 38),
  ('NRB Global Bank', 39),
  ('Meghna Bank', 40),
  ('Padma Bank', 41),
  ('Standard Chartered Bangladesh', 42),
  ('HSBC Bangladesh', 43),
  ('Commercial Bank of Ceylon', 44),
  ('Woori Bank', 45),
  ('Nagad', 46),
  ('bKash', 47),
  ('Rocket', 48);
