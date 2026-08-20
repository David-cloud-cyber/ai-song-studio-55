-- Provider cover synchronization for historical and future projects.
-- This migration never starts a music generation and never changes credits.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS provider_cover_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS provider_cover_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_cover_last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_cover_error TEXT;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_provider_cover_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_provider_cover_status_check
  CHECK (provider_cover_status IN ('pending', 'synced', 'unavailable', 'failed'));

CREATE TABLE IF NOT EXISTS public.project_cover_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  source TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_cover_versions_source_check
    CHECK (source IN ('default', 'provider', 'ai')),
  UNIQUE (project_id, storage_path)
);

CREATE INDEX IF NOT EXISTS project_cover_versions_project_idx
  ON public.project_cover_versions (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS projects_provider_cover_sync_idx
  ON public.projects (provider_cover_status, created_at);

UPDATE public.projects
SET cover_source = CASE
      WHEN image_path LIKE '%cover-default.svg' THEN 'default'
      WHEN image_path LIKE '%cover-generated%' THEN 'ai'
      ELSE cover_source
    END
WHERE image_path IS NOT NULL;

UPDATE public.projects
SET provider_cover_status = CASE
      WHEN cover_source = 'provider'
       AND image_path IS NOT NULL
       AND image_path NOT LIKE '%cover-default.svg'
       AND image_path NOT LIKE '%cover-generated%'
        THEN 'synced'
      ELSE 'pending'
    END
WHERE provider_cover_status IS NULL
   OR provider_cover_status = 'pending';

ALTER TABLE public.project_cover_versions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_cover_versions TO authenticated;
GRANT ALL ON public.project_cover_versions TO service_role;

DROP POLICY IF EXISTS "Users can view own project cover versions" ON public.project_cover_versions;
CREATE POLICY "Users can view own project cover versions"
  ON public.project_cover_versions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_cover_versions.project_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role manages project cover versions" ON public.project_cover_versions;
CREATE POLICY "Service role manages project cover versions"
  ON public.project_cover_versions FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP VIEW IF EXISTS public.public_creations;

-- A public card is valid only when both durable public assets exist.
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
