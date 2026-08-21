import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sunoKey = process.env.SUNOAPI_ORG_KEY;

if (!supabaseUrl || !serviceRoleKey || !sunoKey) {
  throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et SUNOAPI_ORG_KEY sont requis.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const privateBucket = "generated-media-private";
const publicBucket = "public-generated-media";

async function getProviderImage(taskId) {
  const response = await fetch(
    `https://api.sunoapi.org/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
    { headers: { Authorization: `Bearer ${sunoKey}`, Accept: "application/json" } },
  );
  if (!response.ok) throw new Error(`Service musical indisponible (${response.status}).`);
  const payload = await response.json();
  if (payload.code !== undefined && payload.code !== 200) {
    throw new Error(payload.msg ?? "Pochette fournisseur indisponible.");
  }
  return payload.data?.response?.sunoData
    ?.map((clip) => clip.imageUrl ?? clip.image_url ?? null)
    .find((value) => typeof value === "string" && value.startsWith("http"));
}

async function updateStatus(projectId, status, attempts, error = null) {
  await supabase
    .from("projects")
    .update({
      provider_cover_status: status,
      provider_cover_attempts: attempts,
      provider_cover_last_attempt_at: new Date().toISOString(),
      provider_cover_error: error,
    })
    .eq("id", projectId);
}

const { data: projects, error: projectsError } = await supabase
  .from("projects")
  .select(
    "id,user_id,suno_task_id,image_path,cover_source,is_public,publication_status,provider_cover_attempts",
  )
  .eq("status", "ready")
  .not("suno_task_id", "is", null)
  .in("provider_cover_status", ["pending", "failed"])
  .order("created_at", { ascending: true });

if (projectsError) throw projectsError;

const report = { scanned: projects?.length ?? 0, synced: 0, unavailable: 0, failed: 0 };

for (const project of projects ?? []) {
  const attempts = (project.provider_cover_attempts ?? 0) + 1;
  try {
    const imageUrl = await getProviderImage(project.suno_task_id);
    if (!imageUrl) {
      report.unavailable += 1;
      await supabase
        .from("projects")
        .update({
          provider_cover_status: "unavailable",
          provider_cover_attempts: attempts,
          provider_cover_last_attempt_at: new Date().toISOString(),
          provider_cover_error: "Le fournisseur n’a pas retourné de pochette.",
        })
        .eq("id", project.id);
      continue;
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error(`Image indisponible (${imageResponse.status}).`);
    const imageBody = await imageResponse.arrayBuffer();
    if (!imageBody.byteLength) throw new Error("Image vide.");

    const storagePath = `${project.user_id}/${project.id}/cover.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(privateBucket)
      .upload(storagePath, imageBody, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: true,
      });
    if (uploadError) throw uploadError;

    await supabase
      .from("project_cover_versions")
      .update({ is_active: false })
      .eq("project_id", project.id);
    if (project.image_path && project.image_path !== storagePath) {
      await supabase.from("project_cover_versions").upsert(
        {
          project_id: project.id,
          storage_path: project.image_path,
          source: ["default", "provider", "ai"].includes(project.cover_source)
            ? project.cover_source
            : "default",
          is_active: false,
        },
        { onConflict: "project_id,storage_path" },
      );
    }
    const { error: versionError } = await supabase.from("project_cover_versions").upsert(
      {
        project_id: project.id,
        storage_path: storagePath,
        source: "provider",
        is_active: true,
      },
      { onConflict: "project_id,storage_path" },
    );
    if (versionError) throw versionError;

    let publicImageUrl = null;
    if (project.is_public && project.publication_status === "published") {
      const { error: publicUploadError } = await supabase.storage
        .from(publicBucket)
        .upload(storagePath, imageBody, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: true,
        });
      if (publicUploadError) throw publicUploadError;
      publicImageUrl = supabase.storage.from(publicBucket).getPublicUrl(storagePath).data.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        image_path: storagePath,
        image_url: null,
        cover_url: null,
        cover_source: "provider",
        cover_generation_status: "ready",
        cover_error: null,
        provider_cover_status: "synced",
        provider_cover_attempts: attempts,
        provider_cover_last_attempt_at: new Date().toISOString(),
        provider_cover_error: null,
        ...(publicImageUrl ? { public_image_url: publicImageUrl } : {}),
      })
      .eq("id", project.id);
    if (updateError) throw updateError;
    report.synced += 1;
  } catch (error) {
    report.failed += 1;
    await updateStatus(
      project.id,
      "failed",
      attempts,
      error instanceof Error ? error.message : "Synchronisation impossible.",
    );
  }
}

console.log(JSON.stringify(report));
