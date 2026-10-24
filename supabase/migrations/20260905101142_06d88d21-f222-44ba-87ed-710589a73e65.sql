-- Staged role migration, step 1 of 2: add the new role names only.
-- Nothing is switched over yet; existing roles and access rules keep working.
ALTER TYPE public.portal_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.portal_role ADD VALUE IF NOT EXISTS 'management';
ALTER TYPE public.portal_role ADD VALUE IF NOT EXISTS 'dispatcher';
ALTER TYPE public.portal_role ADD VALUE IF NOT EXISTS 'surveyor';
ALTER TYPE public.portal_role ADD VALUE IF NOT EXISTS 'crew_leader';
ALTER TYPE public.portal_role ADD VALUE IF NOT EXISTS 'driver';
ALTER TYPE public.portal_role ADD VALUE IF NOT EXISTS 'mover';
ALTER TYPE public.portal_role ADD VALUE IF NOT EXISTS 'cleaner';
ALTER TYPE public.portal_role ADD VALUE IF NOT EXISTS 'partner';
ALTER TYPE public.portal_role ADD VALUE IF NOT EXISTS 'customer';