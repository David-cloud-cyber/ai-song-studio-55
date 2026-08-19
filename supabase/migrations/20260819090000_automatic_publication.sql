-- Automatic publication policy for Free creations and durable public media.
-- Paid plans keep project-level publication control.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_publication_notice_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS free_publication_notice_version TEXT;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS publication_policy TEXT NOT NULL DEFAULT 'manual_paid',
  ADD COLUMN IF NOT EXISTS publication_error TEXT,
  ADD COLUMN IF NOT EXISTS publication_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS publication_last_attempt_at TIMESTAMPTZ;

UPDATE public.projects
SET publication_status = CASE WHEN is_public THEN 'published' ELSE 'not_required' END
WHERE publication_status IS NULL
   OR publication_status = 'not_required';

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_publication_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_publication_status_check
  CHECK (publication_status IN ('not_required', 'pending', 'published', 'retry_pending', 'failed'));

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_publication_policy_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_publication_policy_check
  CHECK (publication_policy IN ('automatic_free', 'manual_paid'));

CREATE INDEX IF NOT EXISTS projects_publication_retry_idx
  ON public.projects (user_id, publication_last_attempt_at)
  WHERE publication_status IN ('retry_pending', 'failed');

DROP VIEW IF EXISTS public.public_creations;

-- Never fall back to a private or temporary audio URL. A row is public only
-- after the durable public copy has been created successfully.
CREATE VIEW public.public_creations AS
SELECT
  p.id,
  p.title,
  p.genre,
  p.duration_seconds,
  p.public_image_url AS cover_url,
  p.public_image_url AS image_url,
  p.public_audio_url AS audio_url,
  COALESCE(NULLIF(trim(pr.display_name), ''), 'Créateur Loopster') AS creator_name,
  p.created_at,
  p.published_at
FROM public.projects AS p
LEFT JOIN public.profiles AS pr ON pr.id = p.user_id
WHERE p.is_public = true
  AND p.archived_at IS NULL
  AND p.status = 'ready'
  AND p.publication_status = 'published'
  AND p.public_audio_url IS NOT NULL;

GRANT SELECT ON public.public_creations TO anon, authenticated;
