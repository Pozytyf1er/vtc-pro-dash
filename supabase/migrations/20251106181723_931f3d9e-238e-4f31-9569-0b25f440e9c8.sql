-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  mileage INTEGER NOT NULL DEFAULT 0,
  next_oil_change INTEGER,
  insurance_expiry DATE,
  technical_inspection_expiry DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Vehicles policies
CREATE POLICY "Users can view their own vehicles"
  ON public.vehicles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vehicles"
  ON public.vehicles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vehicles"
  ON public.vehicles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vehicles"
  ON public.vehicles FOR DELETE
  USING (auth.uid() = user_id);

-- Create incomes table
CREATE TABLE public.incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  route TEXT NOT NULL,
  distance DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

-- Incomes policies
CREATE POLICY "Users can view their own incomes"
  ON public.incomes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own incomes"
  ON public.incomes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own incomes"
  ON public.incomes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own incomes"
  ON public.incomes FOR DELETE
  USING (auth.uid() = user_id);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Expenses policies
CREATE POLICY "Users can view their own expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Create maintenance table
CREATE TABLE public.maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;

-- Maintenance policies
CREATE POLICY "Users can view their own maintenance"
  ON public.maintenance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own maintenance"
  ON public.maintenance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own maintenance"
  ON public.maintenance FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own maintenance"
  ON public.maintenance FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for vehicles table
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();