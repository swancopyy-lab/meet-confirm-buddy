ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS cover_caption_x numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS cover_caption_y numeric NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS cover_caption_align text NOT NULL DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS cover_caption_font_family text NOT NULL DEFAULT 'sans-serif',
  ADD COLUMN IF NOT EXISTS cover_caption_font_size integer NOT NULL DEFAULT 28,
  ADD COLUMN IF NOT EXISTS cover_caption_font_weight integer NOT NULL DEFAULT 600,
  ADD COLUMN IF NOT EXISTS cover_caption_text_color text NOT NULL DEFAULT '#111111',
  ADD COLUMN IF NOT EXISTS cover_caption_number_color text NOT NULL DEFAULT '#111111',
  ADD COLUMN IF NOT EXISTS cover_caption_show_box boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cover_caption_show_number boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_max_companions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_scan_limit integer NOT NULL DEFAULT 1;

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS max_companions integer,
  ADD COLUMN IF NOT EXISTS scan_limit integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS scan_count integer NOT NULL DEFAULT 0;

UPDATE public.invitations SET scan_count = 1 WHERE scanned_at IS NOT NULL AND scan_count = 0;