
-- Create vendor_follows table
CREATE TABLE public.vendor_follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, vendor_id)
);

-- Enable RLS
ALTER TABLE public.vendor_follows ENABLE ROW LEVEL SECURITY;

-- Users can follow/unfollow
CREATE POLICY "Users can insert own follows"
  ON public.vendor_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own follows"
  ON public.vendor_follows FOR DELETE
  USING (auth.uid() = user_id);

-- Users can view their own follows; vendors/admins can see who follows them
CREATE POLICY "Users can view own follows"
  ON public.vendor_follows FOR SELECT
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR vendor_id IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()
    )
  );
