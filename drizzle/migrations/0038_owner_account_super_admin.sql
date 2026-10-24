-- Owner confirmed in writing by the project lead (13.10.2026): govand.mero@gmx.ch is the PS Umzug owner.
-- The legacy admin role already had equal access; this records the owner role explicitly.
ALTER TABLE public.profiles DISABLE TRIGGER profiles_protect_privileged_columns;
UPDATE public.profiles SET role = 'super_admin', updated_at = now()
 WHERE id = 'fae34d49-1a61-4365-aa7e-9843251454ee' AND role = 'zuegelwerk_admin';
ALTER TABLE public.profiles ENABLE TRIGGER profiles_protect_privileged_columns;