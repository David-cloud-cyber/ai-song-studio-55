-- Fiabilise les remboursements et récupère les traitements qui n'ont reçu
-- aucune réponse du fournisseur après un délai raisonnable.

CREATE OR REPLACE FUNCTION public.refund_generation_job(
  _job_id UUID,
  _reason TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job public.generation_jobs%ROWTYPE;
  _amount INTEGER;
  _new_balance INTEGER;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO _job
  FROM public.generation_jobs
  WHERE id = _job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  _amount := GREATEST(0, COALESCE(_job.credits_spent, 0) - COALESCE(_job.credits_refunded, 0));
  IF _amount = 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.profiles
  SET credits = credits + _amount,
      daily_credits_used = CASE
        WHEN lower(coalesce(plan, 'free')) = 'free'
          THEN greatest(0, daily_credits_used - _amount)
        ELSE daily_credits_used
      END,
      updated_at = now()
  WHERE id = _job.user_id
  RETURNING credits INTO _new_balance;

  IF _new_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason, project_id, balance_after)
  VALUES (
    _job.user_id,
    _amount,
    COALESCE(NULLIF(trim(_reason), ''), 'Remboursement · génération échouée'),
    _job.project_id,
    _new_balance
  );

  UPDATE public.generation_jobs
  SET credits_refunded = credits_spent,
      refunded_at = now(),
      updated_at = now()
  WHERE id = _job.id;

  RETURN _amount;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_generation_job(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_generation_job(UUID, TEXT) TO service_role;

-- Nettoyage idempotent des anciens traitements déjà bloqués au moment de la
-- migration. Les futurs traitements sont récupérés par le serveur applicatif.
DO $$
DECLARE
  _job RECORD;
  _amount INTEGER;
  _new_balance INTEGER;
BEGIN
  FOR _job IN
    SELECT *
    FROM public.generation_jobs
    WHERE status IN ('pending', 'processing')
      AND updated_at < now() - interval '15 minutes'
    FOR UPDATE
  LOOP
    _amount := GREATEST(0, COALESCE(_job.credits_spent, 0) - COALESCE(_job.credits_refunded, 0));

    IF _amount > 0 THEN
      UPDATE public.profiles
      SET credits = credits + _amount,
          daily_credits_used = CASE
            WHEN lower(coalesce(plan, 'free')) = 'free'
              THEN greatest(0, daily_credits_used - _amount)
            ELSE daily_credits_used
          END,
          updated_at = now()
      WHERE id = _job.user_id
      RETURNING credits INTO _new_balance;

      IF _new_balance IS NOT NULL THEN
        INSERT INTO public.credit_transactions (user_id, amount, reason, project_id, balance_after)
        VALUES (_job.user_id, _amount, 'Remboursement · création interrompue', _job.project_id, _new_balance);
      END IF;
    END IF;

    UPDATE public.generation_jobs
    SET status = 'failed',
        error_message = 'Le traitement a dépassé le temps prévu.',
        credits_refunded = credits_spent,
        refunded_at = CASE WHEN _amount > 0 THEN now() ELSE refunded_at END,
        updated_at = now()
    WHERE id = _job.id;

    IF _job.project_id IS NOT NULL THEN
      UPDATE public.projects
      SET status = 'draft', progress = 0,
          error_message = 'La création a dépassé le temps prévu.',
          updated_at = now()
      WHERE id = _job.project_id AND status = 'rendering';
    END IF;
  END LOOP;

  UPDATE public.projects
  SET status = 'draft', progress = 0,
      error_message = 'La création a dépassé le temps prévu.',
      updated_at = now()
  WHERE status = 'rendering'
    AND updated_at < now() - interval '15 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM public.generation_jobs job
      WHERE job.project_id = projects.id
        AND job.status IN ('pending', 'processing')
    );
END;
$$;
