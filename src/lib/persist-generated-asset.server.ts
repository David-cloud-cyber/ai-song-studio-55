import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AdminClient = SupabaseClient<Database>;

const PRIVATE_BUCKET = "generated-media-private";
const PUBLIC_BUCKET = "public-generated-media";

/** Copies a temporary provider URL into private, durable Loopster storage. */
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
    const { error } = await supabaseAdmin.storage.from(PRIVATE_BUCKET).upload(path, body, {
      contentType,
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) return null;
    return path;
  } catch {
    return null;
  }
}

function storagePath(value: string) {
  if (!value.startsWith("http")) return value;
  try {
    const pathname = decodeURIComponent(new URL(value).pathname);
    const marker = `/storage/v1/object/`;
    const index = pathname.indexOf(marker);
    if (index < 0) return null;
    const rest = pathname.slice(index + marker.length);
    const parts = rest.split("/");
    if (parts.length < 3) return null;
    return parts.slice(2).join("/");
  } catch {
    return null;
  }
}

export async function getGeneratedAssetUrl(
  supabaseAdmin: AdminClient,
  value: string | null | undefined,
  expiresIn = 3600,
) {
  if (!value) return null;
  if (
    value.startsWith("http") &&
    !value.includes("/storage/v1/object/public/generated-media-private/")
  ) {
    return value;
  }
  const marker = "/storage/v1/object/public/generated-media-private/";
  const path = value.includes(marker) ? decodeURIComponent(value.split(marker)[1] ?? "") : value;
  const { data, error } = await supabaseAdmin.storage
    .from(PRIVATE_BUCKET)
    .createSignedUrl(path, expiresIn);
  return error ? null : data.signedUrl;
}

async function sourceBody(supabaseAdmin: AdminClient, value: string) {
  const path = storagePath(value);
  if (path) {
    const downloaded = await supabaseAdmin.storage.from(PRIVATE_BUCKET).download(path);
    if (!downloaded.error && downloaded.data)
      return { path, body: await downloaded.data.arrayBuffer() };
  }

  const response = await fetch(value);
  if (!response.ok) return null;
  return { path: null, body: await response.arrayBuffer() };
}

/** Creates a public copy only after the owner publishes the project. */
export async function publishGeneratedAsset(
  supabaseAdmin: AdminClient,
  value: string | null | undefined,
  contentType: string,
) {
  if (!value) return null;
  if (value.includes(`/storage/v1/object/public/${PUBLIC_BUCKET}/`)) return value;

  try {
    const source = await sourceBody(supabaseAdmin, value);
    if (!source) return null;
    const publicPath = source.path ?? `published/${crypto.randomUUID()}`;
    const { error } = await supabaseAdmin.storage
      .from(PUBLIC_BUCKET)
      .upload(publicPath, source.body, {
        contentType,
        cacheControl: "31536000",
        upsert: true,
      });
    if (error) return null;
    return supabaseAdmin.storage.from(PUBLIC_BUCKET).getPublicUrl(publicPath).data.publicUrl;
  } catch {
    return null;
  }
}

export async function removePublishedAsset(
  supabaseAdmin: AdminClient,
  value: string | null | undefined,
) {
  if (!value) return;
  const path = storagePath(value);
  if (path) await supabaseAdmin.storage.from(PUBLIC_BUCKET).remove([path]);
}
