-- Advanced Loopster workspace: versions, tracks, sections, lyrics and custom voices.
-- All source assets remain private; only durable generated assets can be public when
-- the parent project is explicitly published.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS edit_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS active_version_id UUID,
  ADD COLUMN IF NOT EXISTS persona_id TEXT,
  ADD COLUMN IF NOT EXISTS voice_profile_id UUID;

CREATE TABLE IF NOT EXISTS public.project_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_version_id UUID REFERENCES public.project_versions(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  label TEXT NOT NULL DEFAULT 'Version originale',
  prompt TEXT,
  lyrics TEXT,
  audio_url TEXT,
  wav_url TEXT,
  video_url TEXT,
  cover_url TEXT,
  stems JSONB,
  edit_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, version_number)
);

CREATE INDEX IF NOT EXISTS project_versions_project_idx
  ON public.project_versions (project_id, version_number DESC);

CREATE TABLE IF NOT EXISTS public.project_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.project_versions(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'master',
  label TEXT NOT NULL,
  asset_url TEXT,
  source_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  start_seconds NUMERIC(10,3) NOT NULL DEFAULT 0,
  end_seconds NUMERIC(10,3),
  gain NUMERIC(6,3) NOT NULL DEFAULT 1,
  muted BOOLEAN NOT NULL DEFAULT false,
  solo BOOLEAN NOT NULL DEFAULT false,
  fade_in_seconds NUMERIC(8,3) NOT NULL DEFAULT 0,
  fade_out_seconds NUMERIC(8,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_tracks_project_idx
  ON public.project_tracks (project_id, version_id, sort_order);

CREATE TABLE IF NOT EXISTS public.project_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.project_versions(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL DEFAULT 'section',
  label TEXT NOT NULL,
  start_seconds NUMERIC(10,3) NOT NULL DEFAULT 0,
  end_seconds NUMERIC(10,3) NOT NULL,
  lyric_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_seconds >= start_seconds)
);

CREATE INDEX IF NOT EXISTS project_sections_project_idx
  ON public.project_sections (project_id, version_id, start_seconds);

CREATE TABLE IF NOT EXISTS public.lyrics_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.project_versions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'generated',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lyrics_versions_project_idx
  ON public.lyrics_versions (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.voice_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  provider_voice_id TEXT,
  validation_task_id TEXT,
  validation_phrase TEXT,
  verify_asset_path TEXT,
  source_asset_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  consent_version TEXT NOT NULL DEFAULT '2026-08-17',
  consent_at TIMESTAMPTZ NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS voice_profiles_user_idx
  ON public.voice_profiles (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.music_personas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  provider_persona_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS music_personas_user_idx
  ON public.music_personas (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.operation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  generation_job_id UUID REFERENCES public.generation_jobs(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operation_events_user_idx
  ON public.operation_events (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS project_tracks_set_updated_at ON public.project_tracks;
CREATE TRIGGER project_tracks_set_updated_at BEFORE UPDATE ON public.project_tracks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS project_sections_set_updated_at ON public.project_sections;
CREATE TRIGGER project_sections_set_updated_at BEFORE UPDATE ON public.project_sections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS voice_profiles_set_updated_at ON public.voice_profiles;
CREATE TRIGGER voice_profiles_set_updated_at BEFORE UPDATE ON public.voice_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS music_personas_set_updated_at ON public.music_personas;
CREATE TRIGGER music_personas_set_updated_at BEFORE UPDATE ON public.music_personas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-sources', 'voice-sources', false)
ON CONFLICT (id) DO UPDATE SET public = false;

ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lyrics_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_personas ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tracks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lyrics_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_personas TO authenticated;
GRANT SELECT ON public.operation_events TO authenticated;
GRANT ALL ON public.project_versions, public.project_tracks, public.project_sections,
  public.lyrics_versions, public.voice_profiles, public.music_personas, public.operation_events TO service_role;

CREATE POLICY "Users can manage own project versions" ON public.project_versions
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_versions.project_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_versions.project_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own project tracks" ON public.project_tracks
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tracks.project_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tracks.project_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own project sections" ON public.project_sections
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_sections.project_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_sections.project_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own lyrics versions" ON public.lyrics_versions
  FOR ALL TO authenticated USING (
    auth.uid() = created_by AND EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = lyrics_versions.project_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = created_by AND EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = lyrics_versions.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own voice profiles" ON public.voice_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own music personas" ON public.music_personas
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own operation events" ON public.operation_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own voice source files"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'voice-sources' AND (storage.foldername(name))[1] = (select auth.uid()::text))
  WITH CHECK (bucket_id = 'voice-sources' AND (storage.foldername(name))[1] = (select auth.uid()::text));
