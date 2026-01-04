-- Add DELETE policy on profiles table for GDPR compliance
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));