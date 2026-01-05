-- Recreate all RLS policies to only allow authenticated users

-- DRIVERS TABLE
DROP POLICY IF EXISTS "Users can view drivers" ON public.drivers;
DROP POLICY IF EXISTS "Users can insert their own drivers" ON public.drivers;
DROP POLICY IF EXISTS "Users can update drivers" ON public.drivers;
DROP POLICY IF EXISTS "Users can delete drivers" ON public.drivers;

CREATE POLICY "Authenticated users can view their drivers"
ON public.drivers FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert their own drivers"
ON public.drivers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their drivers"
ON public.drivers FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can delete their drivers"
ON public.drivers FOR DELETE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- EXPENSES TABLE
DROP POLICY IF EXISTS "Users can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete expenses" ON public.expenses;

CREATE POLICY "Authenticated users can view their expenses"
ON public.expenses FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert their own expenses"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their expenses"
ON public.expenses FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can delete their expenses"
ON public.expenses FOR DELETE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- INCOMES TABLE
DROP POLICY IF EXISTS "Users can view incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can insert their own incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can update incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can delete incomes" ON public.incomes;

CREATE POLICY "Authenticated users can view their incomes"
ON public.incomes FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert their own incomes"
ON public.incomes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their incomes"
ON public.incomes FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can delete their incomes"
ON public.incomes FOR DELETE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- MAINTENANCE TABLE
DROP POLICY IF EXISTS "Users can view maintenance" ON public.maintenance;
DROP POLICY IF EXISTS "Users can insert their own maintenance" ON public.maintenance;
DROP POLICY IF EXISTS "Users can update maintenance" ON public.maintenance;
DROP POLICY IF EXISTS "Users can delete maintenance" ON public.maintenance;

CREATE POLICY "Authenticated users can view their maintenance"
ON public.maintenance FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert their own maintenance"
ON public.maintenance FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their maintenance"
ON public.maintenance FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can delete their maintenance"
ON public.maintenance FOR DELETE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- PROFILES TABLE
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view their profile"
ON public.profiles FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their profile"
ON public.profiles FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can delete their profile"
ON public.profiles FOR DELETE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- SHIFTS TABLE
DROP POLICY IF EXISTS "Drivers can view their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Drivers can insert their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Drivers can update their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can delete their own shifts" ON public.shifts;

CREATE POLICY "Authenticated users can view their shifts"
ON public.shifts FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert their own shifts"
ON public.shifts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their shifts"
ON public.shifts FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can delete their shifts"
ON public.shifts FOR DELETE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- VEHICLES TABLE
DROP POLICY IF EXISTS "Users can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can delete vehicles" ON public.vehicles;

CREATE POLICY "Authenticated users can view their vehicles"
ON public.vehicles FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert their own vehicles"
ON public.vehicles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their vehicles"
ON public.vehicles FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can delete their vehicles"
ON public.vehicles FOR DELETE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- USER_ALERT_SETTINGS TABLE
DROP POLICY IF EXISTS "Users can view their own alert settings" ON public.user_alert_settings;
DROP POLICY IF EXISTS "Users can insert their own alert settings" ON public.user_alert_settings;
DROP POLICY IF EXISTS "Users can update their own alert settings" ON public.user_alert_settings;

CREATE POLICY "Authenticated users can view their alert settings"
ON public.user_alert_settings FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their alert settings"
ON public.user_alert_settings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their alert settings"
ON public.user_alert_settings FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their alert settings"
ON public.user_alert_settings FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- USER_ROLES TABLE
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

CREATE POLICY "Authenticated users can view their own role"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert user roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update user roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user roles"
ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));