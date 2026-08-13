-- Audio capabilities used by the existing SaaS UI.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS daily_credits_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_credits_reset_at DATE NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS wav_url TEXT;

-- Private source-audio storage. Suno receives short-lived signed URLs only.
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-inputs', 'audio-inputs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own source audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio-inputs' AND (storage.foldername(name))[1] = (select auth.uid()::text));

CREATE POLICY "Users can read own source audio"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audio-inputs' AND (storage.foldername(name))[1] = (select auth.uid()::text));

CREATE POLICY "Users can delete own source audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'audio-inputs' AND (storage.foldername(name))[1] = (select auth.uid()::text));
