import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AdminClient = SupabaseClient<Database>;

/** Copies a temporary provider URL into durable Loopster storage. */
export async function persistGeneratedAsset(
  supabaseAdmin: AdminClient,
  url: string | null | undefined,
  path: string,
  contentType: string,
) {
  if (!url) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) return null;
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > 300 * 1024 * 1024) return null;
    const body = await response.arrayBuffer();
    if (body.byteLength > 300 * 1024 * 1024) return null;
    const { error } = await supabaseAdmin.storage.from("generated-media").upload(path, body, {
      contentType,
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) return null;
    return supabaseAdmin.storage.from("generated-media").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}
