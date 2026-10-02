
-- Create unified notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,  -- NULL means for all admins
  target_role text NOT NULL DEFAULT 'admin',  -- 'admin', 'vendor', 'user'
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'info',  -- info, order, refund, payout, vendor, review, etc.
  action_url text,  -- e.g. /admin/orders, /vendor/orders, /dashboard/orders
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admins can see all admin notifications
CREATE POLICY "Admins can view admin notifications"
ON public.notifications
FOR SELECT
USING (
  (target_role = 'admin' AND has_role(auth.uid(), 'admin'::app_role))
  OR (user_id = auth.uid())
);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage notifications"
ON public.notifications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid());

-- Anyone authenticated can insert (for triggers/functions)
CREATE POLICY "Authenticated can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_target_role ON public.notifications(target_role);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Migrate existing admin_notifications to new table
INSERT INTO public.notifications (title, body, type, target_role, is_read, metadata, created_at)
SELECT title, body, type, 'admin', is_read, metadata, created_at
FROM public.admin_notifications;
