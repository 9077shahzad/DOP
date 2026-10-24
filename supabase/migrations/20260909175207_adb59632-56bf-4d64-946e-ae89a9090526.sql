REVOKE ALL ON FUNCTION public.valid_iban(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.valid_qr_iban(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.valid_iban(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.valid_qr_iban(text) TO service_role;