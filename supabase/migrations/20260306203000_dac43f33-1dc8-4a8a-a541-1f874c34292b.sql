
CREATE TABLE public.trash (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  record_data jsonb NOT NULL,
  deleted_by uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz DEFAULT NULL
);

ALTER TABLE public.trash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage trash" ON public.trash
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert to trash" ON public.trash
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = deleted_by);
