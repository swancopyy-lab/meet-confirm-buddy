
-- Tighten events RLS: drop public-visible SELECT policies
DROP POLICY IF EXISTS "public auth view events" ON public.events;
DROP POLICY IF EXISTS "public can view events" ON public.events;
DROP POLICY IF EXISTS "public read invitation" ON public.invitations;

-- Super admin visibility for oversight
CREATE POLICY "super admin read all events" ON public.events
  FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "super admin read all invitations" ON public.invitations
  FOR SELECT USING (public.is_super_admin(auth.uid()));

-- Ensure profile + role + super-admin flag are provisioned on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.promote_super_admin_on_verify();
