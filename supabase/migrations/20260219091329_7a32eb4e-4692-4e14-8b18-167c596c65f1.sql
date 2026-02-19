
CREATE OR REPLACE FUNCTION public.generate_badge_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.badge_code IS NULL THEN
    NEW.badge_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT || NEW.user_id::TEXT), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;
