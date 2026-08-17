import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { LOOPSTER_COSTS, PROVIDER_COST_BY_JOB_KIND, sunoCostUsd } from "@/lib/generation-costs";

type Client = SupabaseClient<Database>;
type Model = "V3_5" | "V4" | "V4_5" | "V4_5PLUS" | "V4_5ALL" | "V5" | "V5_5";

function callbackUrl(kind: string) {
  const secret = process.env.SUNO_CALLBACK_SECRET;
  if (!secret) throw new Error("Le traitement musical est temporairement indisponible.");
  return `${new URL(getRequest().url).origin}/api/public/suno-callback?kind=${kind}&token=${encodeURIComponent(secret)}`;
}

function providerCredits(kind: string) {
  return PROVIDER_COST_BY_JOB_KIND[kind] ?? 0;
}

async function updateJob(
  jobId: string,
  patch: Database["public"]["Tables"]["generation_jobs"]["Update"],
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("generation_jobs").update(patch).eq("id", jobId);
  if (error) throw error;
}

async function refundJob(jobId: string, reason: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("refund_generation_job", {
    _job_id: jobId,
    _reason: reason,
  });
  if (error) throw error;
}

async function createJob(
  supabase: Client,
  userId: string,
  projectId: string | null,
  kind: string,
  credits: number,
  idempotencyKey: string,
  payload: Json,
) {
  const inserted = await supabase
    .from("generation_jobs")
    .insert({
      user_id: userId,
      project_id: projectId,
      kind,
      status: "pending",
      idempotency_key: idempotencyKey,
      provider_credits_spent: providerCredits(kind),
      provider_cost_usd: sunoCostUsd(providerCredits(kind)),
      payload,
    })
    .select("id,project_id,suno_task_id,credits_spent,status")
    .single();

  if (!inserted.error && inserted.data) return { job: inserted.data, existing: false };
  if (inserted.error?.code === "23505") {
    const existing = await supabase
      .from("generation_jobs")
      .select("id,project_id,suno_task_id,credits_spent,status")
      .eq("user_id", userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (!existing.error && existing.data) return { job: existing.data, existing: true };
  }
  throw inserted.error ?? new Error("Impossible de réserver cette opération.");
}

async function startOperation(input: {
  supabase: Client;
  userId: string;
  projectId: string | null;
  kind: string;
  credits: number;
  idempotencyKey: string;
  payload: Json;
  launch: () => Promise<string>;
}) {
  const claim = await createJob(
    input.supabase,
    input.userId,
    input.projectId,
    input.kind,
    input.credits,
    input.idempotencyKey,
    input.payload,
  );
  if (claim.existing)
    return {
      taskId: claim.job.suno_task_id ?? "",
      jobId: claim.job.id,
      projectId: claim.job.project_id,
      existing: true,
    };

  let reserved = false;
  try {
    if (input.credits > 0) {
      const { error } = await input.supabase.rpc("deduct_credits", {
        _amount: input.credits,
        _reason: `Loopster · ${input.kind}`,
        _project_id: input.projectId ?? undefined,
      });
      if (error) throw new Error(error.message || "Crédits insuffisants.");
      reserved = true;
    }
    await updateJob(claim.job.id, { credits_spent: input.credits });
    const taskId = await input.launch();
    await updateJob(claim.job.id, { status: "processing", suno_task_id: taskId });
    return { taskId, jobId: claim.job.id, projectId: claim.job.project_id, existing: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Traitement impossible";
    if (reserved) await refundJob(claim.job.id, `Remboursement · ${message}`);
    await updateJob(claim.job.id, { status: "failed", error_message: message });
    throw error;
  }
}

async function projectFor(supabase: Client, projectId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id,user_id,title,prompt,genre,mood,voice,style,model,audio_url,suno_audio_id,suno_task_id,cover_gradient,tags,instrumental,duration_seconds",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Projet introuvable.");
  return data;
}

async function childProject(
  supabase: Client,
  userId: string,
  parent: Awaited<ReturnType<typeof projectFor>>,
  title: string,
  prompt?: string,
) {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      title,
      prompt: prompt ?? parent.prompt,
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
  if (error) throw error;
  return data;
}

export const separateStemsAdvanced = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        mode: z.enum(["vocals", "advanced", "full"]),
        requestId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const project = await projectFor(supabase, data.projectId);
    if (!project.suno_audio_id || !project.suno_task_id) {
      throw new Error("Ce morceau doit être terminé avant de séparer ses pistes.");
    }
    const kind =
      data.mode === "vocals" ? "stems" : data.mode === "advanced" ? "advanced-stems" : "full-stems";
    const credits =
      data.mode === "vocals"
        ? LOOPSTER_COSTS.stems
        : data.mode === "advanced"
          ? LOOPSTER_COSTS.advancedStems
          : LOOPSTER_COSTS.fullStems;
    const providerType = data.mode === "vocals" ? "separate_vocal" : "split_stem";
    const operation = await startOperation({
      supabase,
      userId,
      projectId: project.id,
      kind,
      credits,
      idempotencyKey: data.requestId ?? crypto.randomUUID(),
      payload: { sourceTaskId: project.suno_task_id, mode: data.mode },
      launch: async () => {
        const { createStemSeparation } = await import("@/lib/suno.server");
        const result = await createStemSeparation({
          taskId: project.suno_task_id!,
          audioId: project.suno_audio_id!,
          type: providerType,
          callBackUrl: callbackUrl(kind),
        });
        await supabase
          .from("projects")
          .update({ stems: { taskId: result.taskId, status: "processing", mode: data.mode } })
          .eq("id", project.id);
        return result.taskId;
      },
    });
    return { ...operation, mode: data.mode };
  });

export const createMashupOperation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        firstProjectId: z.string().uuid(),
        secondProjectId: z.string().uuid(),
        title: z.string().trim().min(1).max(120),
        prompt: z.string().trim().max(4000).optional(),
        model: z.enum(["V4_5", "V4_5PLUS", "V4_5ALL", "V5", "V5_5"]).default("V5_5"),
        requestId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.firstProjectId === data.secondProjectId)
      throw new Error("Choisis deux créations différentes.");
    const [first, second] = await Promise.all([
      projectFor(supabase, data.firstProjectId),
      projectFor(supabase, data.secondProjectId),
    ]);
    if (!first.audio_url || !second.audio_url)
      throw new Error("Les deux créations doivent avoir un audio.");
    const project = await childProject(supabase, userId, first, data.title, data.prompt);
    const operation = await startOperation({
      supabase,
      userId,
      projectId: project.id,
      kind: "mashup",
      credits: LOOPSTER_COSTS.mashup,
      idempotencyKey: data.requestId ?? crypto.randomUUID(),
      payload: { firstProjectId: first.id, secondProjectId: second.id, model: data.model },
      launch: async () => {
        const { createMashup } = await import("@/lib/suno.server");
        const result = await createMashup({
          uploadUrlList: [first.audio_url!, second.audio_url!],
          prompt: data.prompt,
          style: first.style ?? second.style ?? undefined,
          title: data.title,
          customMode: true,
          model: data.model as Model,
          callBackUrl: callbackUrl("mashup"),
        });
        await supabase
          .from("projects")
          .update({ suno_task_id: result.taskId })
          .eq("id", project.id);
        return result.taskId;
      },
    });
    if (operation.existing && operation.projectId && operation.projectId !== project.id) {
      await supabase.from("projects").delete().eq("id", project.id);
    }
    return { ...operation, projectId: operation.projectId ?? project.id };
  });

export const createSoundEffect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(120),
        prompt: z.string().trim().min(3).max(2000),
        duration: z.number().int().min(1).max(60).optional(),
        loop: z.boolean().default(false),
        bpm: z.number().int().min(40).max(240).optional(),
        requestId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        title: data.title,
        prompt: data.prompt,
        status: "rendering",
        progress: 5,
        tags: ["effet sonore"],
      })
      .select("id")
      .single();
    if (error) throw error;
    const operation = await startOperation({
      supabase,
      userId,
      projectId: project.id,
      kind: "sound",
      credits: LOOPSTER_COSTS.effects,
      idempotencyKey: data.requestId ?? crypto.randomUUID(),
      payload: { prompt: data.prompt, duration: data.duration ?? null, loop: data.loop },
      launch: async () => {
        const { createSound } = await import("@/lib/suno.server");
        const result = await createSound({
          prompt: data.prompt,
          duration: data.duration,
          loop: data.loop,
          bpm: data.bpm,
          callBackUrl: callbackUrl("sound"),
        });
        await supabase
          .from("projects")
          .update({ suno_task_id: result.taskId })
          .eq("id", project.id);
        return result.taskId;
      },
    });
    if (operation.existing && operation.projectId && operation.projectId !== project.id) {
      await supabase.from("projects").delete().eq("id", project.id);
    }
    return { ...operation, projectId: operation.projectId ?? project.id };
  });

export const createPersonaOperation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        name: z.string().trim().min(2).max(80),
        requestId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const project = await projectFor(supabase, data.projectId);
    if (!project.suno_task_id)
      throw new Error("Le morceau doit être terminé avant de créer un persona.");
    const { data: persona, error } = await supabase
      .from("music_personas")
      .insert({
        user_id: userId,
        source_project_id: project.id,
        name: data.name,
        status: "processing",
      })
      .select("id")
      .single();
    if (error) throw error;
    const operation = await startOperation({
      supabase,
      userId,
      projectId: project.id,
      kind: "persona",
      credits: LOOPSTER_COSTS.persona,
      idempotencyKey: data.requestId ?? crypto.randomUUID(),
      payload: { personaId: persona.id, sourceTaskId: project.suno_task_id },
      launch: async () => {
        const { createPersona } = await import("@/lib/suno.server");
        const result = await createPersona({
          taskId: project.suno_task_id!,
          callBackUrl: callbackUrl("persona"),
        });
        return result.taskId;
      },
    });
    return { ...operation, personaId: persona.id };
  });

export const prepareVoiceValidation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(80),
        voiceUrl: z.string().url(),
        sourceAssetPath: z.string().min(1).max(300),
        vocalStartS: z.number().min(0).max(600),
        vocalEndS: z.number().min(0).max(600),
        language: z.string().length(2).default("fr"),
        consent: z.literal(true),
        requestId: z.string().uuid().optional(),
      })
      .refine((value) => value.vocalEndS > value.vocalStartS, "Le segment vocal est invalide.")
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase
      .from("voice_profiles")
      .insert({
        user_id: userId,
        name: data.name,
        source_asset_path: data.sourceAssetPath,
        status: "validating",
        consent_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    const operation = await startOperation({
      supabase,
      userId,
      projectId: null,
      kind: "voice-validation",
      credits: 0,
      idempotencyKey: data.requestId ?? crypto.randomUUID(),
      payload: { voiceProfileId: profile.id, sourceAssetPath: data.sourceAssetPath },
      launch: async () => {
        const { createVoiceValidation } = await import("@/lib/suno.server");
        const result = await createVoiceValidation({
          voiceUrl: data.voiceUrl,
          vocalStartS: data.vocalStartS,
          vocalEndS: data.vocalEndS,
          language: data.language,
          callBackUrl: callbackUrl("voice-validation"),
        });
        await supabase
          .from("voice_profiles")
          .update({ validation_task_id: result.taskId })
          .eq("id", profile.id);
        return result.taskId;
      },
    });
    return { ...operation, voiceProfileId: profile.id };
  });

export const createVoiceProfileOperation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        validationTaskId: z.string().min(1),
        uploadUrl: z.string().url(),
        sourceAssetPath: z.string().min(1).max(300),
        verifyAssetPath: z.string().min(1).max(300),
        voiceProfileId: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(300).optional(),
        style: z.string().trim().max(200).optional(),
        singerSkillLevel: z
          .enum(["beginner", "intermediate", "advanced", "professional"])
          .default("beginner"),
        consent: z.literal(true),
        requestId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let profileId = data.voiceProfileId;
    if (profileId) {
      const { error } = await supabase
        .from("voice_profiles")
        .update({
          name: data.name,
          description: data.description ?? null,
          source_asset_path: data.sourceAssetPath,
          verify_asset_path: data.verifyAssetPath,
          status: "processing",
        })
        .eq("id", profileId)
        .eq("user_id", userId);
      if (error) throw error;
    } else {
      const { data: profile, error: profileError } = await supabase
        .from("voice_profiles")
        .insert({
          user_id: userId,
          name: data.name,
          description: data.description ?? null,
          source_asset_path: data.sourceAssetPath,
          verify_asset_path: data.verifyAssetPath,
          status: "processing",
          consent_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (profileError) throw profileError;
      profileId = profile.id;
    }
    const operation = await startOperation({
      supabase,
      userId,
      projectId: null,
      kind: "voice-profile",
      credits: LOOPSTER_COSTS.voiceProfile,
      idempotencyKey: data.requestId ?? crypto.randomUUID(),
      payload: {
        voiceProfileId: profileId,
        sourceAssetPath: data.sourceAssetPath,
        verifyAssetPath: data.verifyAssetPath,
      },
      launch: async () => {
        const { createVoiceProfile } = await import("@/lib/suno.server");
        const result = await createVoiceProfile({
          taskId: data.validationTaskId,
          verifyUrl: data.uploadUrl,
          voiceName: data.name,
          description: data.description,
          style: data.style,
          singerSkillLevel: data.singerSkillLevel,
          callBackUrl: callbackUrl("voice-profile"),
        });
        return result.taskId;
      },
    });
    return { ...operation, voiceProfileId: profileId };
  });

export const replaceProjectSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        prompt: z.string().trim().min(3).max(4000),
        sectionStart: z.number().min(0).max(900),
        sectionEnd: z.number().min(0).max(900),
        requestId: z.string().uuid().optional(),
      })
      .refine((value) => value.sectionEnd > value.sectionStart, "La fin doit être après le début.")
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const parent = await projectFor(supabase, data.projectId);
    if (!parent.suno_task_id || !parent.suno_audio_id)
      throw new Error("Le morceau doit être terminé avant de modifier une section.");
    const child = await childProject(
      supabase,
      userId,
      parent,
      `${parent.title} · section`,
      data.prompt,
    );
    const operation = await startOperation({
      supabase,
      userId,
      projectId: child.id,
      kind: "replace-section",
      credits: LOOPSTER_COSTS.replaceSection,
      idempotencyKey: data.requestId ?? crypto.randomUUID(),
      payload: {
        parentProjectId: parent.id,
        sectionStart: data.sectionStart,
        sectionEnd: data.sectionEnd,
      },
      launch: async () => {
        const { replaceMusicSection } = await import("@/lib/suno.server");
        const result = await replaceMusicSection({
          taskId: parent.suno_task_id!,
          audioId: parent.suno_audio_id!,
          prompt: data.prompt,
          sectionStart: data.sectionStart,
          sectionEnd: data.sectionEnd,
          model: (parent.model as Model) ?? "V5_5",
          callBackUrl: callbackUrl("replace-section"),
        });
        await supabase.from("projects").update({ suno_task_id: result.taskId }).eq("id", child.id);
        return result.taskId;
      },
    });
    if (operation.existing && operation.projectId && operation.projectId !== child.id) {
      await supabase.from("projects").delete().eq("id", child.id);
    }
    return { ...operation, projectId: operation.projectId ?? child.id };
  });
