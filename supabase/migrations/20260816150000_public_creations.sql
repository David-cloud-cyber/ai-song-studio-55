-- Public Loopster creations are opt-in and expose only safe presentation fields.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS projects_public_published_idx
  ON public.projects (published_at DESC)
  WHERE is_public = true AND status = 'ready';

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
  AND p.status = 'ready'
  AND p.audio_url IS NOT NULL;

GRANT SELECT ON public.public_creations TO anon, authenticated;
