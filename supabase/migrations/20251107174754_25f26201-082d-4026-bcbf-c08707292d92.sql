-- Supprimer les colonnes route et distance de la table incomes
ALTER TABLE public.incomes DROP COLUMN IF EXISTS route;
ALTER TABLE public.incomes DROP COLUMN IF EXISTS distance;