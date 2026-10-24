INSERT INTO public.pricing_configurations
  (id, market, name, version, status, effective_from, notes, min_hours, min_hours_basis, operational_number)
VALUES
  ('7c1f4b2e-3d5a-4a91-9f60-2b8c1d0e5a31', 'CH', 'PS Umzug Preisliste', 1001, 'draft', current_date,
   'Preisliste 3: Stundentarif CHF 210.00 pro Team und Stunde (Teamtarif — nicht mit der Personenzahl multiplizieren; enthaelt Personal, Fahrzeug, Werkzeug, Ausruestung, Schutzmaterial, Planung und Verbrauchsmaterial im vereinbarten Umfang). Mindestverrechnung 4 Teamstunden. Uebrige Werte unveraendert aus Preisliste 1. Interner Kostensatz nicht hinterlegt.',
   4, 'team', 3);

INSERT INTO public.pricing_rules
  (configuration_id, band_id, service, property_type, unit_type, price, currency, room_min, room_max, sort_order, requires_commercial_review, gap_after_intentional)
SELECT '7c1f4b2e-3d5a-4a91-9f60-2b8c1d0e5a31', band_id, service, property_type, unit_type, price, currency,
       room_min, room_max, sort_order, requires_commercial_review, gap_after_intentional
FROM public.pricing_rules
WHERE configuration_id = 'dd5e54f5-4c10-45ff-a2b8-c53e24854666'
  AND service <> 'labour';

INSERT INTO public.pricing_rules
  (configuration_id, service, property_type, unit_type, price, currency, sort_order, requires_commercial_review)
VALUES
  ('7c1f4b2e-3d5a-4a91-9f60-2b8c1d0e5a31', 'labour', 'any', 'per_team_hour', 210, 'CHF', 300, false);

UPDATE public.pricing_configurations
   SET status = 'published', published_at = now(), updated_at = now()
 WHERE id = '7c1f4b2e-3d5a-4a91-9f60-2b8c1d0e5a31';

UPDATE public.minimum_billing_policy SET status = 'superseded' WHERE status = 'active';

INSERT INTO public.minimum_billing_policy
  (min_hours, basis, status, effective_from, approved_by, approved_on, note)
VALUES
  (4, 'team', 'active', now(), 'Eigentümer PS Umzug AG', current_date,
   'Firmenweite Mindestverrechnung: jeder neue Auftrag und jede Dienstleistungszusage umfasst mindestens vier verrechenbare Teamstunden. Der Teamtarif gilt als eine Leistungseinheit und wird nicht mit der Personenzahl multipliziert. Die effektive Arbeitszeit wird separat erfasst.');
