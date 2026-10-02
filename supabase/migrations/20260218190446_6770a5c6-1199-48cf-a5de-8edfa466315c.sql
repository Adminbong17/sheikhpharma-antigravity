
-- Create messages table for customer-vendor messaging
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  product_id uuid NULL,
  order_id uuid NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  parent_id uuid NULL REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Customers can insert messages (as sender)
CREATE POLICY "Customers can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Vendors can reply to messages (sender_id = their user_id)
CREATE POLICY "Vendors can reply to messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  has_role(auth.uid(), 'vendor'::app_role) AND
  vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
);

-- Customers can view messages they sent or received (as conversation partner)
CREATE POLICY "Customers can view their messages"
ON public.messages
FOR SELECT
USING (auth.uid() = sender_id);

-- Vendors can view messages addressed to their vendor account
CREATE POLICY "Vendors can view their messages"
ON public.messages
FOR SELECT
USING (
  has_role(auth.uid(), 'vendor'::app_role) AND
  vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete messages
CREATE POLICY "Admins can delete messages"
ON public.messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Vendors can mark messages as read
CREATE POLICY "Vendors can mark messages as read"
ON public.messages
FOR UPDATE
USING (
  has_role(auth.uid(), 'vendor'::app_role) AND
  vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
);

-- Foreign key indexes for performance
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_vendor_id ON public.messages(vendor_id);
CREATE INDEX idx_messages_product_id ON public.messages(product_id);
CREATE INDEX idx_messages_order_id ON public.messages(order_id);
