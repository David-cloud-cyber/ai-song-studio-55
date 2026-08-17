DROP POLICY IF EXISTS "Users can manage own lyrics versions" ON public.lyrics_versions;
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
