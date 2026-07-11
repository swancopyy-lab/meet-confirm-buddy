CREATE OR REPLACE FUNCTION public.can_collab_send(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_collaborators ec
    JOIN auth.users u ON lower(u.email) = lower(ec.email)
    WHERE ec.event_id = _event_id
      AND u.id = _user_id
      AND ec.can_send_invitations = true
  );
$$;

DROP POLICY IF EXISTS "collaborators update invitations" ON public.invitations;
CREATE POLICY "collaborators update invitations"
  ON public.invitations
  FOR UPDATE
  TO authenticated
  USING (public.can_collab_send(event_id, auth.uid()))
  WITH CHECK (public.can_collab_send(event_id, auth.uid()));