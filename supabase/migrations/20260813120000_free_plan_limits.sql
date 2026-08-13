-- Loopster Free plan: 80 credits per day and downloads reserved for subscribers.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS daily_credits_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_credits_reset_at DATE NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE public.profiles
  ALTER COLUMN credits SET DEFAULT 80;

-- Bring existing free accounts onto the new daily allowance without touching paid accounts.
UPDATE public.profiles
SET credits = 80,
    daily_credits_used = 0,
    daily_credits_reset_at = CURRENT_DATE,
    updated_at = now()
WHERE COALESCE(plan, 'free') = 'free';

CREATE OR REPLACE FUNCTION public.deduct_credits(_amount INTEGER, _reason TEXT, _project_id UUID DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _new_balance INTEGER;
  _plan TEXT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;

  SELECT plan INTO _plan FROM public.profiles WHERE id = _uid FOR UPDATE;

  IF COALESCE(_plan, 'free') = 'free' THEN
    UPDATE public.profiles
    SET credits = 80,
        daily_credits_used = 0,
        daily_credits_reset_at = CURRENT_DATE,
        updated_at = now()
    WHERE id = _uid AND daily_credits_reset_at < CURRENT_DATE;
  END IF;

  UPDATE public.profiles SET credits = credits - _amount, updated_at = now()
  WHERE id = _uid AND credits >= _amount RETURNING credits INTO _new_balance;

  IF _new_balance IS NULL THEN RAISE EXCEPTION 'Insufficient credits'; END IF;

  UPDATE public.profiles
  SET daily_credits_used = CASE WHEN COALESCE(_plan, 'free') = 'free' THEN daily_credits_used + _amount ELSE daily_credits_used END
  WHERE id = _uid;

  INSERT INTO public.credit_transactions (user_id, amount, reason, project_id, balance_after)
  VALUES (_uid, -_amount, _reason, _project_id, _new_balance);

  RETURN _new_balance;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _display TEXT := COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  _initials TEXT := UPPER(LEFT(REGEXP_REPLACE(_display, '[^a-zA-Z]', '', 'g'), 2));
BEGIN
  INSERT INTO public.profiles (id, display_name, initials, avatar_url, credits, plan, subscription_status, daily_credits_used, daily_credits_reset_at)
  VALUES (NEW.id, _display, NULLIF(_initials, ''), NEW.raw_user_meta_data->>'avatar_url', 80, 'free', 'inactive', 0, CURRENT_DATE)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after)
  VALUES (NEW.id, 80, 'Crédits de bienvenue', 80);

  RETURN NEW;
END; $$;
