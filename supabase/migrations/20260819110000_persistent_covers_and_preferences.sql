-- Persistent covers and account preferences.
-- Provider and AI images are stored in image_path; this metadata makes the
-- source explicit and lets the UI replace only a generated default cover.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cover_source TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS cover_generation_status TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS cover_error TEXT;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_cover_source_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_cover_source_check
  CHECK (cover_source IN ('default', 'provider', 'ai'));

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_cover_generation_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_cover_generation_status_check
  CHECK (cover_generation_status IN ('ready', 'pending', 'failed'));

UPDATE public.projects
SET cover_source = CASE
      WHEN image_path IS NOT NULL OR image_url IS NOT NULL OR cover_url IS NOT NULL THEN 'provider'
      ELSE 'default'
    END,
    cover_generation_status = 'ready'
WHERE cover_source IS NULL OR cover_generation_status IS NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Existing accounts have already passed the former onboarding flow. New
-- accounts keep NULL and will be guided through the persisted flow.
UPDATE public.profiles
SET onboarding_completed_at = created_at
WHERE onboarding_completed_at IS NULL
  AND created_at < now();

DROP VIEW IF EXISTS public.public_creations;

-- Public cards require both durable media files. No private or temporary URL
-- is ever exposed as a fallback.
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
  AND p.public_audio_url IS NOT NULL
  AND p.public_image_url IS NOT NULL;

GRANT SELECT ON public.public_creations TO anon, authenticated;
