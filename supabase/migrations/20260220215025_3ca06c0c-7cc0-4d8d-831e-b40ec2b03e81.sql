-- Drop restrictive customer policies
DROP POLICY "Customers can view their messages" ON public.messages;

-- Customers can view messages they sent OR replies to their threads
CREATE POLICY "Customers can view their messages"
ON public.messages FOR SELECT
USING (
  auth.uid() = sender_id
  OR parent_id IN (SELECT id FROM public.messages m WHERE m.sender_id = auth.uid())
);

-- Allow customers to mark replies as read
CREATE POLICY "Customers can mark replies as read"
ON public.messages FOR UPDATE
USING (
  parent_id IN (SELECT id FROM public.messages m WHERE m.sender_id = auth.uid())
)
WITH CHECK (
  parent_id IN (SELECT id FROM public.messages m WHERE m.sender_id = auth.uid())
);