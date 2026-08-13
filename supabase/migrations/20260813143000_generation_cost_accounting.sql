-- Suivi séparé des crédits Loopster et du coût fournisseur.
ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS provider_credits_spent numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_cost_usd numeric(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_refunded integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS generation_jobs_user_idempotency_key_idx
  ON public.generation_jobs (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.refund_credits(
  _user_id uuid,
  _amount integer,
  _reason text,
  _project_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Refund amount must be positive';
  END IF;

  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM _user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.profiles
  SET credits = credits + _amount,
      daily_credits_used = CASE
        WHEN lower(coalesce(plan, 'free')) = 'free'
          THEN greatest(0, daily_credits_used - _amount)
        ELSE daily_credits_used
      END,
      updated_at = now()
  WHERE id = _user_id
  RETURNING credits INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason, project_id, balance_after)
  VALUES (_user_id, _amount, _reason, _project_id, new_balance);

  RETURN new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_credits(uuid, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, integer, text, uuid) TO authenticated, service_role;
