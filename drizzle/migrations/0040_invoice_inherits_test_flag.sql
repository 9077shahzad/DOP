CREATE OR REPLACE FUNCTION public.invoice_inherit_test_flag()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.job_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.jobs_execution j WHERE j.id = NEW.job_id AND j.is_test) THEN
    NEW.is_test := true;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.invoice_inherit_test_flag() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS invoice_inherit_test_flag ON public.invoices;
CREATE TRIGGER invoice_inherit_test_flag BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.invoice_inherit_test_flag();
UPDATE public.invoices i SET is_test = true
  FROM public.jobs_execution j WHERE j.id = i.job_id AND j.is_test AND NOT i.is_test;