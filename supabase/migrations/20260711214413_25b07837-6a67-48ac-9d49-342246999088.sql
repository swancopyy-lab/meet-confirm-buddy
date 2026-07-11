
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS companions_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS caption_show_number boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS caption_text_color text NOT NULL DEFAULT '#111111',
  ADD COLUMN IF NOT EXISTS caption_number_color text NOT NULL DEFAULT '#111111',
  ADD COLUMN IF NOT EXISTS caption_font_family text NOT NULL DEFAULT 'sans-serif',
  ADD COLUMN IF NOT EXISTS caption_font_size int NOT NULL DEFAULT 28;

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS caption_text text,
  ADD COLUMN IF NOT EXISTS display_number int;

-- Backfill display_number per event in creation order (oldest = 1)
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY event_id ORDER BY created_at ASC) AS rn
  FROM public.invitations
)
UPDATE public.invitations i
   SET display_number = r.rn
  FROM ranked r
 WHERE i.id = r.id AND i.display_number IS NULL;

ALTER TABLE public.event_collaborators
  ADD COLUMN IF NOT EXISTS can_send_invitations boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_view_rsvps boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_view_attendee_info boolean NOT NULL DEFAULT true;
