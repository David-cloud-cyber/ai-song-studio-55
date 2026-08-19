-- Commercial payment reconciliation, attribution and internal economics.
ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS revenue_xaf INTEGER,
  ADD COLUMN IF NOT EXISTS fee_xaf INTEGER,
  ADD COLUMN IF NOT EXISTS provider_payload JSONB,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS fbclid TEXT;

UPDATE public.payment_orders
SET external_id = id::text
WHERE external_id IS NULL;

ALTER TABLE public.payment_orders
  ALTER COLUMN external_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_external_id_idx
  ON public.payment_orders(external_id);

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_order_id UUID NOT NULL REFERENCES public.payment_orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'fapshi',
  provider_reference TEXT NOT NULL,
  provider_status TEXT NOT NULL,
  amount_xaf INTEGER NOT NULL,
  revenue_xaf INTEGER,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_reference, provider_status, amount_xaf)
);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_webhook_events TO service_role;

CREATE TABLE IF NOT EXISTS public.ad_spend_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  campaign TEXT NOT NULL,
  amount_xaf INTEGER NOT NULL CHECK (amount_xaf >= 0),
  source TEXT NOT NULL DEFAULT 'meta',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

ALTER TABLE public.ad_spend_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ad_spend_entries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ad_spend_entries TO service_role;

CREATE INDEX IF NOT EXISTS payment_orders_status_created_idx
  ON public.payment_orders(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.activate_payment_order(
  _provider_reference TEXT,
  _external_id TEXT,
  _provider_status TEXT,
  _amount_xaf INTEGER,
  _revenue_xaf INTEGER DEFAULT NULL,
  _payload JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.payment_orders%ROWTYPE;
  _profile public.profiles%ROWTYPE;
  _period INTERVAL;
  _expires_at TIMESTAMPTZ;
  _inserted INTEGER;
  _net_revenue INTEGER := GREATEST(0, COALESCE(_revenue_xaf, _amount_xaf));
BEGIN
  IF _provider_status NOT IN ('CREATED', 'PENDING', 'SUCCESSFUL', 'FAILED', 'EXPIRED')
     OR _amount_xaf IS NULL OR _amount_xaf <= 0
     OR NULLIF(trim(_provider_reference), '') IS NULL
     OR NULLIF(trim(_external_id), '') IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO _order
  FROM public.payment_orders
  WHERE provider_reference = _provider_reference
    AND external_id = _external_id
  FOR UPDATE;

  IF NOT FOUND OR _order.amount_xaf <> _amount_xaf THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.payment_webhook_events (
    payment_order_id, provider_reference, provider_status, amount_xaf, revenue_xaf, payload
  ) VALUES (
    _order.id, _provider_reference, _provider_status, _amount_xaf, _net_revenue, COALESCE(_payload, '{}'::jsonb)
  )
  ON CONFLICT (provider, provider_reference, provider_status, amount_xaf) DO NOTHING;

  GET DIAGNOSTICS _inserted = ROW_COUNT;

  UPDATE public.payment_orders
  SET provider_status = _provider_status,
      revenue_xaf = _net_revenue,
      fee_xaf = GREATEST(0, _amount_xaf - _net_revenue),
      provider_payload = COALESCE(_payload, '{}'::jsonb),
      status = CASE
        WHEN _provider_status = 'SUCCESSFUL' THEN 'paid'
        WHEN _provider_status = 'FAILED' THEN 'failed'
        WHEN _provider_status = 'EXPIRED' THEN 'expired'
        ELSE status
      END,
      updated_at = now()
  WHERE id = _order.id;

  IF _provider_status <> 'SUCCESSFUL' OR _order.status = 'paid' OR _inserted = 0 THEN
    RETURN TRUE;
  END IF;

  SELECT * INTO _profile
  FROM public.profiles
  WHERE id = _order.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  _period := CASE WHEN _order.cycle = 'yearly' THEN INTERVAL '12 months' ELSE INTERVAL '30 days' END;
  _expires_at := GREATEST(COALESCE(_profile.subscription_expires_at, now()), now()) + _period;

  UPDATE public.profiles
  SET plan = _order.plan,
      subscription_status = 'active',
      subscription_source = 'fapshi',
      subscription_expires_at = _expires_at,
      credits = _order.credits_granted,
      daily_credits_used = 0,
      updated_at = now()
  WHERE id = _order.user_id;

  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after)
  VALUES (_order.user_id, _order.credits_granted, 'Abonnement Loopster · crédits inclus', _order.credits_granted);

  UPDATE public.payment_orders
  SET status = 'paid',
      activated_at = now(),
      expires_at = _expires_at,
      updated_at = now()
  WHERE id = _order.id;

  RETURN TRUE;
END;
$$;

DROP FUNCTION IF EXISTS public.activate_payment_order(TEXT, TEXT, INTEGER);
REVOKE ALL ON FUNCTION public.activate_payment_order(TEXT, TEXT, TEXT, INTEGER, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_payment_order(TEXT, TEXT, TEXT, INTEGER, INTEGER, JSONB) TO service_role;
