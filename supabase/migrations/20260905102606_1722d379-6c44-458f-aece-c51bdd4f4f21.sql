-- 1. Access-rule helpers must be callable by the roles the rules apply to.
DO $$
DECLARE
  fn text;
  sig text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'account_visible','can_access_job','can_access_job_folder','can_see_costs',
    'current_org_id','current_partner_editable','current_partner_id','has_role',
    'is_dispatcher','is_staff','is_zw_admin','is_service_role'
  ] LOOP
    FOR sig IN
      SELECT format('public.%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid))
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = fn
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', sig);
    END LOOP;
  END LOOP;
END $$;

-- 2. Enquiry channels.
INSERT INTO public.lead_sources (key, label_de, label_fr, label_it, label_en, "group", sort_order)
VALUES
  ('website_form','Website-Formular','Formulaire du site','Modulo del sito','Website form','web',10),
  ('booking_form','Online-Planer','Planificateur en ligne','Pianificatore online','Online planner','web',20),
  ('b2b_inquiry','B2B-Anfrage','Demande B2B','Richiesta B2B','B2B enquiry','b2b',30),
  ('whatsapp','WhatsApp','WhatsApp','WhatsApp','WhatsApp','messaging',40),
  ('phone','Telefon','Téléphone','Telefono','Phone','phone',50),
  ('email','E-Mail','E-mail','E-mail','Email','manual',60)
ON CONFLICT (key) DO NOTHING;

-- 3. Work queues.
INSERT INTO public.lead_queues (key, label_de, label_fr, label_it, label_en, sort_order)
VALUES
  ('sales_dispatch','Verkauf & Disposition','Vente et dispatch','Vendite e dispatch','Sales & dispatch',10),
  ('b2b','Geschäftskunden','Clients entreprises','Clienti aziendali','Business customers',20),
  ('support','Support','Support','Assistenza','Support',30)
ON CONFLICT (key) DO NOTHING;

-- 4. Routing: support first, then B2B, then the general queue.
INSERT INTO public.lead_routing_rules (key, priority, match_source_key, match_customer_type, match_urgency, match_flag, queue_id, note)
SELECT v.key, v.priority, v.src, v.ctype::public.lead_customer_type, '', v.flag, q.id, v.note
  FROM (VALUES
    ('support_flag', 10, '', NULL, 'support', 'support', 'Support-Anliegen'),
    ('b2b_customers', 20, '', 'b2b', '',        'b2b',    'Geschäftskunden'),
    ('default',      100, '', NULL,  '',        'sales_dispatch', 'Standard')
  ) AS v(key, priority, src, ctype, flag, queue_key, note)
  JOIN public.lead_queues q ON q.key = v.queue_key
 WHERE NOT EXISTS (SELECT 1 FROM public.lead_routing_rules r WHERE r.key = v.key);