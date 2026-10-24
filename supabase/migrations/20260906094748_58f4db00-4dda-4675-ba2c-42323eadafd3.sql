DO $$
DECLARE
  f record;
  keep_anon text[] := ARRAY[
    'attach_lead_files','change_order_by_token','company_contact','create_enquiry',
    'create_lead','create_quote','get_public_quote','invoice_by_token','lead_tracker',
    'public_legal_entity','public_markets','public_planner_pricing','published_pricing',
    'respond_change_order_token','review_by_token','submit_review'
  ];
  keep_auth text[] := ARRAY[
    'accept_partner_quote','apply_invoice_payment','apply_retention','assign_job_resources',
    'assign_lead','attach_lead_files','build_consolidated_invoice','can_see_costs',
    'cancel_invoice','cancel_job','change_order_by_token','change_orders_for',
    'clear_lead_risk','company_contact','create_booking_from_quote','create_change_order',
    'create_customer_quote','create_enquiry','create_invoice_from_job','create_job_from_lead',
    'create_lead','create_quote','create_review_request','current_partner_id',
    'customer_value','decide_approval','decide_change_order_staff','email_ingest',
    'evaluate_fulfilment','get_public_quote','inquiry_sla_exceptions','invoice_by_token',
    'invoice_config_state','is_staff','issue_invoice','job_materials_for','lead_economics',
    'lead_sla_minutes','lead_tracker','log_allocation_exception','management_exceptions',
    'management_kpis','mark_overdue_invoices','merge_leads','my_partner_quotes',
    'partner_opportunity_feed','partner_quotes_without_cost','process_inquiry_sla',
    'public_legal_entity','public_markets','public_planner_pricing',
    'publish_pricing_configuration','published_pricing','quote_costs_for_lead',
    'recompute_lead_economics','record_job_confirmation','record_job_material',
    'record_partner_response','resolve_allocation_exception','resolve_rate',
    'resolve_route_distance','resolve_site_service','resource_busy',
    'respond_change_order_token','review_by_token','review_partner_document',
    'rollback_pricing_configuration','run_sla_timeouts_job','run_work_order_job',
    'score_candidates','send_change_order','send_lead_opportunities','send_quote',
    'set_job_status','set_lead_owner','set_lead_status','set_partner_account_manager',
    'set_partner_assessment','set_partner_service_approval','set_partner_status',
    'set_quote_distance','set_sla_automation','source_performance',
    'submit_partner_application','submit_review','cron_health','security_definer_findings',
    -- access-check helpers used inside security policies
    'account_visible','can_access_job','can_access_job_folder','can_view_fleet',
    'current_org_id','current_partner_editable','has_role','is_crew_of_job',
    'is_dispatcher','is_finance','is_zw_admin'
  ];
BEGIN
  FOR f IN
    SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', f.name, f.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', f.name, f.args);
    IF f.name = ANY(keep_anon) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon, authenticated', f.name, f.args);
    ELSIF f.name = ANY(keep_auth) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', f.name, f.args);
    END IF;
  END LOOP;
END $$;