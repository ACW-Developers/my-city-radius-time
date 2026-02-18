
-- Activity logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own activity logs"
ON public.activity_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own activity logs"
ON public.activity_logs FOR SELECT
USING (auth.uid() = user_id);
