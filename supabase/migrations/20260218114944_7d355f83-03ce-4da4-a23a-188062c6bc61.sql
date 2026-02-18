
-- Allow any authenticated user to insert roles (so first user can self-assign admin)
CREATE POLICY "Authenticated users can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow any authenticated user to delete their own roles
CREATE POLICY "Users can delete own roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
