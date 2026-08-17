ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS cover_show_caption boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS caption_show_name boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS caption_show_companions boolean NOT NULL DEFAULT true;