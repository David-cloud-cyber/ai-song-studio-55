import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { publishGeneratedAsset, removePublishedAsset } from "@/lib/persist-generated-asset.server";

type AdminClient = SupabaseClient<Database>;

const MAX_PUBLICATION_ATTEMPTS = 3;

const projectFields =
  "id,user_id,status,archived_at,audio_url,audio_path,image_url,image_path,cover_url,wav_url,wav_path,video_url,video_path,is_public,published_at,public_audio_url,public_image_url,public_wav_url,public_video_url,publication_status,publication_policy,publication_error,publication_attempts";

type PublicationProject = {
  id: string;
  user_id: string;
  status: string;
  archived_at: string | null;
  audio_url: string | null;
  audio_path: string | null;
  image_url: string | null;
  image_path: string | null;
  cover_url: string | null;
  wav_url: string | null;
  wav_path: string | null;
  video_url: string | null;
  video_path: string | null;
  is_public: boolean;
  published_at: string | null;
  public_audio_url: string | null;
  public_image_url: string | null;
  public_wav_url: string | null;
  public_video_url: string | null;
  publication_status: string;
  publication_policy: "automatic_free" | "manual_paid";
  publication_error: string | null;
  publication_attempts: number;
};

export type PublicationResult =
  | { status: "published"; projectId: string }
  | { status: "already_published"; projectId: string }
  | { status: "skipped"; projectId: string; reason: string }
  | { status: "retry_pending" | "failed"; projectId: string; reason: string };

function asProject(value: unknown) {
  return value as PublicationProject;
}

async function recordFailure(
  supabaseAdmin: AdminClient,
  project: PublicationProject,
  reason: string,
  attempts: number,
): Promise<PublicationResult> {
  const status = attempts >= MAX_PUBLICATION_ATTEMPTS ? "failed" : "retry_pending";
  await supabaseAdmin
    .from("projects")
    .update({
      publication_status: status,
      publication_error: reason,
      publication_attempts: attempts,
      publication_last_attempt_at: new Date().toISOString(),
      is_public: false,
      published_at: null,
      public_audio_url: null,
      public_image_url: null,
      public_wav_url: null,
      public_video_url: null,
    })
    .eq("id", project.id);
  return { status, projectId: project.id, reason };
}

export async function publishProjectAssets(
  supabaseAdmin: AdminClient,
  projectId: string,
): Promise<PublicationResult> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(projectFields)
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Projet introuvable.");

  const project = asProject(data);
  if (project.is_public && project.public_audio_url && project.publication_status === "published") {
    return { status: "already_published", projectId: project.id };
  }
  if (project.archived_at) {
    return { status: "skipped", projectId: project.id, reason: "Projet archivé." };
  }
  if (project.status !== "ready") {
    return { status: "skipped", projectId: project.id, reason: "Projet non terminé." };
  }

  const sourceAudio = project.audio_path ?? project.audio_url;
  if (!sourceAudio) {
    return { status: "skipped", projectId: project.id, reason: "Audio introuvable." };
  }

  const attempts = project.publication_attempts + 1;
  await supabaseAdmin
    .from("projects")
    .update({
      publication_status: "pending",
      publication_error: null,
      publication_attempts: attempts,
      publication_last_attempt_at: new Date().toISOString(),
      is_public: false,
      published_at: null,
    })
    .eq("id", project.id);

  try {
    const audioUrl = await publishGeneratedAsset(supabaseAdmin, sourceAudio, "audio/mpeg");
    if (!audioUrl)
      return recordFailure(
        supabaseAdmin,
        project,
        "Le fichier audio ne peut pas être publié.",
        attempts,
      );

    const [imageUrl, wavUrl, videoUrl] = await Promise.all([
      publishGeneratedAsset(
        supabaseAdmin,
        project.image_path ?? project.image_url ?? project.cover_url,
        "image/jpeg",
      ),
      publishGeneratedAsset(supabaseAdmin, project.wav_path ?? project.wav_url, "audio/wav"),
      publishGeneratedAsset(supabaseAdmin, project.video_path ?? project.video_url, "video/mp4"),
    ]);

    const { error: updateError } = await supabaseAdmin
      .from("projects")
      .update({
        is_public: true,
        published_at: project.published_at ?? new Date().toISOString(),
        public_audio_url: audioUrl,
        public_image_url: imageUrl ?? project.public_image_url,
        public_wav_url: wavUrl ?? project.public_wav_url,
        public_video_url: videoUrl ?? project.public_video_url,
        publication_status: "published",
        publication_error: null,
        publication_attempts: attempts,
        publication_last_attempt_at: new Date().toISOString(),
      })
      .eq("id", project.id);
    if (updateError) throw updateError;

    return { status: "published", projectId: project.id };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "La publication est temporairement indisponible.";
    return recordFailure(supabaseAdmin, project, reason, attempts);
  }
}

export async function unpublishProjectAssets(supabaseAdmin: AdminClient, projectId: string) {
  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .select("id,public_audio_url,public_image_url,public_wav_url,public_video_url")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!project) throw new Error("Projet introuvable.");

  await Promise.all(
    [
      project.public_audio_url,
      project.public_image_url,
      project.public_wav_url,
      project.public_video_url,
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => removePublishedAsset(supabaseAdmin, value)),
  );

  const { error: updateError } = await supabaseAdmin
    .from("projects")
    .update({
      is_public: false,
      published_at: null,
      public_audio_url: null,
      public_image_url: null,
      public_wav_url: null,
      public_video_url: null,
      publication_status: "not_required",
      publication_error: null,
      publication_attempts: 0,
      publication_last_attempt_at: null,
    })
    .eq("id", projectId);
  if (updateError) throw updateError;
}

export async function autoPublishFreeProject(supabaseAdmin: AdminClient, projectId: string) {
  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .select("id,user_id,publication_policy")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!project) throw new Error("Projet introuvable.");

  if (project.publication_policy !== "automatic_free") {
    return { status: "skipped" as const, projectId, reason: "Publication privée par défaut." };
  }

  return publishProjectAssets(supabaseAdmin, projectId);
}

export async function retryFreePublicationsForUser(supabaseAdmin: AdminClient, userId: string) {
  const { data: projects, error } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "ready")
    .eq("publication_policy", "automatic_free")
    .eq("publication_status", "retry_pending")
    .order("publication_last_attempt_at", { ascending: true, nullsFirst: true })
    .limit(5);
  if (error) throw error;

  const results = [];
  for (const project of projects ?? []) {
    results.push(await autoPublishFreeProject(supabaseAdmin, project.id));
  }
  return results;
}
