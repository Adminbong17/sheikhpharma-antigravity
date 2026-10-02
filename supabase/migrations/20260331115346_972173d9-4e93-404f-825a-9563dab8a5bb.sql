ALTER TABLE public.sms_logs 
  ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS response jsonb,
  ADD COLUMN IF NOT EXISTS order_id text;