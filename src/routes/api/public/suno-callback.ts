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
  data?:
    | {
        callbackType?: string;
        task_id?: string;
        taskId?: string;
        data?: CallbackClip[];
        vocal_removal_info?: {
          origin_url?: string | null;
          instrumental_url?: string | null;
          vocal_url?: string | null;
          backing_vocals_url?: string | null;
          drums_url?: string | null;
          bass_url?: string | null;
          guitar_url?: string | null;
          keyboard_url?: string | null;
          percussion_url?: string | null;
          strings_url?: string | null;
          synth_url?: string | null;
          fx_url?: string | null;
          brass_url?: string | null;
          woodwinds_url?: string | null;
        };
        images?: string[];
        [key: string]: unknown;
      }
    | string
    | null;
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

        const callbackData = body.data && typeof body.data === "object" ? body.data : null;
        const callbackType =
          callbackData && typeof callbackData.callbackType === "string"
            ? callbackData.callbackType
            : null;
        // Suno peut envoyer plusieurs étapes pour une même tâche. Une étape
        // intermédiaire ne doit ni rembourser ni clôturer le job prématurément.
        const isFinalCallback = !callbackType || callbackType === "complete";
        // Suno retourne normalement l'identifiant dans `data`, mais certains
        // traitements (notamment les paroles) peuvent le placer au niveau
        // racine. Une recherche récursive évite de laisser un job bloqué.
        const taskId = findString(body, ["taskId", "task_id"]);
        if (!taskId) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { persistGeneratedAsset } = await import("@/lib/persist-generated-asset.server");

        const { data: job } = await supabaseAdmin
          .from("generation_jobs")
          .select("id,project_id,user_id,kind,status,credits_spent,credits_refunded,payload")
          .eq("suno_task_id", taskId)
          .maybeSingle();

        const isFailure = body.code !== undefined && body.code !== 200;
        if (job?.status === "completed") return new Response("ok");

        const refundFailedJob = async () => {
          if (!job || job.credits_spent <= 0 || job.credits_refunded >= job.credits_spent) return;
          const { error: refundError } = await supabaseAdmin.rpc("refund_generation_job", {
            _job_id: job.id,
            _reason: "Remboursement · génération échouée",
          });
          if (refundError) throw refundError;
        };

        if (job && isFailure) {
          await refundFailedJob();
          await supabaseAdmin
            .from("generation_jobs")
            .update({ status: "failed", error_message: body.msg ?? "Échec Suno" })
            .eq("id", job.id);
          if (job.project_id) {
            if (job.kind === "cover") {
              await supabaseAdmin
                .from("projects")
                .update({
                  cover_generation_status: "failed",
                  cover_error: body.msg ?? "Échec de la pochette",
                })
                .eq("id", job.project_id);
            } else {
              await supabaseAdmin
                .from("projects")
                .update({
                  status: "draft",
                  progress: 0,
                  error_message: body.msg ?? "Échec de la création",
                })
                .eq("id", job.project_id);
            }
          }
          return new Response("ok");
        }

        if (job && job.kind === "voice-profile") {
          const voiceId = findString(body, ["voiceId", "voice_id"]);
          const payload = (job.payload ?? {}) as {
            voiceProfileId?: string;
            sourceAssetPath?: string;
            verifyAssetPath?: string;
          };
          if (!voiceId || !payload.voiceProfileId) return new Response("ok");
          const { checkVoiceAvailability } = await import("@/lib/suno.server");
          let available = false;
          for (let attempt = 0; attempt < 3 && !available; attempt += 1) {
            try {
              available = (await checkVoiceAvailability(taskId)).isAvailable;
            } catch {
              available = false;
            }
            if (!available && attempt < 2)
              await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          await supabaseAdmin
            .from("voice_profiles")
            .update({
              provider_voice_id: voiceId,
              status: available ? "ready" : "checking",
              error_message: available ? null : "La voix est encore en préparation.",
            })
            .eq("id", payload.voiceProfileId)
            .eq("user_id", job.user_id);
          if (available) {
            const sourcePaths = [payload.sourceAssetPath, payload.verifyAssetPath].filter(
              (path): path is string => Boolean(path),
            );
            if (sourcePaths.length > 0)
              await supabaseAdmin.storage.from("voice-sources").remove(sourcePaths);
          }
          await supabaseAdmin
            .from("generation_jobs")
            .update({
              status: available ? "completed" : "processing",
              result: { voiceId, available },
            })
            .eq("id", job.id);
          return new Response("ok");
        }

        if (job && job.kind === "voice-validation") {
          const phrase = findString(body, [
            "validateInfo",
            "validationPhrase",
            "validation_phrase",
            "phrase",
          ]);
          const payload = (job.payload ?? {}) as { voiceProfileId?: string };
          if (!phrase || !payload.voiceProfileId) return new Response("ok");
          await supabaseAdmin
            .from("voice_profiles")
            .update({
              validation_task_id: taskId,
              validation_phrase: phrase,
              status: "awaiting_recording",
            })
            .eq("id", payload.voiceProfileId)
            .eq("user_id", job.user_id);
          await supabaseAdmin
            .from("generation_jobs")
            .update({ status: "completed", result: { validationPhrase: phrase } })
            .eq("id", job.id);
          return new Response("ok");
        }

        if (job && job.kind === "persona") {
          const personaId = findString(body, ["personaId", "persona_id"]);
          const payload = (job.payload ?? {}) as { personaId?: string };
          if (!personaId || !payload.personaId) return new Response("ok");
          await supabaseAdmin
            .from("music_personas")
            .update({ provider_persona_id: personaId, status: "ready", error_message: null })
            .eq("id", payload.personaId)
            .eq("user_id", job.user_id);
          await supabaseAdmin
            .from("generation_jobs")
            .update({ status: "completed", result: { personaId } })
            .eq("id", job.id);
          return new Response("ok");
        }

        if (job && job.kind === "lyrics") {
          const lyrics =
            (typeof body.data === "string" ? body.data : null) ??
            findString(body, ["lyrics", "lyric", "text", "content"]) ??
            body.msg ??
            null;
          if (lyrics && job.project_id) {
            await supabaseAdmin.from("projects").update({ lyrics }).eq("id", job.project_id);
            await supabaseAdmin
              .from("lyrics_versions")
              .update({ is_active: false })
              .eq("project_id", job.project_id);
            await supabaseAdmin.from("lyrics_versions").insert({
              project_id: job.project_id,
              content: lyrics,
              source: "generated",
              is_active: true,
              created_by: job.user_id,
            });
            await supabaseAdmin
              .from("generation_jobs")
              .update({ status: "completed", result: { lyrics } })
              .eq("id", job.id);
          } else if (isFinalCallback) {
            await refundFailedJob();
            await supabaseAdmin
              .from("generation_jobs")
              .update({
                status: "failed",
                error_message: body.msg ?? "Les paroles sont introuvables",
              })
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
            const durableWavPath = await persistGeneratedAsset(
              supabaseAdmin,
              wavUrl,
              `${job.user_id}/${job.project_id}/master.wav`,
              "audio/wav",
            );
            if (!durableWavPath) {
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
              .update({ wav_path: durableWavPath, wav_url: null, public_wav_url: null })
              .eq("id", job.project_id);
            await supabaseAdmin
              .from("generation_jobs")
              .update({ status: "completed", result: { wavPath: durableWavPath } })
              .eq("id", job.id);
          } else if (isFinalCallback) {
            await refundFailedJob();
            await supabaseAdmin
              .from("generation_jobs")
              .update({
                status: "failed",
                error_message: body.msg ?? "Le fichier WAV est introuvable",
              })
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
            const durableVideoPath = await persistGeneratedAsset(
              supabaseAdmin,
              videoUrl,
              `${job.user_id}/${job.project_id}/video.mp4`,
              "video/mp4",
            );
            if (!durableVideoPath) {
              await refundFailedJob();
              await supabaseAdmin
                .from("generation_jobs")
                .update({ status: "failed", error_message: "La vidéo n'a pas pu être conservée." })
                .eq("id", job.id);
              return new Response("Storage unavailable", { status: 503 });
            }
            await supabaseAdmin
              .from("projects")
              .update({ video_path: durableVideoPath, video_url: null, public_video_url: null })
              .eq("id", job.project_id);
            await supabaseAdmin
              .from("generation_jobs")
              .update({ status: "completed", result: { videoPath: durableVideoPath } })
              .eq("id", job.id);
          } else if (isFinalCallback) {
            await refundFailedJob();
            await supabaseAdmin
              .from("generation_jobs")
              .update({ status: "failed", error_message: body.msg ?? "La vidéo est introuvable" })
              .eq("id", job.id);
          }
          return new Response("ok");
        }

        const vocal = callbackData?.vocal_removal_info;
        const isStemJob = Boolean(
          job && ["stems", "advanced-stems", "full-stems"].includes(job.kind),
        );
        if (vocal || isStemJob) {
          const originUrl = vocal?.origin_url ?? findString(body, ["originUrl", "origin_url"]);
          const instrumentalUrl =
            vocal?.instrumental_url ?? findString(body, ["instrumentalUrl", "instrumental_url"]);
          const vocalUrl = vocal?.vocal_url ?? findString(body, ["vocalUrl", "vocal_url"]);
          const backingVocalsUrl =
            vocal?.backing_vocals_url ??
            findString(body, ["backingVocalsUrl", "backing_vocals_url"]);
          const drumsUrl = vocal?.drums_url ?? findString(body, ["drumsUrl", "drums_url"]);
          const bassUrl = vocal?.bass_url ?? findString(body, ["bassUrl", "bass_url"]);
          const guitarUrl = vocal?.guitar_url ?? findString(body, ["guitarUrl", "guitar_url"]);
          const keyboardUrl =
            vocal?.keyboard_url ?? findString(body, ["keyboardUrl", "keyboard_url"]);
          const percussionUrl =
            vocal?.percussion_url ?? findString(body, ["percussionUrl", "percussion_url"]);
          const stringsUrl = vocal?.strings_url ?? findString(body, ["stringsUrl", "strings_url"]);
          const synthUrl = vocal?.synth_url ?? findString(body, ["synthUrl", "synth_url"]);
          const fxUrl = vocal?.fx_url ?? findString(body, ["fxUrl", "fx_url"]);
          const brassUrl = vocal?.brass_url ?? findString(body, ["brassUrl", "brass_url"]);
          const woodwindsUrl =
            vocal?.woodwinds_url ?? findString(body, ["woodwindsUrl", "woodwinds_url"]);
          if (
            !originUrl &&
            !instrumentalUrl &&
            !vocalUrl &&
            !backingVocalsUrl &&
            !drumsUrl &&
            !bassUrl &&
            !guitarUrl &&
            !keyboardUrl &&
            !percussionUrl &&
            !stringsUrl &&
            !synthUrl &&
            !fxUrl &&
            !brassUrl &&
            !woodwindsUrl
          ) {
            if (isFinalCallback && job) {
              await refundFailedJob();
              await supabaseAdmin
                .from("generation_jobs")
                .update({
                  status: "failed",
                  error_message: body.msg ?? "Les pistes séparées sont introuvables",
                })
                .eq("id", job.id);
              if (job.project_id) {
                await supabaseAdmin
                  .from("projects")
                  .update({
                    stems: { taskId, status: "failed", error: body.msg ?? "Pistes introuvables" },
                  })
                  .eq("id", job.project_id);
              }
            }
            return new Response("ok");
          }
          const durableOriginUrl = await persistGeneratedAsset(
            supabaseAdmin,
            originUrl,
            `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-original.mp3`,
            "audio/mpeg",
          );
          const durableInstrumentalUrl = await persistGeneratedAsset(
            supabaseAdmin,
            instrumentalUrl,
            `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-instrumental.mp3`,
            "audio/mpeg",
          );
          const durableVocalUrl = await persistGeneratedAsset(
            supabaseAdmin,
            vocalUrl,
            `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-vocal.mp3`,
            "audio/mpeg",
          );
          const extraStemUrls = {
            backingVocalsUrl: await persistGeneratedAsset(
              supabaseAdmin,
              backingVocalsUrl,
              `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-backing-vocals.mp3`,
              "audio/mpeg",
            ),
            drumsUrl: await persistGeneratedAsset(
              supabaseAdmin,
              drumsUrl,
              `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-drums.mp3`,
              "audio/mpeg",
            ),
            bassUrl: await persistGeneratedAsset(
              supabaseAdmin,
              bassUrl,
              `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-bass.mp3`,
              "audio/mpeg",
            ),
            guitarUrl: await persistGeneratedAsset(
              supabaseAdmin,
              guitarUrl,
              `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-guitar.mp3`,
              "audio/mpeg",
            ),
            keyboardUrl: await persistGeneratedAsset(
              supabaseAdmin,
              keyboardUrl,
              `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-keyboard.mp3`,
              "audio/mpeg",
            ),
            percussionUrl: await persistGeneratedAsset(
              supabaseAdmin,
              percussionUrl,
              `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-percussion.mp3`,
              "audio/mpeg",
            ),
            stringsUrl: await persistGeneratedAsset(
              supabaseAdmin,
              stringsUrl,
              `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-strings.mp3`,
              "audio/mpeg",
            ),
            synthUrl: await persistGeneratedAsset(
              supabaseAdmin,
              synthUrl,
              `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-synth.mp3`,
              "audio/mpeg",
            ),
            fxUrl: await persistGeneratedAsset(
              supabaseAdmin,
              fxUrl,
              `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-fx.mp3`,
              "audio/mpeg",
            ),
            brassUrl: await persistGeneratedAsset(
              supabaseAdmin,
              brassUrl,
              `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-brass.mp3`,
              "audio/mpeg",
            ),
            woodwindsUrl: await persistGeneratedAsset(
              supabaseAdmin,
              woodwindsUrl,
              `${job?.user_id ?? "system"}/${job?.project_id ?? taskId}/stems-woodwinds.mp3`,
              "audio/mpeg",
            ),
          };
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
                  ...extraStemUrls,
                },
              })
              .eq("id", row.id);
            const trackEntries: Array<[string, string, string | null]> = [
              ["vocals", "Voix", durableVocalUrl],
              ["instrumental", "Instrumental", durableInstrumentalUrl],
              ["backing-vocals", "Chœurs", extraStemUrls.backingVocalsUrl],
              ["drums", "Batterie", extraStemUrls.drumsUrl],
              ["bass", "Basse", extraStemUrls.bassUrl],
              ["guitar", "Guitare", extraStemUrls.guitarUrl],
              ["keyboard", "Claviers", extraStemUrls.keyboardUrl],
              ["percussion", "Percussions", extraStemUrls.percussionUrl],
              ["strings", "Cordes", extraStemUrls.stringsUrl],
              ["synth", "Synthé", extraStemUrls.synthUrl],
              ["fx", "FX", extraStemUrls.fxUrl],
              ["brass", "Cuivres", extraStemUrls.brassUrl],
              ["woodwinds", "Bois", extraStemUrls.woodwindsUrl],
            ];
            await supabaseAdmin.from("project_tracks").insert(
              trackEntries
                .filter((entry): entry is [string, string, string] => Boolean(entry[2]))
                .map(([role, label, assetUrl], sortOrder) => ({
                  project_id: row.id,
                  role,
                  label,
                  asset_url: assetUrl,
                  sort_order: sortOrder,
                })),
            );
          }
          if (job) {
            await supabaseAdmin
              .from("generation_jobs")
              .update({
                status: "completed",
                result: {
                  vocalUrl: vocalUrl ?? null,
                  instrumentalUrl: instrumentalUrl ?? null,
                  ...extraStemUrls,
                },
              })
              .eq("id", job.id);
          }
          return new Response("ok");
        }

        if (job && job.kind === "cover") {
          const coverUrl = callbackData?.images?.find((value) => typeof value === "string") ?? null;
          if (coverUrl && job.project_id) {
            const durableCoverPath = await persistGeneratedAsset(
              supabaseAdmin,
              coverUrl,
              `${job.user_id}/${job.project_id}/cover-generated.jpg`,
              "image/jpeg",
            );
            if (!durableCoverPath) {
              await refundFailedJob();
              await supabaseAdmin
                .from("generation_jobs")
                .update({
                  status: "failed",
                  error_message: "La pochette n'a pas pu être conservée.",
                })
                .eq("id", job.id);
              await supabaseAdmin
                .from("projects")
                .update({
                  cover_generation_status: "failed",
                  cover_error: "La pochette n’a pas pu être conservée.",
                })
                .eq("id", job.project_id);
              return new Response("Storage unavailable", { status: 503 });
            }
            const { data: previousProject } = await supabaseAdmin
              .from("projects")
              .select("is_public,publication_policy")
              .eq("id", job.project_id)
              .maybeSingle();
            const { error: coverUpdateError } = await supabaseAdmin
              .from("projects")
              .update({
                image_path: durableCoverPath,
                image_url: null,
                cover_url: null,
                public_image_url: null,
                cover_source: "ai",
                cover_generation_status: "ready",
                cover_error: null,
              })
              .eq("id", job.project_id);
            if (coverUpdateError) throw coverUpdateError;
            const { registerActiveCoverVersion, updateProviderCoverMetadata } =
              await import("@/lib/provider-cover.server");
            await updateProviderCoverMetadata(supabaseAdmin, job.project_id, {
              provider_cover_status: "pending",
              provider_cover_error: null,
            });
            await registerActiveCoverVersion(supabaseAdmin, job.project_id, durableCoverPath, "ai");
            if (
              previousProject?.is_public ||
              previousProject?.publication_policy === "automatic_free"
            ) {
              try {
                const { publishProjectAssets } = await import("@/lib/publication.server");
                await publishProjectAssets(supabaseAdmin, job.project_id);
              } catch {
                // The project remains private until the normal publication retry.
              }
            }
            await supabaseAdmin
              .from("generation_jobs")
              .update({ status: "completed", result: { coverPath: durableCoverPath } })
              .eq("id", job.id);
          } else {
            if (isFinalCallback) {
              await refundFailedJob();
              await supabaseAdmin
                .from("generation_jobs")
                .update({
                  status: "failed",
                  error_message: body.msg ?? "La pochette est introuvable",
                })
                .eq("id", job.id);
              if (job.project_id) {
                await supabaseAdmin
                  .from("projects")
                  .update({
                    cover_generation_status: "failed",
                    cover_error: body.msg ?? "La pochette est introuvable",
                  })
                  .eq("id", job.project_id);
              }
            }
          }
          return new Response("ok");
        }

        const clip = callbackData?.data?.[0];
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
          const durableAudioPath = await persistGeneratedAsset(
            supabaseAdmin,
            audioUrl,
            `${job.user_id}/${job.project_id}/master.mp3`,
            "audio/mpeg",
          );
          const providerImagePath = job?.project_id
            ? await persistGeneratedAsset(
                supabaseAdmin,
                imageUrl,
                `${job.user_id}/${job.project_id}/cover.jpg`,
                "image/jpeg",
              )
            : imageUrl;
          if (!durableAudioPath) {
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
          let durableImagePath = providerImagePath;
          let coverSource = providerImagePath ? "provider" : "default";
          if (!durableImagePath) {
            const { ensureProjectCover } = await import("@/lib/default-cover.server");
            const fallback = await ensureProjectCover(supabaseAdmin, {
              id: job.project_id,
              user_id: job.user_id,
              title: clip?.title ?? "Nouveau morceau",
              genre: null,
            });
            durableImagePath = fallback.path;
            coverSource = fallback.source === "provider" ? "provider" : "default";
          }
          const { error: projectUpdateError } = await supabaseAdmin
            .from("projects")
            .update({
              status: "ready",
              progress: 100,
              audio_path: durableAudioPath,
              audio_url: null,
              image_path: durableImagePath,
              image_url: null,
              cover_url: null,
              cover_source: coverSource,
              cover_generation_status: "ready",
              cover_error: null,
              public_audio_url: null,
              public_image_url: null,
              is_public: false,
              publication_status: "not_required",
              publication_error: null,
              publication_attempts: 0,
              publication_last_attempt_at: null,
              suno_audio_id: clip?.id ?? null,
              duration_seconds: clip?.duration ? Math.round(clip.duration) : null,
              error_message: null,
            })
            .eq("suno_task_id", taskId);
          if (projectUpdateError) throw projectUpdateError;
          const { registerActiveCoverVersion, updateProviderCoverMetadata } =
            await import("@/lib/provider-cover.server");
          await updateProviderCoverMetadata(supabaseAdmin, job.project_id, {
            provider_cover_status: providerImagePath ? "synced" : "pending",
            provider_cover_attempts: 0,
            provider_cover_last_attempt_at: null,
            provider_cover_error: providerImagePath ? null : "Pochette fournisseur à récupérer.",
          });
          await registerActiveCoverVersion(
            supabaseAdmin,
            job.project_id,
            durableImagePath,
            coverSource,
          );
          try {
            const { autoPublishFreeProject } = await import("@/lib/publication.server");
            await autoPublishFreeProject(supabaseAdmin, job.project_id);
          } catch {
            // La création reste disponible dans la bibliothèque; la reprise
            // automatique réessaiera lors de la prochaine ouverture du studio.
          }
          const { data: latestVersion } = await supabaseAdmin
            .from("project_versions")
            .select("version_number")
            .eq("project_id", job.project_id)
            .order("version_number", { ascending: false })
            .limit(1)
            .maybeSingle();
          const { data: createdVersion } = await supabaseAdmin
            .from("project_versions")
            .insert({
              project_id: job.project_id,
              version_number: (latestVersion?.version_number ?? 0) + 1,
              label: job.kind === "replace-section" ? "Section remplacée" : "Version générée",
              prompt: clip?.prompt ?? null,
              audio_url: durableAudioPath,
              cover_url: durableImagePath,
              created_by: job.user_id,
            })
            .select("id")
            .maybeSingle();
          if (createdVersion?.id) {
            await supabaseAdmin
              .from("projects")
              .update({ active_version_id: createdVersion.id })
              .eq("id", job.project_id);
            await supabaseAdmin.from("project_tracks").insert({
              project_id: job.project_id,
              version_id: createdVersion.id,
              role: "master",
              label: "Master audio",
              asset_url: durableAudioPath,
              end_seconds: clip?.duration ?? null,
            });
          }
          await supabaseAdmin
            .from("generation_jobs")
            .update({
              status: "completed",
              result: { audioPath: durableAudioPath, imagePath: durableImagePath },
            })
            .eq("suno_task_id", taskId);
        } else if (!isFinalCallback) {
          await supabaseAdmin
            .from("projects")
            .update({ progress: callbackData?.callbackType === "first" ? 75 : 45 })
            .eq("suno_task_id", taskId);
        } else if (job) {
          await refundFailedJob();
          await supabaseAdmin
            .from("projects")
            .update({
              status: "draft",
              progress: 0,
              error_message: body.msg ?? "Le fichier audio est introuvable",
            })
            .eq("suno_task_id", taskId);
          await supabaseAdmin
            .from("generation_jobs")
            .update({
              status: "failed",
              error_message: body.msg ?? "Le fichier audio est introuvable",
            })
            .eq("id", job.id);
        }

        return new Response("ok");
      },
    },
  },
});
