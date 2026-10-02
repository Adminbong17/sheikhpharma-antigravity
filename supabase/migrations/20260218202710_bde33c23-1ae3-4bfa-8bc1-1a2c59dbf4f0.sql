-- Add admin SELECT policy for support_ticket_messages (was missing)
CREATE POLICY "Admins can view all ticket messages"
  ON public.support_ticket_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Also fix customer side: allow users to view messages for their own tickets (add explicit policy)
-- The existing policy already handles this, but let's make sure admin UPDATE works for ticket status
CREATE POLICY "Users can update ticket status"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() = user_id);
