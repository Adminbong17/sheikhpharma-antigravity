
CREATE TABLE public.career_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  experience TEXT,
  educational_qualification TEXT,
  photo_url TEXT,
  nid_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit career application"
ON public.career_applications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all career applications"
ON public.career_applications FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update career applications"
ON public.career_applications FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete career applications"
ON public.career_applications FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_career_applications_updated_at
BEFORE UPDATE ON public.career_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
