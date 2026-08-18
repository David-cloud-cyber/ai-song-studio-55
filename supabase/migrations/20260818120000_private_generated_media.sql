-- Generated files are private by default. Public copies are created only when
-- a creator explicitly publishes a project in the gallery.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS audio_path TEXT,
  ADD COLUMN IF NOT EXISTS image_path TEXT,
  ADD COLUMN IF NOT EXISTS wav_path TEXT,
  ADD COLUMN IF NOT EXISTS video_path TEXT,
  ADD COLUMN IF NOT EXISTS public_audio_url TEXT,
  ADD COLUMN IF NOT EXISTS public_image_url TEXT,
  ADD COLUMN IF NOT EXISTS public_wav_url TEXT,
  ADD COLUMN IF NOT EXISTS public_video_url TEXT;

-- Keep the legacy public bucket readable so already-published creations do
-- not disappear during rollout. New files use the private bucket below.
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-media-private', 'generated-media-private', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('public-generated-media', 'public-generated-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Users can read own generated media" ON storage.objects;
CREATE POLICY "Users can read own generated media"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'generated-media-private'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Public generated media is publicly readable" ON storage.objects;
CREATE POLICY "Public generated media is publicly readable"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'public-generated-media');

DROP POLICY IF EXISTS "Service role can write generated media" ON storage.objects;
CREATE POLICY "Service role can write generated media"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id IN ('generated-media-private', 'generated-media', 'public-generated-media'));

DROP POLICY IF EXISTS "Service role can update generated media" ON storage.objects;
CREATE POLICY "Service role can update generated media"
  ON storage.objects FOR UPDATE TO service_role
  USING (bucket_id IN ('generated-media-private', 'generated-media', 'public-generated-media'))
  WITH CHECK (bucket_id IN ('generated-media-private', 'generated-media', 'public-generated-media'));

DROP POLICY IF EXISTS "Service role can delete generated media" ON storage.objects;
CREATE POLICY "Service role can delete generated media"
  ON storage.objects FOR DELETE TO service_role
  USING (bucket_id IN ('generated-media-private', 'generated-media', 'public-generated-media'));

DROP VIEW IF EXISTS public.public_creations;
CREATE VIEW public.public_creations AS
SELECT
  p.id,
  p.title,
  p.genre,
  p.duration_seconds,
  COALESCE(p.public_image_url, p.image_url, p.cover_url) AS cover_url,
  COALESCE(p.public_image_url, p.image_url, p.cover_url) AS image_url,
  COALESCE(p.public_audio_url, p.audio_url) AS audio_url,
  COALESCE(NULLIF(trim(pr.display_name), ''), 'Créateur Loopster') AS creator_name,
  p.created_at,
  p.published_at
FROM public.projects AS p
LEFT JOIN public.profiles AS pr ON pr.id = p.user_id
WHERE p.is_public = true
  AND p.archived_at IS NULL
  AND p.status = 'ready'
  AND COALESCE(p.public_audio_url, p.audio_url) IS NOT NULL;

GRANT SELECT ON public.public_creations TO anon, authenticated;
