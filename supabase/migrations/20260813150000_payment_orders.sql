-- Orders keep the selected plan and provider transaction together until payment confirmation.
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'premier')),
  cycle TEXT NOT NULL CHECK (cycle IN ('monthly', 'yearly')),
  amount_xaf INTEGER NOT NULL CHECK (amount_xaf >= 100),
  credits_granted INTEGER NOT NULL CHECK (credits_granted > 0),
  provider TEXT NOT NULL DEFAULT 'fapshi',
  provider_reference TEXT UNIQUE,
  provider_status TEXT NOT NULL DEFAULT 'CREATED',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payment_orders_user_id_idx ON public.payment_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_orders_provider_reference_idx ON public.payment_orders(provider_reference);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their payment orders" ON public.payment_orders;
CREATE POLICY "Users can view their payment orders"
  ON public.payment_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;

DROP TRIGGER IF EXISTS payment_orders_set_updated_at ON public.payment_orders;
CREATE TRIGGER payment_orders_set_updated_at
  BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

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
BEGIN
  SELECT * INTO _order
  FROM public.payment_orders
  WHERE provider_reference = _provider_reference
  FOR UPDATE;

  IF NOT FOUND OR _order.amount_xaf <> _amount_xaf THEN
    RETURN FALSE;
  END IF;

  IF _provider_status <> 'SUCCESSFUL' THEN
    UPDATE public.payment_orders
      SET provider_status = _provider_status,
          status = CASE WHEN _provider_status IN ('FAILED', 'EXPIRED') THEN 'failed' ELSE status END
    WHERE id = _order.id;
    RETURN TRUE;
  END IF;

  IF _order.status = 'paid' THEN RETURN TRUE; END IF;

  _credits := _order.credits_granted;
  _period := CASE WHEN _order.cycle = 'yearly' THEN INTERVAL '12 months' ELSE INTERVAL '30 days' END;

  UPDATE public.profiles
    SET plan = _order.plan,
        subscription_status = 'active',
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
        expires_at = now() + _period
  WHERE id = _order.id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_payment_order(TEXT, TEXT, INTEGER) TO service_role;
