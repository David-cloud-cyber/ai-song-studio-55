import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

type CallbackClip = {
  id?: string;
  audio_url?: string | null;
  audioUrl?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  prompt?: string | null;
  title?: string | null;
  duration?: number | null;
};

type CallbackBody = {
  code?: number;
  msg?: string;
  data?: {
    callbackType?: string;
    task_id?: string;
    taskId?: string;
    data?: CallbackClip[];
    vocal_removal_info?: {
      origin_url?: string | null;
      instrumental_url?: string | null;
      vocal_url?: string | null;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function findString(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (keys.includes(key) && typeof child === "string" && child.length > 0) return child;
    const nested = findString(child, keys);
    if (nested) return nested;
  }
  return null;
}

export const Route = createFileRoute("/api/public/suno-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.SUNO_CALLBACK_SECRET;
        const token = new URL(request.url).searchParams.get("token") ?? "";
        if (!secret || !safeEqual(token, secret)) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: CallbackBody;
        try {
          body = (await request.json()) as CallbackBody;
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const taskId = body.data?.taskId ?? body.data?.task_id;
        if (!taskId) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: job } = await supabaseAdmin
          .from("generation_jobs")
          .select("id,project_id,kind")
          .eq("suno_task_id", taskId)
          .maybeSingle();

        const isFailure = body.code !== undefined && body.code !== 200;
        if (job && isFailure) {
          await supabaseAdmin
            .from("generation_jobs")
            .update({ status: "failed", error_message: body.msg ?? "Échec Suno" })
            .eq("id", job.id);
          if (job.project_id) {
            await supabaseAdmin
              .from("projects")
              .update({ error_message: body.msg ?? "Échec Suno" })
              .eq("id", job.project_id);
          }
          return new Response("ok");
        }

        if (job && job.kind === "lyrics") {
          const lyrics =
            findString(body, ["lyrics", "lyric", "text", "content"]) ?? body.msg ?? null;
          if (lyrics && job.project_id) {
            await supabaseAdmin.from("projects").update({ lyrics }).eq("id", job.project_id);
            await supabaseAdmin
              .from("generation_jobs")
              .update({ status: "completed", result: { lyrics } })
              .eq("id", job.id);
          }
          return new Response("ok");
        }

        if (job && job.kind === "wav") {
          const wavUrl = findString(body, ["wavUrl", "wav_url", "audioUrl", "audio_url", "downloadUrl"]);
          if (wavUrl && job.project_id) {
            await supabaseAdmin.from("projects").update({ wav_url: wavUrl }).eq("id", job.project_id);
            await supabaseAdmin
              .from("generation_jobs")
              .update({ status: "completed", result: { wavUrl } })
              .eq("id", job.id);
          }
          return new Response("ok");
        }

        if (job && job.kind === "video") {
          const videoUrl = findString(body, ["videoUrl", "video_url", "mp4Url", "mp4_url", "downloadUrl"]);
          if (videoUrl && job.project_id) {
            await supabaseAdmin.from("projects").update({ video_url: videoUrl }).eq("id", job.project_id);
            await supabaseAdmin
              .from("generation_jobs")
              .update({ status: "completed", result: { videoUrl } })
              .eq("id", job.id);
          }
          return new Response("ok");
        }

        const vocal = body.data?.vocal_removal_info;
        if (vocal) {
          const { data: rows } = await supabaseAdmin
            .from("projects")
            .select("id,stems")
            .contains("stems", { taskId });
          for (const row of rows ?? []) {
            await supabaseAdmin
              .from("projects")
              .update({
                stems: {
                  ...(row.stems as Record<string, unknown>),
                  status: "ready",
                  vocalUrl: vocal.vocal_url ?? null,
                  instrumentalUrl: vocal.instrumental_url ?? null,
                  originUrl: vocal.origin_url ?? null,
                },
              })
              .eq("id", row.id);
          }
          return new Response("ok");
        }

        const clip = body.data?.data?.[0];
        const audioUrl = clip?.audio_url ?? clip?.audioUrl ?? null;
        const imageUrl = clip?.image_url ?? clip?.imageUrl ?? null;

        if (body.code !== undefined && body.code !== 200 && !audioUrl) {
          await supabaseAdmin
            .from("projects")
            .update({
              status: "draft",
              progress: 0,
              error_message: body.msg ?? "Échec de la génération Suno",
            })
            .eq("suno_task_id", taskId);
          await supabaseAdmin
            .from("generation_jobs")
            .update({ status: "failed", error_message: body.msg ?? "Échec Suno" })
            .eq("suno_task_id", taskId);
          return new Response("ok");
        }

        if (audioUrl) {
          await supabaseAdmin
            .from("projects")
            .update({
              status: "ready",
              progress: 100,
              audio_url: audioUrl,
              image_url: imageUrl,
              cover_url: imageUrl,
              suno_audio_id: clip?.id ?? null,
              duration_seconds: clip?.duration ? Math.round(clip.duration) : null,
              lyrics: clip?.prompt ?? null,
              error_message: null,
            })
            .eq("suno_task_id", taskId);
          await supabaseAdmin
            .from("generation_jobs")
            .update({ status: "completed", result: { audioUrl, imageUrl } })
            .eq("suno_task_id", taskId);
        } else {
          await supabaseAdmin
            .from("projects")
            .update({ progress: body.data?.callbackType === "first" ? 75 : 45 })
            .eq("suno_task_id", taskId);
        }

        return new Response("ok");
      },
    },
  },
});
