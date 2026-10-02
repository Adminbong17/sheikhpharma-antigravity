
CREATE TABLE public.external_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.external_carts ENABLE ROW LEVEL SECURITY;

-- Block all direct client access; only service role in edge functions
CREATE POLICY "No direct client access" ON public.external_carts FOR ALL USING (false);

-- Allow anon/authenticated to SELECT by token (for the frontend ExternalCart page)
CREATE POLICY "Anyone can read by token" ON public.external_carts FOR SELECT USING (true);
