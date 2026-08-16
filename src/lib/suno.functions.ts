import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { isPaidPlan, type PlanProfile } from "@/lib/plans";
import { LOOPSTER_COSTS, PROVIDER_COST_BY_JOB_KIND, sunoCostUsd } from "@/lib/generation-costs";

export const COSTS = LOOPSTER_COSTS;

const MODELS = ["V3_5", "V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5", "V5_5"] as const;

function callbackUrl(kind: string) {
  const request = getRequest();
  const origin = new URL(request.url).origin;
  const secret = process.env.SUNO_CALLBACK_SECRET;
  if (!secret) throw new Error("Le traitement musical est temporairement indisponible.");
  return `${origin}/api/public/suno-callback?kind=${kind}&token=${encodeURIComponent(secret)}`;
}

type AuthedClient = SupabaseClient<Database>;
type GenerationJobUpdate = Database["public"]["Tables"]["generation_jobs"]["Update"];

/**
 * Generation jobs are server-owned accounting records. Updates must use the
 * service client because the browser-facing role is intentionally read/insert
 * only and must never be allowed to alter spend or provider state.
 */
async function updateGenerationJob(jobId: string, patch: GenerationJobUpdate) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("generation_jobs").update(patch).eq("id", jobId);
  if (error) throw error;
}

async function spend(
  supabase: AuthedClient,
  amount: number,
  reason: string,
  projectId: string,
  providerKind: string,
) {
  const { error } = await supabase.rpc("deduct_credits", {
    _amount: amount,
    _reason: reason,
    _project_id: projectId,
  });
  if (error) throw new Error(error.message ?? "Crédits insuffisants");
  const providerCredits = PROVIDER_COST_BY_JOB_KIND[providerKind] ?? 0;
  return { providerCredits, providerCostUsd: sunoCostUsd(providerCredits) };
}

type GenerationJobState = {
  id: string;
  project_id: string | null;
  suno_task_id: string | null;
  credits_spent: number;
  status: string;
};

async function claimGenerationJob(
  supabase: AuthedClient,
  userId: string,
  projectId: string,
  kind: string,
  idempotencyKey: string,
  providerCredits: number,
  payload: Json,
) {
  const { data, error } = await supabase
    .from("generation_jobs")
    .insert({
      user_id: userId,
      project_id: projectId,
      kind,
      status: "pending",
      idempotency_key: idempotencyKey,
      provider_credits_spent: providerCredits,
      provider_cost_usd: sunoCostUsd(providerCredits),
      payload,
    })
    .select("id,project_id,suno_task_id,credits_spent,status")
    .single();

  if (!error && data) return { job: data as GenerationJobState, existing: false };

  if (error?.code === "23505") {
    const { data: existing, error: existingError } = await supabase
      .from("generation_jobs")
      .select("id,project_id,suno_task_id,credits_spent,status")
      .eq("user_id", userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (!existingError && existing) {
      return { job: existing as GenerationJobState, existing: true };
    }
  }

  throw error ?? new Error("Impossible de réserver cette opération.");
}

async function refundGeneration(
  supabase: AuthedClient,
  userId: string,
  amount: number,
  projectId: string,
  jobId: string,
  reason: string,
) {
  if (amount <= 0) return;
  const { error } = await supabase.rpc("refund_credits", {
    _user_id: userId,
    _amount: amount,
    _reason: reason,
    _project_id: projectId,
  });
  if (error) throw error;
  await updateGenerationJob(jobId, {
    credits_refunded: amount,
    refunded_at: new Date().toISOString(),
  });
}

async function refundJobIfNeeded(
  supabaseAdmin: AuthedClient,
  taskId: string,
  projectId: string,
  reason: string,
) {
  const { data: job, error } = await supabaseAdmin
    .from("generation_jobs")
    .select("id,user_id,project_id,credits_spent,credits_refunded")
    .eq("suno_task_id", taskId)
    .maybeSingle();
  if (error) throw error;
  if (!job || job.credits_spent <= 0 || job.credits_refunded > 0) return;
  await refundGeneration(
    supabaseAdmin,
    job.user_id,
    job.credits_spent,
    job.project_id ?? projectId,
    job.id,
    reason,
  );
}

async function failProviderJob(
  supabaseAdmin: AuthedClient,
  taskId: string,
  projectId: string,
  message: string,
) {
  await refundJobIfNeeded(supabaseAdmin, taskId, projectId, `Remboursement · ${message}`);
  const { error } = await supabaseAdmin
    .from("generation_jobs")
    .update({ status: "failed", error_message: message })
    .eq("suno_task_id", taskId);
  if (error) throw error;
}

async function completeProviderJob(supabaseAdmin: AuthedClient, taskId: string, result: Json) {
  const { error } = await supabaseAdmin
    .from("generation_jobs")
    .update({ status: "completed", result })
    .eq("suno_task_id", taskId);
  if (error) throw error;
}

async function markGenerationFailed(
  supabase: AuthedClient,
  jobId: string,
  projectId: string,
  message: string,
) {
  await Promise.all([
    updateGenerationJob(jobId, { status: "failed", error_message: message }),
    supabase
      .from("projects")
      .update({ status: "draft", progress: 0, error_message: message })
      .eq("id", projectId),
  ]);
}

/** Lance une génération de chanson ou d'instrumentale. */
async function assertCredits(supabase: AuthedClient, userId: string, amount: number) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (profile) {
    const paid = isPaidPlan(profile as PlanProfile);
    const resetAt = (profile as { daily_credits_reset_at?: string | null }).daily_credits_reset_at;
    const today = new Date().toISOString().slice(0, 10);
    if (!paid && resetAt && resetAt < today) {
      await supabase
        .from("profiles")
        .update({ credits: 80, daily_credits_used: 0, daily_credits_reset_at: today })
        .eq("id", userId);
      profile.credits = 80;
    } else if (!paid && profile.credits > 80) {
      await supabase.from("profiles").update({ credits: 80 }).eq("id", userId);
      profile.credits = 80;
    }
  }
  if (!profile || profile.credits < amount) {
    throw new Error(`Crédits insuffisants : ${amount} crédits requis.`);
  }
}

async function assertPaidPlan(supabase: AuthedClient, userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan,subscription_status,subscription_expires_at")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile) {
    throw new Error("Les téléchargements sont réservés aux abonnés Loopster ✨");
  }
  if (!isPaidPlan(profile)) {
    throw new Error("Les téléchargements sont réservés aux abonnés Loopster ✨");
  }
}

export const generateTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(120),
        prompt: z.string().trim().min(3).max(4000),
        style: z.string().trim().max(200).optional(),
        genre: z.string().trim().max(100).optional(),
        mood: z.string().trim().max(100).optional(),
        voice: z.string().trim().max(100).optional(),
        instrumental: z.boolean().default(false),
        customMode: z.boolean().default(true),
        model: z.enum(MODELS).default("V4_5"),
        negativeTags: z.string().trim().max(200).optional(),
        durationSeconds: z.number().int().min(30).max(480).optional(),
        coverGradient: z.string().max(200).optional(),
        parentProjectId: z.string().uuid().optional(),
        requestId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const cost = data.instrumental ? COSTS.instrumental : COSTS.song;
    const idempotencyKey = data.requestId ?? crypto.randomUUID();

    await assertCredits(supabase, userId, cost);

    const style = data.style || [data.genre, data.mood, data.voice].filter(Boolean).join(", ");

    const { data: project, error: insertError } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        title: data.title,
        prompt: data.prompt,
        genre: data.genre ?? null,
        mood: data.mood ?? null,
        voice: data.instrumental ? null : (data.voice ?? null),
        duration_seconds: data.durationSeconds ?? null,
        status: "rendering",
        progress: 5,
        instrumental: data.instrumental,
        model: data.model,
        style,
        cover_gradient: data.coverGradient ?? null,
        parent_project_id: data.parentProjectId ?? null,
        tags: [data.genre, data.mood].filter(Boolean) as string[],
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    const providerKind = data.instrumental ? "instrumental" : "song";
    const providerCredits = PROVIDER_COST_BY_JOB_KIND[providerKind] ?? 0;
    const claim = await claimGenerationJob(
      supabase,
      userId,
      project.id,
      providerKind,
      idempotencyKey,
      providerCredits,
      { prompt: data.prompt, style, model: data.model },
    );
    if (claim.existing) {
      await supabase.from("projects").delete().eq("id", project.id);
      return {
        projectId: claim.job.project_id ?? project.id,
        taskId: claim.job.suno_task_id ?? "",
        creditsSpent: claim.job.credits_spent,
      };
    }

    let reservedCredits = 0;
    try {
      const accounting = await spend(
        supabase,
        cost,
        `Génération · ${data.title}`,
        project.id,
        providerKind,
      );
      reservedCredits = cost;
      await updateGenerationJob(claim.job.id, {
        credits_spent: cost,
        provider_credits_spent: accounting.providerCredits,
        provider_cost_usd: accounting.providerCostUsd,
      });

      const { createSong } = await import("./suno.server");
      let taskId: string;
      try {
        const result = await createSong({
          prompt: data.prompt,
          style: data.customMode ? style || undefined : undefined,
          title: data.customMode ? data.title : undefined,
          customMode: data.customMode,
          instrumental: data.instrumental,
          model: data.model,
          negativeTags: data.negativeTags,
          callBackUrl: callbackUrl("music"),
        });
        taskId = result.taskId;
      } catch (providerError) {
        const message =
          providerError instanceof Error ? providerError.message : "Génération impossible";
        await refundGeneration(
          supabase,
          userId,
          reservedCredits,
          project.id,
          claim.job.id,
          `Remboursement · ${message}`,
        );
        await markGenerationFailed(supabase, claim.job.id, project.id, message);
        throw providerError;
      }

      await supabase.from("projects").update({ suno_task_id: taskId }).eq("id", project.id);
      await updateGenerationJob(claim.job.id, { status: "processing", suno_task_id: taskId });

      return { projectId: project.id, taskId, creditsSpent: cost };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Génération impossible";
      await markGenerationFailed(supabase, claim.job.id, project.id, message);
      throw error;
    }
  });

/** Prolonge un morceau existant en créant un nouveau projet enfant. */
export const extendTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        continueAt: z.number().min(0).max(600).optional(),
        prompt: z.string().trim().max(4000).optional(),
        requestId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: parent, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!parent) throw new Error("Projet introuvable");
    if (!parent.suno_audio_id) throw new Error("Ce morceau n'a pas encore d'audio à prolonger.");

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .maybeSingle();
    if (!profile || profile.credits < COSTS.extend) {
      throw new Error(`Crédits insuffisants : ${COSTS.extend} crédits requis.`);
    }

    const title = `${parent.title} (extension)`;
    const idempotencyKey = data.requestId ?? crypto.randomUUID();
    const { data: child, error: insertError } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        title,
        prompt: data.prompt ?? parent.prompt,
        genre: parent.genre,
        mood: parent.mood,
        voice: parent.voice,
        status: "rendering",
        progress: 5,
        instrumental: parent.instrumental,
        model: parent.model,
        style: parent.style,
        cover_gradient: parent.cover_gradient,
        tags: parent.tags,
        parent_project_id: parent.id,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    const claim = await claimGenerationJob(
      supabase,
      userId,
      child.id,
      "extend",
      idempotencyKey,
      PROVIDER_COST_BY_JOB_KIND.extend,
      { parentId: parent.id, continueAt: data.continueAt ?? null, prompt: data.prompt ?? null },
    );
    if (claim.existing) {
      await supabase.from("projects").delete().eq("id", child.id);
      return { projectId: claim.job.project_id ?? child.id, taskId: claim.job.suno_task_id ?? "" };
    }

    let reservedCredits = 0;
    let taskId: string | null = null;

    try {
      const accounting = await spend(
        supabase,
        COSTS.extend,
        `Extension · ${parent.title}`,
        child.id,
        "extend",
      );
      reservedCredits = COSTS.extend;
      await updateGenerationJob(claim.job.id, {
        credits_spent: COSTS.extend,
        provider_credits_spent: accounting.providerCredits,
        provider_cost_usd: accounting.providerCostUsd,
      });

      const { extendSong } = await import("./suno.server");
      ({ taskId } = await extendSong({
        audioId: parent.suno_audio_id,
        defaultParamFlag: data.continueAt !== undefined,
        prompt: data.prompt ?? parent.prompt ?? undefined,
        style: parent.style ?? undefined,
        title,
        continueAt: data.continueAt,
        model: (parent.model as (typeof MODELS)[number]) ?? "V4_5",
        callBackUrl: callbackUrl("extend"),
      }));

      await supabase.from("projects").update({ suno_task_id: taskId }).eq("id", child.id);
      await updateGenerationJob(claim.job.id, { status: "processing", suno_task_id: taskId });

      return { projectId: child.id, taskId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extension impossible";
      if (reservedCredits > 0 && !taskId) {
        await refundGeneration(
          supabase,
          userId,
          reservedCredits,
          child.id,
          claim.job.id,
          `Remboursement · ${message}`,
        );
      }
      await markGenerationFailed(supabase, claim.job.id, child.id, message);
      throw err;
    }
  });

/** Sépare voix / instrumental d'un morceau généré. */
export const separateStems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ projectId: z.string().uuid(), requestId: z.string().uuid().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: project, error } = await supabase
      .from("projects")
      .select("id,title,suno_task_id,suno_audio_id,stems")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project?.suno_task_id || !project.suno_audio_id) {
      throw new Error("Ce morceau doit d'abord être généré pour extraire les pistes.");
    }

    await assertCredits(supabase, userId, COSTS.stems);
    const claim = await claimGenerationJob(
      supabase,
      userId,
      project.id,
      "stems",
      data.requestId ?? crypto.randomUUID(),
      PROVIDER_COST_BY_JOB_KIND.stems,
      { sourceTaskId: project.suno_task_id },
    );
    if (claim.existing) return { taskId: claim.job.suno_task_id ?? "" };
    let reservedCredits = 0;
    let taskId: string | null = null;
    try {
      const accounting = await spend(
        supabase,
        COSTS.stems,
        `Séparation pistes · ${project.title}`,
        project.id,
        "stems",
      );
      reservedCredits = COSTS.stems;
      await updateGenerationJob(claim.job.id, {
        credits_spent: COSTS.stems,
        provider_credits_spent: accounting.providerCredits,
        provider_cost_usd: accounting.providerCostUsd,
      });
      const { createStemSeparation } = await import("./suno.server");
      const result = await createStemSeparation({
        taskId: project.suno_task_id,
        audioId: project.suno_audio_id,
        type: "separate_vocal",
        callBackUrl: callbackUrl("stems"),
      });
      taskId = result.taskId;
      await supabase
        .from("projects")
        .update({ stems: { taskId, status: "processing" } })
        .eq("id", project.id);
      await updateGenerationJob(claim.job.id, { status: "processing", suno_task_id: taskId });
      return { taskId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Séparation des pistes impossible";
      if (reservedCredits > 0 && !taskId)
        await refundGeneration(
          supabase,
          userId,
          reservedCredits,
          project.id,
          claim.job.id,
          `Remboursement · ${message}`,
        );
      await markGenerationFailed(supabase, claim.job.id, project.id, message);
      throw err;
    }
  });

/** Ajoute des voix IA à l'audio d'un projet et crée une nouvelle version. */
export const addVocalsToProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        prompt: z.string().trim().min(3).max(4000),
        requestId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: parent, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!parent?.audio_url)
      throw new Error("Ce projet doit disposer d'un audio avant d'ajouter une voix.");
    await assertCredits(supabase, userId, COSTS.vocals);
    const idempotencyKey = data.requestId ?? crypto.randomUUID();

    const { data: child, error: insertError } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        title: `${parent.title} · voix IA`,
        prompt: data.prompt,
        genre: parent.genre,
        mood: parent.mood,
        voice: "Voix IA",
        status: "rendering",
        progress: 5,
        instrumental: false,
        model: parent.model ?? "V4_5PLUS",
        style: parent.style,
        cover_gradient: parent.cover_gradient,
        tags: parent.tags,
        parent_project_id: parent.id,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    const claim = await claimGenerationJob(
      supabase,
      userId,
      child.id,
      "vocals",
      idempotencyKey,
      PROVIDER_COST_BY_JOB_KIND.vocals,
      { parentId: parent.id, prompt: data.prompt },
    );
    if (claim.existing) {
      await supabase.from("projects").delete().eq("id", child.id);
      return { projectId: claim.job.project_id ?? child.id, taskId: claim.job.suno_task_id ?? "" };
    }

    let reservedCredits = 0;
    let taskId: string | null = null;
    try {
      const accounting = await spend(
        supabase,
        COSTS.vocals,
        `Voix IA · ${parent.title}`,
        child.id,
        "vocals",
      );
      reservedCredits = COSTS.vocals;
      await updateGenerationJob(claim.job.id, {
        credits_spent: COSTS.vocals,
        provider_credits_spent: accounting.providerCredits,
        provider_cost_usd: accounting.providerCostUsd,
      });

      const { addVocals } = await import("./suno.server");
      const result = await addVocals({
        prompt: data.prompt,
        title: `${parent.title} · voix IA`,
        uploadUrl: parent.audio_url,
        style: parent.style ?? undefined,
        model: (parent.model as (typeof MODELS)[number]) ?? "V4_5PLUS",
        callBackUrl: callbackUrl("music"),
      });
      taskId = result.taskId;
      await supabase.from("projects").update({ suno_task_id: taskId }).eq("id", child.id);
      await updateGenerationJob(claim.job.id, { status: "processing", suno_task_id: taskId });
      return { projectId: child.id, taskId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extension impossible";
      if (reservedCredits > 0 && !taskId) {
        await refundGeneration(
          supabase,
          userId,
          reservedCredits,
          child.id,
          claim.job.id,
          `Remboursement · ${message}`,
        );
      }
      await markGenerationFailed(supabase, claim.job.id, child.id, message);
      throw err;
    }
  });

/** Génère un morceau à partir d'un audio importé dans le bucket privé Supabase. */
export const generateUploadedTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(120),
        prompt: z.string().trim().min(3).max(4000),
        uploadUrl: z.string().url(),
        style: z.string().trim().max(200).optional(),
        genre: z.string().trim().max(100).optional(),
        mood: z.string().trim().max(100).optional(),
        instrumental: z.boolean().default(false),
        model: z.enum(MODELS).default("V4_5"),
        coverGradient: z.string().max(200).optional(),
        parentProjectId: z.string().uuid().optional(),
        requestId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const cost = data.instrumental ? COSTS.instrumental : COSTS.song;
    await assertCredits(supabase, userId, cost);

    const style = data.style || [data.genre, data.mood].filter(Boolean).join(", ");
    const { data: project, error: insertError } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        title: data.title,
        prompt: data.prompt,
        genre: data.genre ?? null,
        mood: data.mood ?? null,
        status: "rendering",
        progress: 5,
        instrumental: data.instrumental,
        model: data.model,
        style,
        cover_gradient: data.coverGradient ?? null,
        parent_project_id: data.parentProjectId ?? null,
        tags: [data.genre, data.mood].filter(Boolean) as string[],
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    const idempotencyKey = data.requestId ?? crypto.randomUUID();
    const providerKind = data.instrumental ? "instrumental" : "upload-cover";
    const claim = await claimGenerationJob(
      supabase,
      userId,
      project.id,
      providerKind,
      idempotencyKey,
      PROVIDER_COST_BY_JOB_KIND[providerKind],
      { prompt: data.prompt, style, model: data.model, uploadUrl: data.uploadUrl },
    );
    if (claim.existing) {
      await supabase.from("projects").delete().eq("id", project.id);
      return {
        projectId: claim.job.project_id ?? project.id,
        taskId: claim.job.suno_task_id ?? "",
      };
    }

    let reservedCredits = 0;
    let taskId: string | null = null;

    try {
      const accounting = await spend(
        supabase,
        cost,
        `Remix audio · ${data.title}`,
        project.id,
        providerKind,
      );
      reservedCredits = cost;
      await updateGenerationJob(claim.job.id, {
        credits_spent: cost,
        provider_credits_spent: accounting.providerCredits,
        provider_cost_usd: accounting.providerCostUsd,
      });

      const { uploadAndCover } = await import("./suno.server");
      const result = await uploadAndCover({
        uploadUrl: data.uploadUrl,
        prompt: data.prompt,
        style: style || undefined,
        title: data.title,
        customMode: true,
        instrumental: data.instrumental,
        model: data.model,
        callBackUrl: callbackUrl("music"),
      });
      taskId = result.taskId;
      await supabase.from("projects").update({ suno_task_id: taskId }).eq("id", project.id);
      await updateGenerationJob(claim.job.id, { status: "processing", suno_task_id: taskId });
      return { projectId: project.id, taskId, creditsSpent: cost };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Remix impossible";
      if (reservedCredits > 0 && !taskId) {
        await refundGeneration(
          supabase,
          userId,
          reservedCredits,
          project.id,
          claim.job.id,
          `Remboursement · ${message}`,
        );
      }
      await markGenerationFailed(supabase, claim.job.id, project.id, message);
      throw error;
    }
  });

/** Ajoute un accompagnement instrumental à l'audio d'un projet. */
export const addInstrumentalToProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ projectId: z.string().uuid(), requestId: z.string().uuid().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: parent, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!parent?.audio_url)
      throw new Error("Ce projet doit disposer d'un audio avant d'ajouter un instrumental.");
    await assertCredits(supabase, userId, COSTS.addInstrumental);
    const idempotencyKey = data.requestId ?? crypto.randomUUID();

    const { data: child, error: insertError } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        title: `${parent.title} · instrumental`,
        prompt: parent.prompt,
        genre: parent.genre,
        mood: parent.mood,
        voice: null,
        status: "rendering",
        progress: 5,
        instrumental: true,
        model: parent.model ?? "V4_5PLUS",
        style: parent.style,
        cover_gradient: parent.cover_gradient,
        tags: parent.tags,
        parent_project_id: parent.id,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    const claim = await claimGenerationJob(
      supabase,
      userId,
      child.id,
      "add-instrumental",
      idempotencyKey,
      PROVIDER_COST_BY_JOB_KIND["add-instrumental"],
      { parentId: parent.id },
    );
    if (claim.existing) {
      await supabase.from("projects").delete().eq("id", child.id);
      return { projectId: claim.job.project_id ?? child.id, taskId: claim.job.suno_task_id ?? "" };
    }

    let reservedCredits = 0;
    let taskId: string | null = null;

    try {
      const accounting = await spend(
        supabase,
        COSTS.addInstrumental,
        `Instrumental · ${parent.title}`,
        child.id,
        "add-instrumental",
      );
      reservedCredits = COSTS.addInstrumental;
      await updateGenerationJob(claim.job.id, {
        credits_spent: COSTS.addInstrumental,
        provider_credits_spent: accounting.providerCredits,
        provider_cost_usd: accounting.providerCostUsd,
      });

      const { addInstrumental } = await import("./suno.server");
      const result = await addInstrumental({
        uploadUrl: parent.audio_url,
        title: `${parent.title} · instrumental`,
        tags: parent.style ?? parent.genre ?? undefined,
        model: (parent.model as (typeof MODELS)[number]) ?? "V4_5PLUS",
        callBackUrl: callbackUrl("music"),
      });
      taskId = result.taskId;
      await supabase.from("projects").update({ suno_task_id: taskId }).eq("id", child.id);
      await updateGenerationJob(claim.job.id, { status: "processing", suno_task_id: taskId });
      return { projectId: child.id, taskId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ajout instrumental impossible";
      if (reservedCredits > 0 && !taskId) {
        await refundGeneration(
          supabase,
          userId,
          reservedCredits,
          child.id,
          claim.job.id,
          `Remboursement · ${message}`,
        );
      }
      await markGenerationFailed(supabase, claim.job.id, child.id, message);
      throw err;
    }
  });

/** Génère des paroles sans lancer de rendu audio. */
export const generateProjectLyrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        prompt: z.string().trim().min(3).max(2000),
        requestId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .select("id,title")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project) throw new Error("Projet introuvable");
    await assertCredits(supabase, userId, COSTS.lyrics);
    const claim = await claimGenerationJob(
      supabase,
      userId,
      project.id,
      "lyrics",
      data.requestId ?? crypto.randomUUID(),
      PROVIDER_COST_BY_JOB_KIND.lyrics,
      { prompt: data.prompt },
    );
    if (claim.existing) return { taskId: claim.job.suno_task_id ?? "" };

    let reservedCredits = 0;
    let taskId: string | null = null;
    try {
      const accounting = await spend(
        supabase,
        COSTS.lyrics,
        `Paroles · ${project.title}`,
        project.id,
        "lyrics",
      );
      reservedCredits = COSTS.lyrics;
      await updateGenerationJob(claim.job.id, {
        credits_spent: COSTS.lyrics,
        provider_credits_spent: accounting.providerCredits,
        provider_cost_usd: accounting.providerCostUsd,
      });

      const { generateLyrics } = await import("./suno.server");
      const result = await generateLyrics({
        prompt: data.prompt,
        callBackUrl: callbackUrl("lyrics"),
      });
      taskId = result.taskId;
      await updateGenerationJob(claim.job.id, { status: "processing", suno_task_id: taskId });
      return { taskId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Génération des paroles impossible";
      if (reservedCredits > 0 && !taskId) {
        await refundGeneration(
          supabase,
          userId,
          reservedCredits,
          project.id,
          claim.job.id,
          `Remboursement · ${message}`,
        );
      }
      await markGenerationFailed(supabase, claim.job.id, project.id, message);
      throw err;
    }
  });

/** Convertit le master d'un projet en WAV via Suno. */
export const convertProjectToWav = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ projectId: z.string().uuid(), requestId: z.string().uuid().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertPaidPlan(supabase, userId);
    const { data: project, error } = await supabase
      .from("projects")
      .select("id,title,suno_task_id,suno_audio_id")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project?.suno_task_id || !project.suno_audio_id)
      throw new Error("Le projet doit être rendu avant l'export WAV.");
    await assertCredits(supabase, userId, COSTS.wav);
    const claim = await claimGenerationJob(
      supabase,
      userId,
      project.id,
      "wav",
      data.requestId ?? crypto.randomUUID(),
      PROVIDER_COST_BY_JOB_KIND.wav,
      { sourceTaskId: project.suno_task_id },
    );
    if (claim.existing) return { taskId: claim.job.suno_task_id ?? "" };
    let reservedCredits = 0;
    let taskId: string | null = null;
    try {
      const accounting = await spend(
        supabase,
        COSTS.wav,
        `Export WAV · ${project.title}`,
        project.id,
        "wav",
      );
      reservedCredits = COSTS.wav;
      await updateGenerationJob(claim.job.id, {
        credits_spent: COSTS.wav,
        provider_credits_spent: accounting.providerCredits,
        provider_cost_usd: accounting.providerCostUsd,
      });
      const { convertToWav } = await import("./suno.server");
      const result = await convertToWav({
        taskId: project.suno_task_id,
        audioId: project.suno_audio_id,
        callBackUrl: callbackUrl("wav"),
      });
      taskId = result.taskId;
      await updateGenerationJob(claim.job.id, { status: "processing", suno_task_id: taskId });
      return { taskId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export WAV impossible";
      if (reservedCredits > 0 && !taskId)
        await refundGeneration(
          supabase,
          userId,
          reservedCredits,
          project.id,
          claim.job.id,
          `Remboursement · ${message}`,
        );
      await markGenerationFailed(supabase, claim.job.id, project.id, message);
      throw err;
    }
  });

/** Génère une vidéo MP4 synchronisée à partir du master. */
export const createProjectVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ projectId: z.string().uuid(), requestId: z.string().uuid().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertPaidPlan(supabase, userId);
    const { data: project, error } = await supabase
      .from("projects")
      .select("id,title,suno_task_id,suno_audio_id")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project?.suno_task_id || !project.suno_audio_id)
      throw new Error("Le projet doit être rendu avant de créer une vidéo.");
    await assertCredits(supabase, userId, COSTS.video);
    const claim = await claimGenerationJob(
      supabase,
      userId,
      project.id,
      "video",
      data.requestId ?? crypto.randomUUID(),
      PROVIDER_COST_BY_JOB_KIND.video,
      { sourceTaskId: project.suno_task_id },
    );
    if (claim.existing) return { taskId: claim.job.suno_task_id ?? "" };
    let reservedCredits = 0;
    let taskId: string | null = null;
    try {
      const accounting = await spend(
        supabase,
        COSTS.video,
        `Clip vidéo · ${project.title}`,
        project.id,
        "video",
      );
      reservedCredits = COSTS.video;
      await updateGenerationJob(claim.job.id, {
        credits_spent: COSTS.video,
        provider_credits_spent: accounting.providerCredits,
        provider_cost_usd: accounting.providerCostUsd,
      });
      const { createMusicVideo } = await import("./suno.server");
      const result = await createMusicVideo({
        taskId: project.suno_task_id,
        audioId: project.suno_audio_id,
        author: "Loopster",
        callBackUrl: callbackUrl("video"),
      });
      taskId = result.taskId;
      await updateGenerationJob(claim.job.id, { status: "processing", suno_task_id: taskId });
      return { taskId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Création de la vidéo impossible";
      if (reservedCredits > 0 && !taskId)
        await refundGeneration(
          supabase,
          userId,
          reservedCredits,
          project.id,
          claim.job.id,
          `Remboursement · ${message}`,
        );
      await markGenerationFailed(supabase, claim.job.id, project.id, message);
      throw err;
    }
  });

/** Génère une nouvelle pochette à partir du morceau terminé. */
export const createProjectCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ projectId: z.string().uuid(), requestId: z.string().uuid().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .select("id,title,suno_task_id,image_url,cover_url")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project?.suno_task_id) throw new Error("Le morceau doit être terminé avant sa pochette.");
    if (project.image_url || project.cover_url) {
      throw new Error("Une pochette existe déjà pour ce morceau.");
    }

    const claim = await claimGenerationJob(
      supabase,
      userId,
      project.id,
      "cover",
      data.requestId ?? crypto.randomUUID(),
      PROVIDER_COST_BY_JOB_KIND.cover,
      { sourceTaskId: project.suno_task_id },
    );
    if (claim.existing) return { taskId: claim.job.suno_task_id ?? "" };

    try {
      const { createMusicCover } = await import("./suno.server");
      const result = await createMusicCover({
        taskId: project.suno_task_id,
        callBackUrl: callbackUrl("cover"),
      });
      await updateGenerationJob(claim.job.id, {
        status: "processing",
        suno_task_id: result.taskId,
      });
      return { taskId: result.taskId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Pochette impossible";
      await updateGenerationJob(claim.job.id, { status: "failed", error_message: message });
      throw err;
    }
  });

/** Rafraîchit l'état d'un projet depuis Suno (polling). */
export const syncProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: project, error } = await supabase
      .from("projects")
      .select("id,user_id,status,suno_task_id,stems,duration_seconds")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project?.suno_task_id) return { status: project?.status ?? "draft", changed: false };

    const { getTaskInfo, getStemInfo, isTerminalFailure } = await import("./suno.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { persistGeneratedAsset } = await import("@/lib/persist-generated-asset.server");
    let changed = false;

    if (project.status === "rendering") {
      const info = await getTaskInfo(project.suno_task_id);
      const clip = info.response?.sunoData?.[0];

      if (isTerminalFailure(info.status)) {
        const message = info.errorMessage ?? `Échec Suno (${info.status})`;
        await failProviderJob(supabaseAdmin, project.suno_task_id, project.id, message);
        await supabase
          .from("projects")
          .update({
            status: "draft",
            progress: 0,
            error_message: message,
          })
          .eq("id", project.id);
        changed = true;
      } else if (clip?.audioUrl) {
        const durableAudioUrl = await persistGeneratedAsset(
          supabaseAdmin,
          clip.audioUrl,
          `${project.user_id}/${project.id}/master.mp3`,
          "audio/mpeg",
        );
        const durableImageUrl = await persistGeneratedAsset(
          supabaseAdmin,
          clip.imageUrl,
          `${project.user_id}/${project.id}/cover.jpg`,
          "image/jpeg",
        );
        if (!durableAudioUrl) {
          const message = "Le fichier audio n'a pas pu être conservé dans Loopster.";
          await failProviderJob(supabaseAdmin, project.suno_task_id, project.id, message);
          await supabase
            .from("projects")
            .update({ status: "draft", progress: 0, error_message: message })
            .eq("id", project.id);
          changed = true;
          return { changed, status: "draft" };
        }
        await supabase
          .from("projects")
          .update({
            status: "ready",
            progress: 100,
            audio_url: durableAudioUrl,
            image_url: durableImageUrl,
            cover_url: durableImageUrl,
            suno_audio_id: clip.id,
            duration_seconds: clip.duration ? Math.round(clip.duration) : project.duration_seconds,
            error_message: null,
          })
          .eq("id", project.id);
        await completeProviderJob(supabaseAdmin, project.suno_task_id, {
          audioUrl: durableAudioUrl,
          imageUrl: durableImageUrl,
        });
        changed = true;
      } else {
        const progress =
          info.status === "TEXT_SUCCESS" ? 45 : info.status === "FIRST_SUCCESS" ? 75 : 20;
        await supabase.from("projects").update({ progress }).eq("id", project.id);
      }
    }

    const stems = project.stems as { taskId?: string; status?: string } | null;
    if (stems?.taskId && stems.status === "processing") {
      const stemInfo = await getStemInfo(stems.taskId);
      if (isTerminalFailure(stemInfo.status)) {
        const message = stemInfo.errorMessage ?? stemInfo.status;
        await failProviderJob(supabaseAdmin, stems.taskId, project.id, message);
        await supabase
          .from("projects")
          .update({
            stems: { ...stems, status: "failed", error: message },
          })
          .eq("id", project.id);
        changed = true;
      } else if (stemInfo.response?.vocalUrl || stemInfo.response?.instrumentalUrl) {
        const durableVocalUrl = await persistGeneratedAsset(
          supabaseAdmin,
          stemInfo.response.vocalUrl,
          `${project.user_id}/${project.id}/stems-vocal.mp3`,
          "audio/mpeg",
        );
        const durableInstrumentalUrl = await persistGeneratedAsset(
          supabaseAdmin,
          stemInfo.response.instrumentalUrl,
          `${project.user_id}/${project.id}/stems-instrumental.mp3`,
          "audio/mpeg",
        );
        const durableOriginUrl = await persistGeneratedAsset(
          supabaseAdmin,
          stemInfo.response.originUrl,
          `${project.user_id}/${project.id}/stems-original.mp3`,
          "audio/mpeg",
        );
        await supabase
          .from("projects")
          .update({
            stems: {
              ...stems,
              status: "ready",
              vocalUrl: durableVocalUrl,
              instrumentalUrl: durableInstrumentalUrl,
              originUrl: durableOriginUrl,
            },
          })
          .eq("id", project.id);
        await completeProviderJob(supabaseAdmin, stems.taskId, {
          vocalUrl: durableVocalUrl,
          instrumentalUrl: durableInstrumentalUrl,
          originUrl: durableOriginUrl,
        });
        changed = true;
      }
    }

    return { changed, status: project.status };
  });
