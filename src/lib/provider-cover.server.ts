import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getTaskInfo } from "@/lib/suno.server";
import { persistGeneratedAsset, publishGeneratedAsset } from "@/lib/persist-generated-asset.server";

type AdminClient = SupabaseClient<Database>;

const PRIVATE_BUCKET = "generated-media-private";
const COVER_CONTENT_TYPE = "image/jpeg";

export type ProviderCoverProject = {
  id: string;
  user_id: string;
  title: string | null;
  status: string;
  archived_at: string | null;
  image_path: string | null;
  image_url: string | null;
  cover_url: string | null;
  cover_source: string;
  provider_cover_status: string;
  provider_cover_attempts: number;
  suno_task_id: string | null;
  is_public: boolean;
  publication_status: string;
  public_image_url: string | null;
};

export type ProviderCoverSyncResult = {
  projectId: string;
  status: "synced" | "already_synced" | "pending" | "unavailable" | "failed";
  reason?: string;
  publicRefreshed?: boolean;
};

function isHttpUrl(value: string | null | undefined): value is string {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function isProcessingStatus(value: string | null | undefined) {
  return Boolean(value && /PENDING|PROCESS|GENERAT|RUN|QUEUE|SUBMIT/i.test(value));
}

function isFailedStatus(value: string | null | undefined) {
  return Boolean(value && /FAIL|ERROR|CANCEL|EXPIRED|SENSITIVE/i.test(value));
}

function sourceName(value: string) {
  return value === "ai" || value === "provider" ? value : "default";
}

type ProviderCoverMetadata = {
  provider_cover_status?: string;
  provider_cover_attempts?: number;
  provider_cover_last_attempt_at?: string | null;
  provider_cover_error?: string | null;
};

/**
 * The provider-cover migration may briefly lag behind a Worker deployment.
 * Only schema-availability errors are tolerated; operational errors still fail loudly.
 */
export function isProviderCoverSchemaUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string; details?: string };
  const code = candidate.code ?? "";
  const message = `${candidate.message ?? ""} ${candidate.details ?? ""}`.toLowerCase();
  return (
    ["42P01", "42703", "PGRST204", "PGRST205"].includes(code) ||
    message.includes("schema cache") ||
    message.includes("project_cover_versions") ||
    message.includes("provider_cover_")
  );
}

export async function updateProviderCoverMetadata(
  supabaseAdmin: AdminClient,
  projectId: string,
  metadata: ProviderCoverMetadata,
) {
  const { error } = await supabaseAdmin.from("projects").update(metadata).eq("id", projectId);
  if (!error) return true;
  if (isProviderCoverSchemaUnavailable(error)) return false;
  throw error;
}

export async function registerActiveCoverVersion(
  supabaseAdmin: AdminClient,
  projectId: string,
  storagePath: string,
  source: string,
) {
  const { error: deactivateError } = await supabaseAdmin
    .from("project_cover_versions")
    .update({ is_active: false })
    .eq("project_id", projectId);
  if (deactivateError) {
    if (isProviderCoverSchemaUnavailable(deactivateError)) return false;
    throw deactivateError;
  }
  const { error } = await supabaseAdmin.from("project_cover_versions").upsert(
    {
      project_id: projectId,
      storage_path: storagePath,
      source: sourceName(source),
      is_active: true,
    },
    { onConflict: "project_id,storage_path" },
  );
  if (error) {
    if (isProviderCoverSchemaUnavailable(error)) return false;
    throw error;
  }
  return true;
}

async function archiveCurrentCover(supabaseAdmin: AdminClient, project: ProviderCoverProject) {
  if (!project.image_path) return;

  const { data, error } = await supabaseAdmin.storage
    .from(PRIVATE_BUCKET)
    .download(project.image_path);
  if (error || !data) return;

  const historyPath = `${project.user_id}/${project.id}/cover-history/${Date.now()}-${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(PRIVATE_BUCKET)
    .upload(historyPath, await data.arrayBuffer(), {
      contentType: project.image_path.toLowerCase().endsWith(".svg")
        ? "image/svg+xml"
        : COVER_CONTENT_TYPE,
      cacheControl: "31536000",
      upsert: false,
    });
  if (uploadError) return;

  await supabaseAdmin.from("project_cover_versions").insert({
    project_id: project.id,
    storage_path: historyPath,
    source: sourceName(project.cover_source),
    is_active: false,
  });
}

async function markCoverStatus(
  supabaseAdmin: AdminClient,
  project: ProviderCoverProject,
  status: string,
  reason: string | null,
  attempts = project.provider_cover_attempts,
) {
  return updateProviderCoverMetadata(supabaseAdmin, project.id, {
    provider_cover_status: status,
    provider_cover_attempts: attempts,
    provider_cover_last_attempt_at: new Date().toISOString(),
    provider_cover_error: reason,
  });
}

async function findProviderImage(project: ProviderCoverProject) {
  const directImage = [project.image_url, project.cover_url].find(isHttpUrl);
  if (directImage) return { imageUrl: directImage, state: "found" as const };

  if (!project.suno_task_id) {
    return {
      imageUrl: null,
      state: "unavailable" as const,
      reason: "Aucune référence fournisseur.",
    };
  }

  try {
    const task = await getTaskInfo(project.suno_task_id);
    const imageUrl = task.response?.sunoData
      ?.map((clip) => clip.imageUrl ?? clip.image_url ?? null)
      .find(isHttpUrl);
    if (imageUrl) return { imageUrl, state: "found" as const };
    if (isProcessingStatus(task.status)) return { imageUrl: null, state: "pending" as const };
    if (isFailedStatus(task.status)) {
      return {
        imageUrl: null,
        state: "unavailable" as const,
        reason: "Image fournisseur indisponible.",
      };
    }
    return {
      imageUrl: null,
      state: "unavailable" as const,
      reason: "Le fournisseur n’a pas retourné de pochette.",
    };
  } catch (error) {
    return {
      imageUrl: null,
      state: "failed" as const,
      reason: error instanceof Error ? error.message : "La récupération de la pochette a échoué.",
    };
  }
}

async function refreshPublicCover(
  supabaseAdmin: AdminClient,
  project: ProviderCoverProject,
  path: string,
) {
  if (!project.is_public || project.publication_status !== "published") return false;
  const publicImageUrl = await publishGeneratedAsset(supabaseAdmin, path, COVER_CONTENT_TYPE);
  if (!publicImageUrl) return false;

  const { error } = await supabaseAdmin
    .from("projects")
    .update({ public_image_url: publicImageUrl })
    .eq("id", project.id);
  return !error;
}

/**
 * Replaces a project's active cover with the provider image when available.
 * This function never calls a generation endpoint and never touches credits.
 */
export async function syncProviderCoverForProject(
  supabaseAdmin: AdminClient,
  project: ProviderCoverProject,
): Promise<ProviderCoverSyncResult> {
  if (
    project.provider_cover_status === "synced" &&
    project.cover_source === "provider" &&
    project.image_path
  ) {
    if (
      !project.is_public ||
      project.publication_status !== "published" ||
      project.public_image_url
    ) {
      return { projectId: project.id, status: "already_synced", publicRefreshed: false };
    }
    const publicRefreshed = await refreshPublicCover(supabaseAdmin, project, project.image_path);
    return { projectId: project.id, status: "already_synced", publicRefreshed };
  }

  if (project.status !== "ready") {
    await markCoverStatus(
      supabaseAdmin,
      project,
      "pending",
      "En attente de la fin de la création.",
    );
    return { projectId: project.id, status: "pending", reason: "Création non terminée." };
  }

  const attempts = project.provider_cover_attempts + 1;
  await markCoverStatus(supabaseAdmin, project, "pending", null, attempts);

  const provider = await findProviderImage(project);
  if (provider.state === "pending") {
    await markCoverStatus(
      supabaseAdmin,
      project,
      "pending",
      "La pochette fournisseur est encore en préparation.",
      attempts,
    );
    return { projectId: project.id, status: "pending", reason: "Pochette encore en préparation." };
  }
  if (provider.state === "unavailable") {
    await markCoverStatus(
      supabaseAdmin,
      project,
      "unavailable",
      provider.reason ?? "Pochette indisponible.",
      attempts,
    );
    return { projectId: project.id, status: "unavailable", reason: provider.reason };
  }
  if (provider.state === "failed" || !provider.imageUrl) {
    await markCoverStatus(
      supabaseAdmin,
      project,
      "failed",
      provider.reason ?? "Pochette indisponible.",
      attempts,
    );
    return { projectId: project.id, status: "failed", reason: provider.reason };
  }

  const canonicalPath = `${project.user_id}/${project.id}/cover.jpg`;
  try {
    await archiveCurrentCover(supabaseAdmin, project);
    const durablePath = await persistGeneratedAsset(
      supabaseAdmin,
      provider.imageUrl,
      canonicalPath,
      COVER_CONTENT_TYPE,
    );
    if (!durablePath) throw new Error("La pochette fournisseur n’a pas pu être conservée.");

    await registerActiveCoverVersion(supabaseAdmin, project.id, durablePath, "provider");

    const { error: updateError } = await supabaseAdmin
      .from("projects")
      .update({
        image_path: durablePath,
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
      provider_cover_attempts: attempts,
      provider_cover_last_attempt_at: new Date().toISOString(),
      provider_cover_error: null,
    });

    const publicRefreshed = await refreshPublicCover(supabaseAdmin, project, durablePath);
    return { projectId: project.id, status: "synced", publicRefreshed };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "La synchronisation de la pochette a échoué.";
    await markCoverStatus(supabaseAdmin, project, "failed", reason, attempts);
    return { projectId: project.id, status: "failed", reason };
  }
}
