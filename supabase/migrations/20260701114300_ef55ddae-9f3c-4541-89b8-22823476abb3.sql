
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS scan_date date,
  ADD COLUMN IF NOT EXISTS success_image_url text,
  ADD COLUMN IF NOT EXISTS already_image_url text;

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS phone text;
