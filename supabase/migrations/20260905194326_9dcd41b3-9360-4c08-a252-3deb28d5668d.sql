-- 1. Audit trail for role changes
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL,
  from_role text,
  to_role text,
  actor_id uuid,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.role_change_audit TO authenticated;
GRANT ALL ON public.role_change_audit TO service_role;
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role audit admin read" ON public.role_change_audit;
CREATE POLICY "role audit admin read" ON public.role_change_audit
  FOR SELECT TO authenticated USING (public.is_zw_admin());

-- 2. Column allow-list: signed-in users may only self-edit name and language
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, ui_language) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 3. Defence in depth: reject protected-column changes and record role changes
CREATE OR REPLACE FUNCTION public.profiles_guard_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  privileged boolean;
BEGIN
  -- service_role / definer maintenance contexts carry no end-user identity
  privileged := auth.uid() IS NULL OR public.is_zw_admin();

  IF NOT privileged THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'protected_profile_column' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    INSERT INTO public.role_change_audit (subject_id, from_role, to_role, actor_id, note)
    VALUES (NEW.id, OLD.role::text, NEW.role::text, auth.uid(), '');
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_guard_protected_columns ON public.profiles;
CREATE TRIGGER profiles_guard_protected_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_protected_columns();

-- 4. The one approved role-management path
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role portal_role, _note text DEFAULT '')
RETURNS portal_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  old_role public.portal_role;
BEGIN
  IF NOT public.is_zw_admin() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  SELECT role INTO old_role FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.profiles SET role = _role, updated_at = now() WHERE id = _user_id;
  UPDATE public.role_change_audit SET note = coalesce(_note, '')
    WHERE subject_id = _user_id AND actor_id = auth.uid()
      AND created_at > now() - interval '1 minute';
  RETURN _role;
END; $$;

REVOKE ALL ON FUNCTION public.set_user_role(uuid, portal_role, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, portal_role, text) TO authenticated;
