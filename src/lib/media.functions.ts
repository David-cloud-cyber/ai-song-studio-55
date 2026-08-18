import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const setProjectVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), isPublic: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .select(
        "id,user_id,status,audio_url,audio_path,image_url,image_path,cover_url,wav_url,wav_path,video_url,video_path,public_audio_url,public_image_url,public_wav_url,public_video_url",
      )
      .eq("id", data.projectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!project) throw new Error("Projet introuvable.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { publishGeneratedAsset, removePublishedAsset } =
      await import("@/lib/persist-generated-asset.server");

    if (!data.isPublic) {
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
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          is_public: false,
          published_at: null,
          public_audio_url: null,
          public_image_url: null,
          public_wav_url: null,
          public_video_url: null,
        })
        .eq("id", project.id)
        .eq("user_id", userId);
      if (updateError) throw updateError;
      return { isPublic: false };
    }

    if (project.status !== "ready" || !(project.audio_path ?? project.audio_url)) {
      throw new Error("Le morceau doit être terminé avant sa publication.");
    }

    const audioUrl = await publishGeneratedAsset(
      supabaseAdmin,
      project.audio_path ?? project.audio_url,
      "audio/mpeg",
    );
    if (!audioUrl) throw new Error("Le fichier audio ne peut pas encore être publié.");

    const [imageUrl, wavUrl, videoUrl] = await Promise.all([
      publishGeneratedAsset(
        supabaseAdmin,
        project.image_path ?? project.image_url ?? project.cover_url,
        "image/jpeg",
      ),
      publishGeneratedAsset(supabaseAdmin, project.wav_path ?? project.wav_url, "audio/wav"),
      publishGeneratedAsset(supabaseAdmin, project.video_path ?? project.video_url, "video/mp4"),
    ]);
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        is_public: true,
        published_at: new Date().toISOString(),
        public_audio_url: audioUrl,
        public_image_url: imageUrl,
        public_wav_url: wavUrl,
        public_video_url: videoUrl,
      })
      .eq("id", project.id)
      .eq("user_id", userId);
    if (updateError) throw updateError;
    return { isPublic: true };
  });
