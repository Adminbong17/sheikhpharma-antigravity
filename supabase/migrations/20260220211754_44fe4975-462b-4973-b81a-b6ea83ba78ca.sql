
ALTER TABLE public.refund_requests
ADD COLUMN refund_method text DEFAULT 'bkash',
ADD COLUMN refund_account_number text,
ADD COLUMN refund_account_name text,
ADD COLUMN refund_bank_name text;
