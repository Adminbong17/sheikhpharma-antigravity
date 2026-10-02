ALTER TABLE public.staff_members 
  ADD COLUMN IF NOT EXISTS career_application_id uuid REFERENCES public.career_applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS experience text,
  ADD COLUMN IF NOT EXISTS educational_qualification text;