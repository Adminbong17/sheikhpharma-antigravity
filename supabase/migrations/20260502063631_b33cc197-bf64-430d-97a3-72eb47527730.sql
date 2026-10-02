-- Fix emergency short codes that were incorrectly normalized with a leading 0
-- e.g., "0999" -> "999", "0333" -> "333"
UPDATE public.emergency_contacts
SET phone = regexp_replace(phone, '^0(\d{2,3})$', '\1')
WHERE phone ~ '^0\d{2,3}$';