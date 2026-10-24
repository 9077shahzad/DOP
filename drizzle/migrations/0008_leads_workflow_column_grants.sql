-- Leads use column-level SELECT (cost/margin hidden). Columns added after the
-- hardening migration (workflow_stage, archived_at, archived_by, …) were never
-- granted, so staff could not read the Neue Anfragen list. Re-grant every
-- column except the hidden cost fields.
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position)
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'leads'
     AND column_name NOT IN ('expected_cost','expected_margin','expected_margin_pct');
  EXECUTE format('GRANT SELECT (%s) ON public.leads TO authenticated', cols);
END $$;