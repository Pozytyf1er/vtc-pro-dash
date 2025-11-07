-- Ajouter le champ conducteur assigné dans la table vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS assigned_driver TEXT;

-- Ajouter les champs pour le suivi de vidange dans la table maintenance
ALTER TABLE public.maintenance ADD COLUMN IF NOT EXISTS last_oil_change_km INTEGER;
ALTER TABLE public.maintenance ADD COLUMN IF NOT EXISTS oil_change_interval INTEGER;
ALTER TABLE public.maintenance ADD COLUMN IF NOT EXISTS next_oil_change_km INTEGER;