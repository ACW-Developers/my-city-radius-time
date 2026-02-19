
-- WebAuthn credentials table for biometric check-in
CREATE TABLE public.webauthn_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] DEFAULT '{}',
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own credentials" ON public.webauthn_credentials FOR ALL USING (auth.uid() = user_id);

-- Add badge_code to profiles for QR badge check-in
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badge_code TEXT UNIQUE;

-- Generate badge codes for existing users
UPDATE public.profiles SET badge_code = UPPER(SUBSTR(MD5(RANDOM()::TEXT || user_id::TEXT), 1, 8)) WHERE badge_code IS NULL;

-- Auto-generate badge code on new profiles
CREATE OR REPLACE FUNCTION public.generate_badge_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.badge_code IS NULL THEN
    NEW.badge_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT || NEW.user_id::TEXT), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_badge_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_badge_code();
