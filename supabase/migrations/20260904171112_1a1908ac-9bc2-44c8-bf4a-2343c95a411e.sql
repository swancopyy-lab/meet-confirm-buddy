ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS public_ask_phone boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_phone_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_ask_apology boolean NOT NULL DEFAULT true;