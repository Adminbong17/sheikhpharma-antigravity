ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS bkash_uat_mode boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS bkash_uat_phones text DEFAULT '';
