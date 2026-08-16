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
    images?: string[];
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
        const { persistGeneratedAsset } = await import("@/lib/persist-generated-asset.server");

        const { data: job } = await supabaseAdmin
          .from("generation_jobs")
          .select("id,project_id,user_id,kind,status,credits_spent,credits_refunded")
          .eq("suno_task_id", taskId)
          .maybeSingle();

        const isFailure = body.code !== undefined && body.code !== 200;
        if (job?.status === "completed") return new Response("ok");

        const refundFailedJob = async () => {
          if (!job || job.credits_spent <= 0 || job.credits_refunded > 0) return;
          const { error: refundError } = await supabaseAdmin.rpc("refund_credits", {
            _user_id: job.user_id,
            _amount: job.credits_spent,
            _reason: "Remboursement · génération échouée",
            _project_id: job.project_id ?? undefined,
          });
          if (!refundError) {
            await supabaseAdmin
              .from("generation_jobs")
              .update({
                credits_refunded: job.credits_spent,
                refunded_at: new Date().toISOString(),
              })
              .eq("id", job.id);
          }
        };

        if (job && isFailure) {
          await refundFailedJob();
          await supabaseAdmin
            .from("generation_jobs")
            .update({ status: "failed", error_message: body.msg ?? "Échec Suno" })
            .eq("id", job.id);
          if (job.project_id) {
            await supabaseAdmin
              .from("projects")
              .update({
                status: "draft",
                progress: 0,
                error_message: body.msg ?? "Échec de la création",
              })
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
          const wavUrl = findString(body, [
            "wavUrl",
            "wav_url",
            "audioUrl",
            "audio_url",
            "downloadUrl",
          ]);
          if (wavUrl && job.project_id) {
            const durableWavUrl = await persistGeneratedAsset(
              supabaseAdmin,
              wavUrl,
              `${job.user_id}/${job.project_id}/master.wav`,
              "audio/wav",
            );
            if (!durableWavUrl) {
              await refundFailedJob();
              await supabaseAdmin
                .from("generation_jobs")
                .update({
                  status: "failed",
                  error_message: "Le fichier WAV n'a pas pu être conservé.",
                })
                .eq("id", job.id);
              return new Response("Storage unavailable", { status: 503 });
            }
            await supabaseAdmin
              .from("projects")
              .update({ wav_url: durableWavUrl })
              .eq("id", job.project_id);
            await supabaseAdmin
              .from("generation_jobs")
              .update({ status: "completed", result: { wavUrl: durableWavUrl } })
              .eq("id", job.id);
          }
          return new Response("ok");
        }

        if (job && job.kind === "video") {
          const videoUrl = findString(body, [
            "videoUrl",
            "video_url",
            "mp4Url",
            "mp4_url",
            "downloadUrl",
          ]);
          if (videoUrl && job.project_id) {
            const durableVideoUrl = await persistGeneratedAsset(
              supabaseAdmin,
              videoUrl,
              `${job.user_id}/${job.project_id}/video.mp4`,
              "video/mp4",
            );
            if (!durableVideoUrl) {
              await refundFailedJob();
              await supabaseAdmin
                .from("generation_jobs")
                .update({ status: "failed", error_message: "La vidéo n'a pas pu être conservée." })
                .eq("id", job.id);
              return new Response("Storage unavailable", { status: 503 });
            }
            await supabaseAdmin
              .from("projects")
              .update({ video_url: durableVideoUrl })
              .eq("id", job.project_id);
            await supabaseAdmin
              .from("generation_jobs")
              .update({ status: "completed", result: { videoUrl: durableVideoUrl } })
              .eq("id", job.id);
          }
          return new Response("ok");
        }

        const vocal = body.data?.vocal_removal_info;
        if (vocal) {
          const durableOriginUrl = await persistGeneratedAsset(
            supabaseAdmin,
            vocal.origin_url,
            `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-original.mp3`,
            "audio/mpeg",
          );
          const durableInstrumentalUrl = await persistGeneratedAsset(
            supabaseAdmin,
            vocal.instrumental_url,
            `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-instrumental.mp3`,
            "audio/mpeg",
          );
          const durableVocalUrl = await persistGeneratedAsset(
            supabaseAdmin,
            vocal.vocal_url,
            `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-vocal.mp3`,
            "audio/mpeg",
          );
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
                  vocalUrl: durableVocalUrl,
                  instrumentalUrl: durableInstrumentalUrl,
                  originUrl: durableOriginUrl,
                },
              })
              .eq("id", row.id);
          }
          if (job) {
            await supabaseAdmin
              .from("generation_jobs")
              .update({
                status: "completed",
                result: {
                  vocalUrl: vocal.vocal_url ?? null,
                  instrumentalUrl: vocal.instrumental_url ?? null,
                },
              })
              .eq("id", job.id);
          }
          return new Response("ok");
        }

        if (job && job.kind === "cover") {
          const coverUrl = body.data?.images?.find((value) => typeof value === "string") ?? null;
          if (coverUrl && job.project_id) {
            const durableCoverUrl = await persistGeneratedAsset(
              supabaseAdmin,
              coverUrl,
              `${job.user_id}/${job.project_id}/cover-generated.jpg`,
              "image/jpeg",
            );
            if (!durableCoverUrl) {
              await refundFailedJob();
              await supabaseAdmin
                .from("generation_jobs")
                .update({
                  status: "failed",
                  error_message: "La pochette n'a pas pu être conservée.",
                })
                .eq("id", job.id);
              return new Response("Storage unavailable", { status: 503 });
            }
            await supabaseAdmin
              .from("projects")
              .update({ image_url: durableCoverUrl, cover_url: durableCoverUrl })
              .eq("id", job.project_id);
            await supabaseAdmin
              .from("generation_jobs")
              .update({ status: "completed", result: { coverUrl: durableCoverUrl } })
              .eq("id", job.id);
          } else if (body.code !== undefined && body.code !== 200) {
            await refundFailedJob();
            await supabaseAdmin
              .from("generation_jobs")
              .update({ status: "failed", error_message: body.msg ?? "Échec de la pochette" })
              .eq("id", job.id);
          }
          return new Response("ok");
        }

        const clip = body.data?.data?.[0];
        const audioUrl = clip?.audio_url ?? clip?.audioUrl ?? null;
        const imageUrl = clip?.image_url ?? clip?.imageUrl ?? null;

        if (body.code !== undefined && body.code !== 200 && !audioUrl) {
          await refundFailedJob();
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
          if (!job?.project_id) return new Response("Job not found", { status: 503 });
          const durableAudioUrl = await persistGeneratedAsset(
            supabaseAdmin,
            audioUrl,
            `${job.user_id}/${job.project_id}/master.mp3`,
            "audio/mpeg",
          );
          const durableImageUrl = job?.project_id
            ? await persistGeneratedAsset(
                supabaseAdmin,
                imageUrl,
                `${job.user_id}/${job.project_id}/cover.jpg`,
                "image/jpeg",
              )
            : imageUrl;
          if (!durableAudioUrl) {
            await refundFailedJob();
            await supabaseAdmin
              .from("projects")
              .update({
                status: "draft",
                progress: 0,
                error_message: "Le fichier audio n'a pas pu être conservé.",
              })
              .eq("id", job.project_id);
            await supabaseAdmin
              .from("generation_jobs")
              .update({
                status: "failed",
                error_message: "Le fichier audio n'a pas pu être conservé.",
              })
              .eq("id", job.id);
            return new Response("Storage unavailable", { status: 503 });
          }
          await supabaseAdmin
            .from("projects")
            .update({
              status: "ready",
              progress: 100,
              audio_url: durableAudioUrl,
              image_url: durableImageUrl,
              cover_url: durableImageUrl,
              suno_audio_id: clip?.id ?? null,
              duration_seconds: clip?.duration ? Math.round(clip.duration) : null,
              error_message: null,
            })
            .eq("suno_task_id", taskId);
          await supabaseAdmin
            .from("generation_jobs")
            .update({
              status: "completed",
              result: { audioUrl: durableAudioUrl, imageUrl: durableImageUrl },
            })
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
