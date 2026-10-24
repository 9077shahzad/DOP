-- ===========================================================================
-- Access hardening: restore the privilege model the security tests expect.
-- The remixed database inherited blanket grants; this migration narrows them.
-- ===========================================================================

-- 1. Tables: signed-out visitors keep only the three public reads.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON public.markets TO anon;
GRANT SELECT ON public.legal_documents TO anon;
GRANT SELECT ON public.legal_entities TO anon;
GRANT INSERT ON public.consent_records TO anon;

-- 2. Cost and margin columns are never exposed over the Data API.
--    Signed-in users get column-level SELECT on everything except these.
DO $$
DECLARE
  t record;
  cols text;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('leads',         ARRAY['expected_cost','expected_margin','expected_margin_pct']),
      ('partner_quotes',ARRAY['partner_cost']),
      ('job_materials', ARRAY['supplier_cost']),
      ('change_orders', ARRAY['partner_cost'])
    ) AS v(tbl, hidden)
  LOOP
    SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position)
      INTO cols
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = t.tbl
       AND NOT (column_name = ANY (t.hidden));

    EXECUTE format('REVOKE SELECT ON public.%I FROM authenticated', t.tbl);
    EXECUTE format('GRANT SELECT (%s) ON public.%I TO authenticated', cols, t.tbl);
  END LOOP;
END $$;

-- 3. Routines: close everything, then open only what the app calls.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  fn text;
  sig text;
  public_fns text[] := ARRAY[
    'public_markets','public_legal_entity','public_planner_pricing','published_pricing',
    'company_contact','lead_tracker','get_public_quote','create_lead','create_enquiry',
    'create_quote','submit_partner_application','change_order_by_token',
    'respond_change_order_token'
  ];
  auth_fns text[] := ARRAY[
    'accept_partner_quote','apply_retention','assign_lead','build_consolidated_invoice',
    'can_see_costs','cancel_job','change_orders_for','clear_lead_risk','create_change_order',
    'create_customer_quote','create_job_from_lead','cron_health','current_partner_id',
    'customer_value','decide_approval','decide_change_order_staff','email_ingest',
    'evaluate_fulfilment','inquiry_sla_exceptions','is_staff','job_materials_for',
    'lead_economics','lead_sla_minutes','log_allocation_exception','management_exceptions',
    'merge_leads','my_partner_quotes','partner_opportunity_feed','partner_quotes_without_cost',
    'process_inquiry_sla','publish_pricing_configuration','quote_costs_for_lead',
    'recompute_lead_economics','record_invoice_payment','record_job_confirmation',
    'record_job_material','record_partner_response','resolve_allocation_exception',
    'resolve_rate','resolve_site_service','review_partner_document',
    'rollback_pricing_configuration','run_sla_timeouts_job','run_work_order_job',
    'score_candidates','send_change_order','send_lead_opportunities','set_job_status',
    'set_lead_owner','set_lead_status','set_partner_account_manager','set_partner_assessment',
    'set_partner_service_approval','set_partner_status','set_sla_automation',
    'source_performance'
  ];
BEGIN
  FOREACH fn IN ARRAY public_fns LOOP
    FOR sig IN
      SELECT format('public.%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid))
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = fn
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', sig);
    END LOOP;
  END LOOP;

  FOREACH fn IN ARRAY auth_fns LOOP
    FOR sig IN
      SELECT format('public.%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid))
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = fn
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', sig);
    END LOOP;
  END LOOP;
END $$;

-- service_role keeps full access for server-side and scheduled work.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;