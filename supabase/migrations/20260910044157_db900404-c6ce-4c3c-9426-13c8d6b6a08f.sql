-- 1. Automatic, append-only quotation snapshots -----------------------------
CREATE OR REPLACE FUNCTION public.quotes_snapshot_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version integer;
  vat_rate numeric;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.price_total IS NOT DISTINCT FROM OLD.price_total
     AND NEW.options IS NOT DISTINCT FROM OLD.options
     AND NEW.pricing_configuration_id IS NOT DISTINCT FROM OLD.pricing_configuration_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(v.version), 0) + 1 INTO next_version
    FROM public.quote_versions v WHERE v.quote_id = NEW.id;

  vat_rate := CASE
    WHEN COALESCE(NEW.price_net, 0) > 0 THEN round(COALESCE(NEW.price_vat, 0) / NEW.price_net, 4)
    ELSE 0
  END;

  INSERT INTO public.quote_versions (
    quote_id, version, pricing_mode, line_items, options, subtotal, discount, net,
    vat_rate, vat, total, currency, pricing_configuration_id
  ) VALUES (
    NEW.id,
    next_version,
    COALESCE(NEW.pricing_mode, 'fixed'),
    '[]'::jsonb,
    COALESCE(NEW.options, '[]'::jsonb),
    COALESCE(NEW.price_net, 0),
    0,
    COALESCE(NEW.price_net, 0),
    vat_rate,
    COALESCE(NEW.price_vat, 0),
    COALESCE(NEW.price_total, 0),
    'CHF',
    NEW.pricing_configuration_id
  );

  UPDATE public.quotes SET version = next_version WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quotes_snapshot_version ON public.quotes;
CREATE TRIGGER quotes_snapshot_version
  AFTER INSERT OR UPDATE OF price_total, price_net, price_vat, options, pricing_configuration_id
  ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.quotes_snapshot_version();

-- 2. What the customer is shown before accepting -----------------------------
CREATE OR REPLACE FUNCTION public.public_quote_snapshot(_reference text, _contact text)
RETURNS TABLE(version integer, total numeric, options jsonb, accepted_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT v.version, v.total, v.options, q.accepted_at
    FROM public.quotes q
    JOIN public.quote_versions v ON v.quote_id = q.id
   WHERE q.reference = btrim(_reference)
     AND public.quote_contact_matches(q.id, _contact)
   ORDER BY v.version DESC
   LIMIT 1;
END;
$$;

-- 3. Contact verification shared by lookup and acceptance --------------------
CREATE OR REPLACE FUNCTION public.quote_contact_matches(_quote_id uuid, _contact text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c text := btrim(coalesce(_contact, ''));
  c_digits text := regexp_replace(coalesce(_contact, ''), '\D', '', 'g');
  ok boolean;
BEGIN
  IF c = '' THEN RETURN false; END IF;
  IF length(c_digits) >= 9 AND left(c_digits, 1) = '0' THEN
    c_digits := substr(c_digits, 2);
  ELSIF length(c_digits) >= 11 AND left(c_digits, 2) = '41' THEN
    c_digits := substr(c_digits, 3);
  END IF;

  SELECT (
    (position('@' in c) > 0 AND lower(btrim(coalesce(q.customer_email, ''))) = lower(c))
    OR (
      length(c_digits) >= 6
      AND length(regexp_replace(coalesce(q.customer_phone, ''), '\D', '', 'g')) >= 6
      AND right(regexp_replace(coalesce(q.customer_phone, ''), '\D', '', 'g'), length(c_digits)) = c_digits
    )
  ) INTO ok
  FROM public.quotes q
  WHERE q.id = _quote_id
    AND q.created_at > now() - interval '30 days';

  RETURN COALESCE(ok, false);
END;
$$;

-- 4. Acceptance bound to reference, contact, version, options and total ------
CREATE OR REPLACE FUNCTION public.accept_public_quote(
  _reference text,
  _contact text,
  _version integer,
  _total numeric,
  _accepted_by_name text DEFAULT NULL
)
RETURNS TABLE(reference text, accepted_version integer, accepted_at timestamptz, total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  q public.quotes;
  snapshot public.quote_versions;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE quotes.reference = btrim(_reference) LIMIT 1;
  IF q.id IS NULL OR NOT public.quote_contact_matches(q.id, _contact) THEN
    RAISE EXCEPTION 'quote_not_found';
  END IF;

  SELECT * INTO snapshot
    FROM public.quote_versions v
   WHERE v.quote_id = q.id
   ORDER BY v.version DESC
   LIMIT 1;

  IF snapshot.id IS NULL THEN RAISE EXCEPTION 'quote_version_missing'; END IF;
  IF snapshot.version <> _version THEN RAISE EXCEPTION 'quote_version_stale'; END IF;
  IF round(snapshot.total, 2) IS DISTINCT FROM round(_total, 2) THEN
    RAISE EXCEPTION 'quote_total_mismatch';
  END IF;

  UPDATE public.quotes
     SET accepted_at = COALESCE(quotes.accepted_at, now()),
         accepted_version = snapshot.version,
         accepted_options = snapshot.options,
         accepted_by_name = COALESCE(_accepted_by_name, quotes.accepted_by_name),
         price_list_number = COALESCE(quotes.price_list_number, snapshot.price_list_number)
   WHERE quotes.id = q.id
   RETURNING quotes.reference, quotes.accepted_version, quotes.accepted_at, snapshot.total
   INTO reference, accepted_version, accepted_at, total;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.quote_contact_matches(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_quote_snapshot(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_public_quote(text, text, integer, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_contact_matches(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_quote_snapshot(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_public_quote(text, text, integer, numeric, text) TO anon, authenticated, service_role;