
-- Activity logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  details text,
  entity_type text,
  entity_id text,
  ip_address text,
  device_info text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Vendors can view own logs
CREATE POLICY "Vendors can view own activity logs"
ON public.activity_logs
FOR SELECT
USING (auth.uid() = user_id AND has_role(auth.uid(), 'vendor'::app_role));

-- Insert via service role (edge function) - no user insert policy needed
-- The edge function uses service_role key

-- Index for faster queries
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
