-- Commercial access must have an explicit end date. Legacy paid profiles with
-- no date remain compatible until their next renewal writes one.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_source TEXT NOT NULL DEFAULT 'none';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_source_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_source_check
  CHECK (subscription_source IN ('none', 'fapshi', 'test'));

CREATE INDEX IF NOT EXISTS profiles_subscription_expiry_idx
  ON public.profiles(subscription_expires_at)
  WHERE subscription_expires_at IS NOT NULL;

-- Keep the profile state clean without affecting the payment ledger. This is
-- safe to call repeatedly from an operator task or a scheduled job.
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

CREATE OR REPLACE FUNCTION public.activate_payment_order(
  _provider_reference TEXT,
  _provider_status TEXT,
  _amount_xaf INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.payment_orders%ROWTYPE;
  _credits INTEGER;
  _period INTERVAL;
  _expires_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO _order
  FROM public.payment_orders
  WHERE provider_reference = _provider_reference
  FOR UPDATE;

  IF NOT FOUND OR _order.amount_xaf <> _amount_xaf THEN
    RETURN FALSE;
  END IF;

  -- A late FAILED/EXPIRED notification must never undo a paid order.
  IF _order.status = 'paid' THEN
    RETURN TRUE;
  END IF;

  IF _provider_status <> 'SUCCESSFUL' THEN
    UPDATE public.payment_orders
    SET provider_status = _provider_status,
        status = CASE
          WHEN _provider_status IN ('FAILED', 'EXPIRED') THEN 'failed'
          ELSE status
        END
    WHERE id = _order.id;
    RETURN TRUE;
  END IF;

  _credits := _order.credits_granted;
  _period := CASE
    WHEN _order.cycle = 'yearly' THEN INTERVAL '12 months'
    ELSE INTERVAL '30 days'
  END;

  SELECT GREATEST(COALESCE(subscription_expires_at, now()), now()) + _period
  INTO _expires_at
  FROM public.profiles
  WHERE id = _order.user_id
  FOR UPDATE;

  IF _expires_at IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET plan = _order.plan,
      subscription_status = 'active',
      subscription_source = 'fapshi',
      subscription_expires_at = _expires_at,
      credits = _credits,
      daily_credits_used = 0,
      updated_at = now()
  WHERE id = _order.user_id;

  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after)
  VALUES (_order.user_id, _credits, 'Abonnement Loopster · crédits inclus', _credits);

  UPDATE public.payment_orders
  SET provider_status = _provider_status,
      status = 'paid',
      activated_at = now(),
      expires_at = _expires_at
  WHERE id = _order.id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_payment_order(TEXT, TEXT, INTEGER) TO service_role;

-- Enforce expiry at the same locked point as credit consumption. This keeps
-- expired paid accounts from using subscriber allowances before a scheduler
-- has had a chance to normalize their profile.
CREATE OR REPLACE FUNCTION public.deduct_credits(_amount INTEGER, _reason TEXT, _project_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _new_balance INTEGER;
  _plan TEXT;
  _expires_at TIMESTAMPTZ;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;

  SELECT COALESCE(plan, 'free'), subscription_expires_at
  INTO _plan, _expires_at
  FROM public.profiles
  WHERE id = _uid
  FOR UPDATE;

  IF _plan IN ('pro', 'premier', 'studio', 'creator')
     AND _expires_at IS NOT NULL
     AND _expires_at <= now() THEN
    UPDATE public.profiles
    SET plan = 'free',
        subscription_status = 'expired',
        subscription_source = 'none',
        subscription_expires_at = NULL,
        credits = 80,
        daily_credits_used = 0,
        daily_credits_reset_at = CURRENT_DATE,
        updated_at = now()
    WHERE id = _uid;
    _plan := 'free';
  ELSIF _plan = 'free' THEN
    UPDATE public.profiles
    SET credits = 80,
        daily_credits_used = 0,
        daily_credits_reset_at = CURRENT_DATE,
        updated_at = now()
    WHERE id = _uid AND daily_credits_reset_at < CURRENT_DATE;
  END IF;

  UPDATE public.profiles
  SET credits = credits - _amount,
      daily_credits_used = CASE WHEN _plan = 'free' THEN daily_credits_used + _amount ELSE daily_credits_used END,
      updated_at = now()
  WHERE id = _uid AND credits >= _amount
  RETURNING credits INTO _new_balance;

  IF _new_balance IS NULL THEN RAISE EXCEPTION 'Insufficient credits'; END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason, project_id, balance_after)
  VALUES (_uid, -_amount, _reason, _project_id, _new_balance);

  RETURN _new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_credits(INTEGER, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deduct_credits(INTEGER, TEXT, UUID) TO authenticated;
