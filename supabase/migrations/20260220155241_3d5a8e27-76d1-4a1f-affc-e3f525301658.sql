
CREATE TABLE public.static_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.static_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active static pages"
  ON public.static_pages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage static pages"
  ON public.static_pages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.static_pages (slug, title, content) VALUES
  ('help-center', 'Help Center', '<h2>Help Center</h2><p>Welcome to our Help Center.</p>'),
  ('how-to-buy', 'How to Buy', '<h2>How to Buy</h2><p>Follow these steps to place your order.</p>'),
  ('returns-refunds', 'Returns & Refunds', '<h2>Returns & Refunds</h2><p>Our return and refund policies.</p>'),
  ('contact-us', 'Contact Us', '<h2>Contact Us</h2><p>Get in touch with us.</p>'),
  ('about', 'About Us', '<h2>About Us</h2><p>Learn more about our company.</p>'),
  ('careers', 'Careers', '<h2>Careers</h2><p>Join our team!</p>'),
  ('privacy-policy', 'Privacy Policy', '<h2>Privacy Policy</h2><p>Your privacy matters.</p>'),
  ('terms-conditions', 'Terms & Conditions', '<h2>Terms & Conditions</h2><p>Please read carefully.</p>');

CREATE TRIGGER update_static_pages_updated_at
  BEFORE UPDATE ON public.static_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
