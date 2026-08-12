ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS suno_task_id TEXT,
  ADD COLUMN IF NOT EXISTS suno_audio_id TEXT,
  ADD COLUMN IF NOT EXISTS instrumental BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS style TEXT,
  ADD COLUMN IF NOT EXISTS stems JSONB,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS parent_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_suno_task_id_idx ON public.projects (suno_task_id);

CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'song',
  status TEXT NOT NULL DEFAULT 'pending',
  suno_task_id TEXT,
  credits_spent INTEGER NOT NULL DEFAULT 0,
  payload JSONB,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.generation_jobs TO authenticated;
GRANT ALL ON public.generation_jobs TO service_role;

ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation jobs"
  ON public.generation_jobs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own generation jobs"
  ON public.generation_jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS generation_jobs_user_idx ON public.generation_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS generation_jobs_task_idx ON public.generation_jobs (suno_task_id);

CREATE TRIGGER generation_jobs_set_updated_at
  BEFORE UPDATE ON public.generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();