
-- 1) profiles columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','blocked')),
  ADD COLUMN IF NOT EXISTS invitation_quota integer NOT NULL DEFAULT 100
    CHECK (invitation_quota >= 0),
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_assistant_account boolean NOT NULL DEFAULT false;

-- 2) super-admin helper
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_super_admin FROM public.profiles WHERE id = _user_id), false)
$$;

-- 3) update handle_new_user to auto-approve super admin & set fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_super boolean := lower(NEW.email) = 'swancopyy@gmail.com';
BEGIN
  INSERT INTO public.profiles (id, display_name, approval_status, is_super_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    CASE WHEN v_is_super THEN 'approved' ELSE 'pending' END,
    v_is_super
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'host')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4) trigger to promote super admin when email is confirmed (verified)
CREATE OR REPLACE FUNCTION public.promote_super_admin_on_verify()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) = 'swancopyy@gmail.com' THEN
    UPDATE public.profiles
       SET is_super_admin = true,
           approval_status = 'approved'
     WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_promote_super_admin ON auth.users;
CREATE TRIGGER on_auth_user_promote_super_admin
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.promote_super_admin_on_verify();

-- Retroactively promote if the user already exists & is confirmed
UPDATE public.profiles p
SET is_super_admin = true, approval_status = 'approved'
FROM auth.users u
WHERE u.id = p.id
  AND lower(u.email) = 'swancopyy@gmail.com'
  AND u.email_confirmed_at IS NOT NULL;

-- 5) profiles policies: super admin can read/update all
DROP POLICY IF EXISTS "super admin read all profiles" ON public.profiles;
CREATE POLICY "super admin read all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "super admin update all profiles" ON public.profiles;
CREATE POLICY "super admin update all profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- 6) invitation count helper (used to enforce quota server-side)
CREATE OR REPLACE FUNCTION public.get_user_invitation_count(_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(count(*)::int, 0) FROM public.invitations WHERE host_id = _user_id
$$;

-- 7) restrict collaborators from editing guest details — hosts only
DROP POLICY IF EXISTS "collaborators edit guest details" ON public.invitations;
