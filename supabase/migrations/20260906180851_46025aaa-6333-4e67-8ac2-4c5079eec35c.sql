DO $do$
DECLARE d text; old1 text; old2 text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO d
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'score_candidates';

  old1 := 'p.city, p.classification,';
  IF position(old1 in d) = 0 THEN RAISE EXCEPTION 'classification select not found'; END IF;
  d := replace(d, old1, 'p.city, pi.classification,');

  old2 := 'ON ps.partner_id = p.id AND ps.category_id = l.category_id AND ps.approved';
  IF position(old2 in d) = 0 THEN RAISE EXCEPTION 'service join not found'; END IF;
  d := replace(d, old2, old2 || E'\n    LEFT JOIN public.partner_internal pi ON pi.partner_id = p.id');

  EXECUTE d;
END
$do$;