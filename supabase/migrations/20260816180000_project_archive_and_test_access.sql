-- Recoverable project archiving and a one-time, non-billed operator grant.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS projects_user_archived_idx
  ON public.projects (user_id, archived_at, created_at DESC);

DROP VIEW IF EXISTS public.public_creations;

CREATE VIEW public.public_creations AS
SELECT
  p.id,
  p.title,
  p.genre,
  p.duration_seconds,
  p.cover_url,
  p.image_url,
  p.audio_url,
  p.created_at,
  p.published_at,
  COALESCE(NULLIF(pr.handle, ''), NULLIF(pr.display_name, ''), 'Créateur Loopster') AS creator_name
FROM public.projects AS p
LEFT JOIN public.profiles AS pr ON pr.id = p.user_id
WHERE p.is_public = true
  AND p.archived_at IS NULL
  AND p.status = 'ready'
  AND p.audio_url IS NOT NULL;

GRANT SELECT ON public.public_creations TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.test_access_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_key TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  cycle TEXT NOT NULL DEFAULT 'yearly',
  credits_granted INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.test_access_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.test_access_grants FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.test_access_grants TO service_role;

-- This function is deliberately service-role-only. It never creates an
-- account, never creates a payment order and never records revenue.
CREATE OR REPLACE FUNCTION public.grant_test_subscription(
  _email TEXT,
  _grant_key TEXT,
  _plan TEXT DEFAULT 'premier',
  _credits INTEGER DEFAULT 10000,
  _duration INTERVAL DEFAULT INTERVAL '12 months'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _user_id UUID;
  _confirmed_at TIMESTAMPTZ;
  _profile public.profiles%ROWTYPE;
  _expires_at TIMESTAMPTZ;
  _existing public.test_access_grants%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Operator access required';
  END IF;

  IF lower(trim(coalesce(_plan, ''))) NOT IN ('pro', 'premier') THEN
    RAISE EXCEPTION 'Unsupported test plan';
  END IF;
  IF _credits <= 0 OR length(trim(coalesce(_grant_key, ''))) < 8 THEN
    RAISE EXCEPTION 'Invalid test grant';
  END IF;

  SELECT id, email_confirmed_at
  INTO _user_id, _confirmed_at
  FROM auth.users
  WHERE lower(email) = lower(trim(_email))
  LIMIT 1;

  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;
  IF _confirmed_at IS NULL THEN
    RETURN jsonb_build_object('status', 'not_confirmed', 'user_id', _user_id);
  END IF;

  SELECT * INTO _existing
  FROM public.test_access_grants
  WHERE grant_key = trim(_grant_key);
  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'already_granted',
      'user_id', _existing.user_id,
      'expires_at', _existing.expires_at,
      'credits_granted', _existing.credits_granted
    );
  END IF;

  SELECT * INTO _profile
  FROM public.profiles
  WHERE id = _user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'profile_missing', 'user_id', _user_id);
  END IF;

  IF _profile.subscription_source = 'fapshi'
     AND _profile.subscription_expires_at IS NOT NULL
     AND _profile.subscription_expires_at > now() THEN
    RETURN jsonb_build_object('status', 'paid_subscription_active', 'user_id', _user_id);
  END IF;

  _expires_at := now() + _duration;

  INSERT INTO public.test_access_grants (
    user_id, grant_key, plan, cycle, credits_granted, expires_at, reason
  ) VALUES (
    _user_id, trim(_grant_key), lower(_plan), 'yearly', _credits, _expires_at,
    'Accès de test Loopster demandé par le propriétaire'
  );

  UPDATE public.profiles
  SET plan = lower(_plan),
      subscription_status = 'active',
      subscription_source = 'test',
      subscription_expires_at = _expires_at,
      credits = _credits,
      daily_credits_used = 0,
      daily_credits_reset_at = CURRENT_DATE,
      updated_at = now()
  WHERE id = _user_id;

  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after)
  VALUES (_user_id, _credits, 'Accès de test Premier annuel · crédits inclus', _credits);

  RETURN jsonb_build_object(
    'status', 'activated',
    'user_id', _user_id,
    'plan', lower(_plan),
    'cycle', 'yearly',
    'credits_granted', _credits,
    'expires_at', _expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_test_subscription(TEXT, TEXT, TEXT, INTEGER, INTERVAL) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_test_subscription(TEXT, TEXT, TEXT, INTEGER, INTERVAL) TO service_role;

-- Keep the expiry field consistent after normalization.
CREATE OR REPLACE FUNCTION public.expire_loopster_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INTEGER;
BEGIN
  UPDATE public.profiles
  SET plan = 'free',
      subscription_status = 'expired',
      subscription_source = 'none',
      subscription_expires_at = NULL,
      updated_at = now()
  WHERE plan IN ('pro', 'premier', 'studio', 'creator')
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at <= now()
    AND subscription_status IN ('active', 'trialing', 'paid');

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_loopster_subscriptions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_loopster_subscriptions() TO service_role;
