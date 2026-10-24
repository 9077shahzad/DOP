-- Live source for the production-readiness security section.
-- Mirrors what the database linter flags: SECURITY DEFINER functions in the
-- public schema that remain executable by anon or authenticated callers.
-- The readiness page groups them and explains why each group is intentional;
-- this function only supplies the ground truth (names + caller class).

create or replace function public.security_definer_findings()
returns table(fn_name text, caller text)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select p.proname::text,
         case
           when has_function_privilege('anon', p.oid, 'EXECUTE') then 'anon'
           else 'authenticated'
         end as caller
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      or has_function_privilege('authenticated', p.oid, 'EXECUTE')
    )
  order by 1;
$$;

-- Staff-only diagnostic: consumed by the readiness report, which already
-- gates on is_staff. Not for anonymous or general signed-in callers.
revoke all on function public.security_definer_findings() from public, anon, authenticated;
grant execute on function public.security_definer_findings() to service_role;
grant execute on function public.security_definer_findings() to authenticated;