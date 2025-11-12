-- Create drivers table
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  license_number TEXT,
  license_expiry DATE,
  assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for drivers
CREATE POLICY "Users can view their own drivers"
ON public.drivers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drivers"
ON public.drivers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drivers"
ON public.drivers
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drivers"
ON public.drivers
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_drivers_updated_at
BEFORE UPDATE ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update vehicles table to reference drivers instead of text
ALTER TABLE public.vehicles DROP COLUMN assigned_driver;
ALTER TABLE public.vehicles ADD COLUMN assigned_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL;