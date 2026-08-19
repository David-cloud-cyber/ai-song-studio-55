import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FREE_PUBLICATION_NOTICE_VERSION } from "@/lib/publication";

export const acknowledgeFreePublicationNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ version: z.string().min(1).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        free_publication_notice_seen_at: new Date().toISOString(),
        free_publication_notice_version: data.version,
      })
      .eq("id", userId);
    if (error) throw error;
    return { version: data.version };
  });

export const retryPendingPublications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({}).parse(input))
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { retryFreePublicationsForUser } = await import("@/lib/publication.server");
    return retryFreePublicationsForUser(supabaseAdmin, context.userId);
  });

export { FREE_PUBLICATION_NOTICE_VERSION };
