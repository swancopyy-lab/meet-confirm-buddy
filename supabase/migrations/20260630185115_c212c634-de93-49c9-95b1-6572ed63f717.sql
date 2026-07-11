
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS scan_code text;
UPDATE public.invitations SET scan_code = encode(gen_random_bytes(12), 'hex') WHERE scan_code IS NULL;
ALTER TABLE public.invitations ALTER COLUMN scan_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS invitations_scan_code_key ON public.invitations(scan_code);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS invitation_image_url text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS qr_x numeric NOT NULL DEFAULT 50;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS qr_y numeric NOT NULL DEFAULT 80;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS qr_size numeric NOT NULL DEFAULT 22;

-- storage policies for event-images bucket
CREATE POLICY "public read event images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'event-images');
CREATE POLICY "authed upload event images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-images' AND owner = auth.uid());
CREATE POLICY "owner update event images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'event-images' AND owner = auth.uid());
CREATE POLICY "owner delete event images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'event-images' AND owner = auth.uid());
