import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { persistGeneratedAsset } from "@/lib/persist-generated-asset.server";
import { updateProviderCoverMetadata } from "@/lib/provider-cover.server";

type AdminClient = SupabaseClient<Database>;

type CoverProject = {
  id: string;
  user_id: string;
  title: string | null;
  genre?: string | null;
  cover_gradient?: string | null;
  image_path?: string | null;
  image_url?: string | null;
  cover_url?: string | null;
  provider_cover_status?: string | null;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

/** Creates a small, deterministic Loopster cover without a provider call. */
export function createDefaultCoverSvg(project: Pick<CoverProject, "title" | "genre">) {
  const title = escapeXml((project.title ?? "Nouveau morceau").slice(0, 48));
  const genre = escapeXml((project.genre ?? "Loopster studio").slice(0, 32));
  const seed = hash(`${project.title ?? ""}:${project.genre ?? ""}`);
  const hue = seed % 360;
  const secondHue = (hue + 68) % 360;
  const bars = Array.from({ length: 18 }, (_, index) => {
    const height = 22 + ((seed + index * 29) % 66);
    const x = 72 + index * 32;
    return `<rect x="${x}" y="${190 - height / 2}" width="12" height="${height}" rx="6" fill="white" opacity="${0.28 + (index % 4) * 0.1}"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720" role="img" aria-label="Pochette Loopster">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 78% 58%)"/>
      <stop offset="0.52" stop-color="hsl(${secondHue} 72% 48%)"/>
      <stop offset="1" stop-color="#090c10"/>
    </linearGradient>
    <radialGradient id="glow" cx="25%" cy="18%" r="78%">
      <stop offset="0" stop-color="#75e6ff" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#75e6ff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="720" height="720" rx="44" fill="url(#bg)"/>
  <rect width="720" height="720" rx="44" fill="url(#glow)"/>
  <g transform="translate(0 188)">${bars}</g>
  <text x="56" y="570" fill="white" font-family="Arial, sans-serif" font-size="34" font-weight="700">${title}</text>
  <text x="58" y="610" fill="white" opacity="0.72" font-family="Arial, sans-serif" font-size="18" letter-spacing="3">${genre.toUpperCase()}</text>
  <text x="58" y="660" fill="white" opacity="0.58" font-family="Arial, sans-serif" font-size="15" letter-spacing="4">LOOPSTER</text>
</svg>`;
}

/** Ensures that every project has a durable private cover asset. */
export async function ensureProjectCover(supabaseAdmin: AdminClient, project: CoverProject) {
  if (project.image_path) return { path: project.image_path, source: "existing" as const };

  const providerImage = project.image_url ?? project.cover_url;
  if (providerImage) {
    const path = await persistGeneratedAsset(
      supabaseAdmin,
      providerImage,
      `${project.user_id}/${project.id}/cover.jpg`,
      "image/jpeg",
    );
    if (path) {
      const { error: updateError } = await supabaseAdmin
        .from("projects")
        .update({
          image_path: path,
          image_url: null,
          cover_url: null,
          cover_source: "provider",
          cover_generation_status: "ready",
          cover_error: null,
        })
        .eq("id", project.id);
      if (updateError) throw updateError;
      await updateProviderCoverMetadata(supabaseAdmin, project.id, {
        provider_cover_status: "synced",
        provider_cover_error: null,
      });
      return { path, source: "provider" as const };
    }
  }

  const path = `${project.user_id}/${project.id}/cover-default.svg`;
  const svg = createDefaultCoverSvg(project);
  const { error } = await supabaseAdmin.storage
    .from("generated-media-private")
    .upload(path, new TextEncoder().encode(svg), {
      contentType: "image/svg+xml",
      cacheControl: "31536000",
      upsert: true,
    });
  if (error) throw error;

  const { error: updateError } = await supabaseAdmin
    .from("projects")
    .update({
      image_path: path,
      image_url: null,
      cover_url: null,
      cover_source: "default",
      cover_generation_status: "ready",
      cover_error: null,
    })
    .eq("id", project.id);
  if (updateError) throw updateError;
  await updateProviderCoverMetadata(supabaseAdmin, project.id, {
    provider_cover_status: "pending",
    provider_cover_error: null,
  });
  return { path, source: "default" as const };
}
