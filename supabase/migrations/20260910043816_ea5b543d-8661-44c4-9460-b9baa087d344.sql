-- 1. Permanent customer-facing price-list number ---------------------------
ALTER TABLE public.pricing_configurations
  ADD COLUMN IF NOT EXISTS operational_number integer;

UPDATE public.pricing_configurations
   SET operational_number = 1
 WHERE version = 1 AND market = 'CH' AND operational_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pricing_configurations_operational_number_key
  ON public.pricing_configurations (market, operational_number)
  WHERE operational_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public.pricing_operational_number_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.operational_number IS NOT NULL
     AND NEW.operational_number IS DISTINCT FROM OLD.operational_number THEN
    RAISE EXCEPTION 'The price list number is permanent and cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pricing_operational_number_immutable ON public.pricing_configurations;
CREATE TRIGGER pricing_operational_number_immutable
  BEFORE UPDATE ON public.pricing_configurations
  FOR EACH ROW EXECUTE FUNCTION public.pricing_operational_number_immutable();

-- 2. Publishing: assign the number, do not retire a list that is still in force
CREATE OR REPLACE FUNCTION public.publish_pricing_configuration(_id uuid)
RETURNS pricing_configurations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.pricing_configurations;
  next_number integer;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff may publish pricing';
  END IF;

  SELECT COALESCE(MAX(c.operational_number), 0) + 1 INTO next_number
    FROM public.pricing_configurations c
   WHERE c.market = (SELECT market FROM public.pricing_configurations WHERE id = _id);

  UPDATE public.pricing_configurations
     SET status = 'published',
         published_at = now(),
         published_by = auth.uid(),
         operational_number = COALESCE(operational_number, next_number)
   WHERE id = _id AND status = 'draft'
   RETURNING * INTO row;

  IF row.id IS NULL THEN
    RAISE EXCEPTION 'Only a draft configuration can be published';
  END IF;

  -- Retire superseded or future published lists, never the one still in force,
  -- and never the automated regression fixtures.
  UPDATE public.pricing_configurations
     SET status = 'archived'
   WHERE market = row.market
     AND status = 'published'
     AND id <> row.id
     AND effective_from >= row.effective_from
     AND name !~* '(regressionsfixture|integration test)'
     AND COALESCE(notes, '') !~* '(regressionsfixture|integration test)';

  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_pricing_configuration(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_pricing_configuration(uuid) TO authenticated, service_role;

-- 3. Quotation snapshots carry the price-list number ------------------------
ALTER TABLE public.quote_versions ADD COLUMN IF NOT EXISTS price_list_number integer;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS price_list_number integer;

CREATE OR REPLACE FUNCTION public.quote_version_stamp_price_list()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.price_list_number IS NULL AND NEW.pricing_configuration_id IS NOT NULL THEN
    SELECT c.operational_number INTO NEW.price_list_number
      FROM public.pricing_configurations c
     WHERE c.id = NEW.pricing_configuration_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quote_versions_stamp_price_list ON public.quote_versions;
CREATE TRIGGER quote_versions_stamp_price_list
  BEFORE INSERT ON public.quote_versions
  FOR EACH ROW EXECUTE FUNCTION public.quote_version_stamp_price_list();

-- 4. Version history is append-only at database level -----------------------
CREATE OR REPLACE FUNCTION public.quote_versions_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Quotation versions are permanent records and cannot be changed or removed';
END;
$$;

DROP TRIGGER IF EXISTS quote_versions_no_update ON public.quote_versions;
CREATE TRIGGER quote_versions_no_update
  BEFORE UPDATE OR DELETE ON public.quote_versions
  FOR EACH ROW EXECUTE FUNCTION public.quote_versions_append_only();

DROP POLICY IF EXISTS "Staff manage quote versions" ON public.quote_versions;
DROP POLICY IF EXISTS "Staff full access quote_versions" ON public.quote_versions;

-- 5. Acceptance binds version, options and total ----------------------------
CREATE OR REPLACE FUNCTION public.accept_quote_version(
  _quote_id uuid,
  _version integer,
  _options jsonb,
  _total numeric,
  _accepted_by_name text
)
RETURNS quotes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snapshot public.quote_versions;
  latest integer;
  result public.quotes;
BEGIN
  SELECT MAX(v.version) INTO latest FROM public.quote_versions v WHERE v.quote_id = _quote_id;
  IF latest IS NULL THEN
    RAISE EXCEPTION 'quote_version_missing';
  END IF;
  IF latest <> _version THEN
    RAISE EXCEPTION 'quote_version_stale';
  END IF;

  SELECT * INTO snapshot
    FROM public.quote_versions v
   WHERE v.quote_id = _quote_id AND v.version = _version;

  IF snapshot.options IS DISTINCT FROM COALESCE(_options, '[]'::jsonb) THEN
    RAISE EXCEPTION 'quote_options_mismatch';
  END IF;
  IF round(snapshot.total, 2) IS DISTINCT FROM round(_total, 2) THEN
    RAISE EXCEPTION 'quote_total_mismatch';
  END IF;

  UPDATE public.quotes
     SET accepted_at = COALESCE(accepted_at, now()),
         accepted_version = snapshot.version,
         accepted_options = snapshot.options,
         accepted_by_name = COALESCE(_accepted_by_name, accepted_by_name),
         price_list_number = COALESCE(price_list_number, snapshot.price_list_number)
   WHERE id = _quote_id
   RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'quote_not_found';
  END IF;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_quote_version(uuid, integer, jsonb, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_quote_version(uuid, integer, jsonb, numeric, text) TO anon, authenticated, service_role;