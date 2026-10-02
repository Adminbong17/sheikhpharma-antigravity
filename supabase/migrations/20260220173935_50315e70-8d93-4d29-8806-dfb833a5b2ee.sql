-- Allow admins to insert messages (send to vendors)
CREATE POLICY "Admins can send messages"
ON public.messages
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = sender_id);

-- Allow admins to update messages (mark as read)
CREATE POLICY "Admins can update messages"
ON public.messages
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));