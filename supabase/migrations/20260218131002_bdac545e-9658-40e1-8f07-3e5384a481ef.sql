
-- Fix pay_rates policies: drop restrictive ones, recreate as permissive
DROP POLICY IF EXISTS "Admins can manage pay rates" ON public.pay_rates;
DROP POLICY IF EXISTS "Users can view own pay rate" ON public.pay_rates;
DROP POLICY IF EXISTS "Users can view role pay rates" ON public.pay_rates;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Admins can manage pay rates"
ON public.pay_rates FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own pay rate"
ON public.pay_rates FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view role pay rates"
ON public.pay_rates FOR SELECT
TO authenticated
USING (user_id IS NULL);
