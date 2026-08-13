import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AdminClient = SupabaseClient<Database>;

/** Copies a temporary provider URL into durable Loopster storage when possible. */
export async function persistGeneratedAsset(
  supabaseAdmin: AdminClient,
  url: string | null | undefined,
  path: string,
  contentType: string,
) {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    const body = await response.arrayBuffer();
    const { error } = await supabaseAdmin.storage.from("generated-media").upload(path, body, {
      contentType,
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) return url;
    return supabaseAdmin.storage.from("generated-media").getPublicUrl(path).data.publicUrl;
  } catch {
    return url;
  }
}
