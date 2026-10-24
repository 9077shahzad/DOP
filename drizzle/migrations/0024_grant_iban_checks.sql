-- Pure IBAN checksum helpers (no table access). invoice_config_state runs as the
-- caller, so signed-in staff need EXECUTE or the finance pages fail with 403.
GRANT EXECUTE ON FUNCTION public.valid_iban(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.valid_qr_iban(text) TO authenticated;