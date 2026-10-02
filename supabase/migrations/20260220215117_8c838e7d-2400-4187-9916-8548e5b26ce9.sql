-- Create a security definer function to get parent message IDs for a user
CREATE OR REPLACE FUNCTION public.get_user_parent_message_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.messages WHERE sender_id = _user_id AND parent_id IS NULL;
$$;

-- Drop the broken policies
DROP POLICY IF EXISTS "Customers can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Customers can mark replies as read" ON public.messages;

-- Recreate: customers can see messages they sent OR replies to their threads
CREATE POLICY "Customers can view their messages"
ON public.messages FOR SELECT
USING (
  auth.uid() = sender_id
  OR parent_id IN (SELECT get_user_parent_message_ids(auth.uid()))
);

-- Customers can mark vendor replies as read
CREATE POLICY "Customers can mark replies as read"
ON public.messages FOR UPDATE
USING (
  parent_id IN (SELECT get_user_parent_message_ids(auth.uid()))
)
WITH CHECK (
  parent_id IN (SELECT get_user_parent_message_ids(auth.uid()))
);