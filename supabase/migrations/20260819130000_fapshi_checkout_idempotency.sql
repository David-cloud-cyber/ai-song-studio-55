-- Keep hosted Fapshi checkouts reusable for the same user intent.
ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS provider_link TEXT,
  ADD COLUMN IF NOT EXISTS provider_link_expires_at TIMESTAMPTZ;

UPDATE public.payment_orders
SET idempotency_key = id::text
WHERE idempotency_key IS NULL;

ALTER TABLE public.payment_orders
  ALTER COLUMN idempotency_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_user_id_idempotency_key_idx
  ON public.payment_orders(user_id, idempotency_key);
