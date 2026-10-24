REVOKE EXECUTE ON FUNCTION public.is_finance() FROM anon;
REVOKE EXECUTE ON FUNCTION public.invoice_config_state() FROM anon;
REVOKE EXECUTE ON FUNCTION public.next_invoice_reference() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_invoice_from_job(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.issue_invoice(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_invoice_payment(uuid, numeric, date, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_invoice(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_overdue_invoices() FROM anon;
REVOKE EXECUTE ON FUNCTION public.management_kpis(date, date) FROM anon;