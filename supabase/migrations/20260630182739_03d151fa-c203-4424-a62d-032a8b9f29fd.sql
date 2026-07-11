
-- Roles enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('host', 'admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile + host role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'host');
  RETURN new;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Event (one wedding per host for simplicity, but allow multiple)
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'حفل زفاف',
  groom_name text,
  bride_name text,
  event_date timestamptz,
  venue text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "host manages own events" ON public.events FOR ALL TO authenticated
  USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
-- Anyone can read event basics (needed for public invite page)
CREATE POLICY "public can view events" ON public.events FOR SELECT TO anon USING (true);
CREATE POLICY "public auth view events" ON public.events FOR SELECT TO authenticated USING (true);

-- RSVP status
CREATE TYPE public.rsvp_status AS ENUM ('pending', 'attending', 'declined');

-- Invitations
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  guest_name text,
  rsvp_status public.rsvp_status NOT NULL DEFAULT 'pending',
  companions int NOT NULL DEFAULT 0 CHECK (companions >= 0 AND companions <= 20),
  apology_message text,
  responded_at timestamptz,
  scanned_at timestamptz,
  scanned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT SELECT, UPDATE ON public.invitations TO anon;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Host manages all their invitations
CREATE POLICY "host manages own invitations" ON public.invitations FOR ALL TO authenticated
  USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

-- Public can read an invitation (by code) - needed for guest RSVP page
CREATE POLICY "public read invitation" ON public.invitations FOR SELECT TO anon USING (true);
-- Public can update only RSVP-related fields on their invitation (RLS doesn't restrict columns; we guard via server function)
CREATE POLICY "public update invitation rsvp" ON public.invitations FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE INDEX invitations_event_idx ON public.invitations(event_id);
CREATE INDEX invitations_host_idx ON public.invitations(host_id);
CREATE INDEX invitations_code_idx ON public.invitations(code);
