import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPaidPlan } from "@/lib/plans";

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
    const { publishProjectAssets, unpublishProjectAssets } =
      await import("@/lib/publication.server");

    if (!data.isPublic) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("plan,subscription_status,subscription_expires_at")
        .eq("id", userId)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!isPaidPlan(profile)) {
        throw new Error("Les créations gratuites restent visibles dans la galerie Loopster.");
      }
      await unpublishProjectAssets(supabaseAdmin, project.id);
      return { isPublic: false };
    }

    if (project.status !== "ready" || !(project.audio_path ?? project.audio_url)) {
      throw new Error("Le morceau doit être terminé avant sa publication.");
    }

    const result = await publishProjectAssets(supabaseAdmin, project.id);
    if (result.status !== "published" && result.status !== "already_published") {
      throw new Error(result.reason);
    }
    return { isPublic: true };
  });

export const archiveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .select("id,is_public,public_audio_url,public_image_url,public_wav_url,public_video_url")
      .eq("id", data.projectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!project) throw new Error("Projet introuvable.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (
      project.is_public ||
      project.public_audio_url ||
      project.public_image_url ||
      project.public_wav_url ||
      project.public_video_url
    ) {
      const { unpublishProjectAssets } = await import("@/lib/publication.server");
      await unpublishProjectAssets(supabaseAdmin, project.id);
    }

    const { error: archiveError } = await supabase
      .from("projects")
      .update({
        archived_at: new Date().toISOString(),
        is_public: false,
        published_at: null,
      })
      .eq("id", project.id)
      .eq("user_id", userId);
    if (archiveError) throw archiveError;
    return { archived: true };
  });
