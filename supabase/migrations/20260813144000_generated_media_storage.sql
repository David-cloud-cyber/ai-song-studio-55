-- Durable copies of provider media. The callback writes through the service role.
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-media', 'generated-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Generated media is publicly readable" ON storage.objects;
CREATE POLICY "Generated media is publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-media');

DROP POLICY IF EXISTS "Service role can write generated media" ON storage.objects;
CREATE POLICY "Service role can write generated media"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'generated-media');

DROP POLICY IF EXISTS "Service role can update generated media" ON storage.objects;
CREATE POLICY "Service role can update generated media"
  ON storage.objects FOR UPDATE TO service_role
  USING (bucket_id = 'generated-media')
  WITH CHECK (bucket_id = 'generated-media');
