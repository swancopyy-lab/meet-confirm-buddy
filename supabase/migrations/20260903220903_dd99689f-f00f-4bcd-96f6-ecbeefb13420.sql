ALTER TABLE public.events ADD COLUMN IF NOT EXISTS public_code text;
UPDATE public.events SET public_code = upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)) WHERE public_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS events_public_code_key ON public.events (public_code);