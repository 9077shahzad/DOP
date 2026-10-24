-- The readiness diagnostic must not widen the attack surface it reports on:
-- it runs through the staff-gated readiness server function with the service
-- role, so signed-in callers do not need EXECUTE.
revoke execute on function public.security_definer_findings() from authenticated, anon, public;