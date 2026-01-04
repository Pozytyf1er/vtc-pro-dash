-- Add vehicle_id column to expenses table for vehicle filtering
ALTER TABLE public.expenses 
ADD COLUMN vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_expenses_vehicle_id ON public.expenses(vehicle_id);