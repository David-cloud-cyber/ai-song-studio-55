import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { activeSubscriptionStatuses, paidPlans } from "@/lib/plans";

export const COSTS = {
  song: 40,
  instrumental: 30,
  extend: 30,
  stems: 20,
  lyrics: 5,
  vocals: 35,
  addInstrumental: 30,
  wav: 8,
  video: 120,
} as const;

const MODELS = ["V3_5", "V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5", "V5_5"] as const;

function callbackUrl(kind: string) {
  const request = getRequest();
  const origin = new URL(request.url).origin;
  const secret = process.env.SUNO_CALLBACK_SECRET ?? "";
  return `${origin}/api/public/suno-callback?kind=${kind}&token=${encodeURIComponent(secret)}`;
}

type AuthedClient = SupabaseClient<Database>;

async function spend(
  supabase: AuthedClient,
  amount: number,
  reason: string,
  projectId: string,
) {
  const { error } = await supabase.rpc("deduct_credits", {
    _amount: amount,
    _reason: reason,
    _project_id: projectId,
  });
  if (error) throw new Error(error.message ?? "Crédits insuffisants");
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
    const plan = String((profile as { plan?: string | null }).plan ?? "free").toLowerCase();
    const paid = paidPlans.has(plan);
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
    .select("plan,subscription_status")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile) {
    throw new Error("Les téléchargements sont réservés aux abonnés Loopster ✨");
  }
  const plan = String(profile.plan ?? "").toLowerCase();
  const status = String(profile.subscription_status ?? "").toLowerCase();
  if (!paidPlans.has(plan) || (status && !activeSubscriptionStatuses.has(status))) {
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
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const cost = data.instrumental ? COSTS.instrumental : COSTS.song;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile || profile.credits < cost) {
      throw new Error(`Crédits insuffisants : ${cost} crédits requis.`);
    }

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
        tags: [data.genre, data.mood].filter(Boolean) as string[],
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    try {
      const { createSong } = await import("./suno.server");
      const { taskId } = await createSong({
        prompt: data.prompt,
        style: data.customMode ? style || undefined : undefined,
        title: data.customMode ? data.title : undefined,
        customMode: data.customMode,
        instrumental: data.instrumental,
        model: data.model,
        negativeTags: data.negativeTags,
        callBackUrl: callbackUrl("music"),
      });

      await supabase.from("projects").update({ suno_task_id: taskId }).eq("id", project.id);
      await spend(supabase, cost, `Génération · ${data.title}`, project.id);
      await supabase.from("generation_jobs").insert({
        user_id: userId,
        project_id: project.id,
        kind: data.instrumental ? "instrumental" : "song",
        status: "processing",
        suno_task_id: taskId,
        credits_spent: cost,
        payload: { prompt: data.prompt, style, model: data.model },
      });

      return { projectId: project.id, taskId, creditsSpent: cost };
    } catch (error) {
      await supabase.from("projects").delete().eq("id", project.id);
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

    try {
      const { extendSong } = await import("./suno.server");
      const { taskId } = await extendSong({
        audioId: parent.suno_audio_id,
        defaultParamFlag: data.continueAt !== undefined,
        prompt: data.prompt ?? parent.prompt ?? undefined,
        style: parent.style ?? undefined,
        title,
        continueAt: data.continueAt,
        model: (parent.model as (typeof MODELS)[number]) ?? "V4_5",
        callBackUrl: callbackUrl("extend"),
      });

      await supabase.from("projects").update({ suno_task_id: taskId }).eq("id", child.id);
      await spend(supabase, COSTS.extend, `Extension · ${parent.title}`, child.id);
      await supabase.from("generation_jobs").insert({
        user_id: userId,
        project_id: child.id,
        kind: "extend",
        status: "processing",
        suno_task_id: taskId,
        credits_spent: COSTS.extend,
        payload: { parentId: parent.id, continueAt: data.continueAt ?? null },
      });

      return { projectId: child.id, taskId };
    } catch (err) {
      await supabase.from("projects").delete().eq("id", child.id);
      throw err;
    }
  });

/** Sépare voix / instrumental d'un morceau généré. */
export const separateStems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid() }).parse(input),
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .maybeSingle();
    if (!profile || profile.credits < COSTS.stems) {
      throw new Error(`Crédits insuffisants : ${COSTS.stems} crédits requis.`);
    }

    const { createStemSeparation } = await import("./suno.server");
    const { taskId } = await createStemSeparation({
      taskId: project.suno_task_id,
      audioId: project.suno_audio_id,
      type: "separate_vocal",
      callBackUrl: callbackUrl("stems"),
    });

    await supabase
      .from("projects")
      .update({ stems: { taskId, status: "processing" } })
      .eq("id", project.id);
    await spend(supabase, COSTS.stems, `Séparation pistes · ${project.title}`, project.id);
    await supabase.from("generation_jobs").insert({
      user_id: userId,
      project_id: project.id,
      kind: "stems",
      status: "processing",
      suno_task_id: taskId,
      credits_spent: COSTS.stems,
    });

    return { taskId };
  });

/** Ajoute des voix IA à l'audio d'un projet et crée une nouvelle version. */
export const addVocalsToProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), prompt: z.string().trim().min(3).max(4000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: parent, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!parent?.audio_url) throw new Error("Ce projet doit disposer d'un audio avant d'ajouter une voix.");
    await assertCredits(supabase, userId, COSTS.vocals);

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

    try {
      const { addVocals } = await import("./suno.server");
      const { taskId } = await addVocals({
        prompt: data.prompt,
        title: `${parent.title} · voix IA`,
        uploadUrl: parent.audio_url,
        style: parent.style ?? undefined,
        model: (parent.model as (typeof MODELS)[number]) ?? "V4_5PLUS",
        callBackUrl: callbackUrl("music"),
      });
      await supabase.from("projects").update({ suno_task_id: taskId }).eq("id", child.id);
      await spend(supabase, COSTS.vocals, `Voix IA · ${parent.title}`, child.id);
      await supabase.from("generation_jobs").insert({
        user_id: userId,
        project_id: child.id,
        kind: "vocals",
        status: "processing",
        suno_task_id: taskId,
        credits_spent: COSTS.vocals,
        payload: { parentId: parent.id, prompt: data.prompt },
      });
      return { projectId: child.id, taskId };
    } catch (err) {
      await supabase.from("projects").delete().eq("id", child.id);
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
        tags: [data.genre, data.mood].filter(Boolean) as string[],
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    try {
      const { uploadAndCover } = await import("./suno.server");
      const { taskId } = await uploadAndCover({
        uploadUrl: data.uploadUrl,
        prompt: data.prompt,
        style: style || undefined,
        title: data.title,
        customMode: true,
        instrumental: data.instrumental,
        model: data.model,
        callBackUrl: callbackUrl("music"),
      });
      await supabase.from("projects").update({ suno_task_id: taskId }).eq("id", project.id);
      await spend(supabase, cost, `Remix audio · ${data.title}`, project.id);
      await supabase.from("generation_jobs").insert({
        user_id: userId,
        project_id: project.id,
        kind: "upload-cover",
        status: "processing",
        suno_task_id: taskId,
        credits_spent: cost,
        payload: { style, model: data.model },
      });
      return { projectId: project.id, taskId, creditsSpent: cost };
    } catch (error) {
      await supabase.from("projects").delete().eq("id", project.id);
      throw error;
    }
  });

/** Ajoute un accompagnement instrumental à l'audio d'un projet. */
export const addInstrumentalToProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: parent, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!parent?.audio_url) throw new Error("Ce projet doit disposer d'un audio avant d'ajouter un instrumental.");
    await assertCredits(supabase, userId, COSTS.addInstrumental);

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

    try {
      const { addInstrumental } = await import("./suno.server");
      const { taskId } = await addInstrumental({
        uploadUrl: parent.audio_url,
        title: `${parent.title} · instrumental`,
        tags: parent.style ?? parent.genre ?? undefined,
        model: (parent.model as (typeof MODELS)[number]) ?? "V4_5PLUS",
        callBackUrl: callbackUrl("music"),
      });
      await supabase.from("projects").update({ suno_task_id: taskId }).eq("id", child.id);
      await spend(supabase, COSTS.addInstrumental, `Instrumental · ${parent.title}`, child.id);
      await supabase.from("generation_jobs").insert({
        user_id: userId,
        project_id: child.id,
        kind: "add-instrumental",
        status: "processing",
        suno_task_id: taskId,
        credits_spent: COSTS.addInstrumental,
        payload: { parentId: parent.id },
      });
      return { projectId: child.id, taskId };
    } catch (err) {
      await supabase.from("projects").delete().eq("id", child.id);
      throw err;
    }
  });

/** Génère des paroles sans lancer de rendu audio. */
export const generateProjectLyrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), prompt: z.string().trim().min(3).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase.from("projects").select("id,title").eq("id", data.projectId).maybeSingle();
    if (error) throw error;
    if (!project) throw new Error("Projet introuvable");
    await assertCredits(supabase, userId, COSTS.lyrics);
    const { generateLyrics } = await import("./suno.server");
    const { taskId } = await generateLyrics({ prompt: data.prompt, callBackUrl: callbackUrl("lyrics") });
    await spend(supabase, COSTS.lyrics, `Paroles · ${project.title}`, project.id);
    await supabase.from("generation_jobs").insert({
      user_id: userId,
      project_id: project.id,
      kind: "lyrics",
      status: "processing",
      suno_task_id: taskId,
      credits_spent: COSTS.lyrics,
      payload: { prompt: data.prompt },
    });
    return { taskId };
  });

/** Convertit le master d'un projet en WAV via Suno. */
export const convertProjectToWav = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertPaidPlan(supabase, userId);
    const { data: project, error } = await supabase
      .from("projects")
      .select("id,title,suno_task_id,suno_audio_id")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project?.suno_task_id || !project.suno_audio_id) throw new Error("Le projet doit être rendu avant l'export WAV.");
    await assertCredits(supabase, userId, COSTS.wav);
    const { convertToWav } = await import("./suno.server");
    const { taskId } = await convertToWav({
      taskId: project.suno_task_id,
      audioId: project.suno_audio_id,
      callBackUrl: callbackUrl("wav"),
    });
    await spend(supabase, COSTS.wav, `Export WAV · ${project.title}`, project.id);
    await supabase.from("generation_jobs").insert({
      user_id: userId,
      project_id: project.id,
      kind: "wav",
      status: "processing",
      suno_task_id: taskId,
      credits_spent: COSTS.wav,
    });
    return { taskId };
  });

/** Génère une vidéo MP4 synchronisée à partir du master. */
export const createProjectVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertPaidPlan(supabase, userId);
    const { data: project, error } = await supabase
      .from("projects")
      .select("id,title,suno_task_id,suno_audio_id")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project?.suno_task_id || !project.suno_audio_id) throw new Error("Le projet doit être rendu avant de créer une vidéo.");
    await assertCredits(supabase, userId, COSTS.video);
    const { createMusicVideo } = await import("./suno.server");
    const { taskId } = await createMusicVideo({
      taskId: project.suno_task_id,
      audioId: project.suno_audio_id,
      author: "Loopster",
      callBackUrl: callbackUrl("video"),
    });
    await spend(supabase, COSTS.video, `Clip vidéo · ${project.title}`, project.id);
    await supabase.from("generation_jobs").insert({
      user_id: userId,
      project_id: project.id,
      kind: "video",
      status: "processing",
      suno_task_id: taskId,
      credits_spent: COSTS.video,
    });
    return { taskId };
  });

/** Rafraîchit l'état d'un projet depuis Suno (polling). */
export const syncProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: project, error } = await supabase
      .from("projects")
      .select("id,status,suno_task_id,stems,duration_seconds")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project?.suno_task_id) return { status: project?.status ?? "draft", changed: false };

    const { getTaskInfo, getStemInfo, isTerminalFailure } = await import("./suno.server");
    let changed = false;

    if (project.status === "rendering") {
      const info = await getTaskInfo(project.suno_task_id);
      const clip = info.response?.sunoData?.[0];

      if (isTerminalFailure(info.status)) {
        await supabase
          .from("projects")
          .update({
            status: "draft",
            progress: 0,
            error_message: info.errorMessage ?? `Échec Suno (${info.status})`,
          })
          .eq("id", project.id);
        changed = true;
      } else if (clip?.audioUrl) {
        await supabase
          .from("projects")
          .update({
            status: "ready",
            progress: 100,
            audio_url: clip.audioUrl,
            image_url: clip.imageUrl ?? null,
            cover_url: clip.imageUrl ?? null,
            suno_audio_id: clip.id,
            duration_seconds: clip.duration ? Math.round(clip.duration) : project.duration_seconds,
            lyrics: clip.prompt ?? null,
            error_message: null,
          })
          .eq("id", project.id);
        changed = true;
      } else {
        const progress = info.status === "TEXT_SUCCESS" ? 45 : info.status === "FIRST_SUCCESS" ? 75 : 20;
        await supabase.from("projects").update({ progress }).eq("id", project.id);
      }
    }

    const stems = project.stems as { taskId?: string; status?: string } | null;
    if (stems?.taskId && stems.status === "processing") {
      const stemInfo = await getStemInfo(stems.taskId);
      if (isTerminalFailure(stemInfo.status)) {
        await supabase
          .from("projects")
          .update({
            stems: { ...stems, status: "failed", error: stemInfo.errorMessage ?? stemInfo.status },
          })
          .eq("id", project.id);
        changed = true;
      } else if (stemInfo.response?.vocalUrl || stemInfo.response?.instrumentalUrl) {
        await supabase
          .from("projects")
          .update({
            stems: {
              ...stems,
              status: "ready",
              vocalUrl: stemInfo.response.vocalUrl ?? null,
              instrumentalUrl: stemInfo.response.instrumentalUrl ?? null,
              originUrl: stemInfo.response.originUrl ?? null,
            },
          })
          .eq("id", project.id);
        changed = true;
      }
    }

    return { changed, status: project.status };
  });
