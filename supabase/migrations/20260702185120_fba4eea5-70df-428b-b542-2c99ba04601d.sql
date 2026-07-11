
-- Collaborators table
CREATE TABLE public.event_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_collaborators TO authenticated;
GRANT ALL ON public.event_collaborators TO service_role;
ALTER TABLE public.event_collaborators ENABLE ROW LEVEL SECURITY;

-- Helper: is the calling user (by email) a collaborator on this event?
CREATE OR REPLACE FUNCTION public.is_event_collaborator(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_collaborators ec
    JOIN auth.users u ON u.id = _user_id
    WHERE ec.event_id = _event_id
      AND lower(ec.email) = lower(u.email)
  )
$$;

-- Policies on event_collaborators
CREATE POLICY "host manages collaborators"
  ON public.event_collaborators FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()));

CREATE POLICY "collaborators read their own rows"
  ON public.event_collaborators FOR SELECT TO authenticated
  USING (public.is_event_collaborator(event_id, auth.uid()));

-- Extend event visibility for collaborators (host policy already exists)
CREATE POLICY "collaborators view shared events"
  ON public.events FOR SELECT TO authenticated
  USING (public.is_event_collaborator(id, auth.uid()));

-- Invitations: collaborators can view + update guest_name/phone only.
CREATE POLICY "collaborators view invitations"
  ON public.invitations FOR SELECT TO authenticated
  USING (public.is_event_collaborator(event_id, auth.uid()));

CREATE POLICY "collaborators edit guest details"
  ON public.invitations FOR UPDATE TO authenticated
  USING (public.is_event_collaborator(event_id, auth.uid()))
  WITH CHECK (public.is_event_collaborator(event_id, auth.uid()));
