-- lovable-cron-fallback-reviewed: 288 runs/day; SLA response-deadline breaches must be detected within minutes to trigger escalation; the breach is the passage of time, so no row-change event exists to hook.
INSERT INTO public.markets (country, currency, vat_rate, consumer_regime, active, legal_ready, entity_ready, tax_ready, note)
VALUES ('CH', 'CHF', 8.1, 'swiss', true, false, false, false, 'PS Umzug AG — Steffisburg / Thun / Bern, extensible to all of Switzerland.')
ON CONFLICT (country) DO NOTHING;

INSERT INTO public.legal_entities (
  country, legal_name, register_number, vat_number,
  address_line, postal_code, city, canton,
  email, phone, currency, status
)
SELECT
  'CH', 'PS Umzug AG', '', '',
  'Bahnhofstrasse 85', '3613', 'Steffisburg', 'BE',
  'info@ps-umzug.ch', '0800 800 255', 'CHF', 'pending'
WHERE NOT EXISTS (SELECT 1 FROM public.legal_entities WHERE country = 'CH');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobname)
    FROM cron.job
    WHERE jobname IN ('mf-sla-timeouts', 'mf-work-orders');

    PERFORM cron.schedule('mf-sla-timeouts', '*/5 * * * *',
      $job$select public.run_sla_timeouts_job('scheduler')$job$);
    PERFORM cron.schedule('mf-work-orders', '15 3 * * *',
      $job$select public.run_work_order_job('scheduler', null)$job$);
  END IF;
END
$$;