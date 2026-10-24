REVOKE ALL ON FUNCTION public.quotes_customer_minimum_gate() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quotes_customer_minimum_gate() TO service_role;