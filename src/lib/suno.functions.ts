import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const COSTS = {
  song: 40,
  instrumental: 30,
  extend: 30,
  stems: 20,
} as const;

const MODELS = ["V3_5", "V4", "V4_5", "V4_5PLUS", "V5"] as const;

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
