-- Add vehicle_id column to incomes table
ALTER TABLE public.incomes 
ADD COLUMN vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_incomes_vehicle_id ON public.incomes(vehicle_id);