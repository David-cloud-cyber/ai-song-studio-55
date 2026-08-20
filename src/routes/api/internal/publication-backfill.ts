import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

function matchesToken(received: string, expected: string) {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

type BackfillRequest = {
  mode?: "publication" | "provider-covers";
  cutoff?: string;
  limit?: number;
  retryFailed?: boolean;
};

export const Route = createFileRoute("/api/internal/publication-backfill")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedToken = process.env.PUBLICATION_BACKFILL_TOKEN;
        const receivedToken = request.headers.get("x-publication-backfill-token") ?? "";
        if (!expectedToken || !matchesToken(receivedToken, expectedToken)) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: BackfillRequest = {};
        try {
          body = (await request.json()) as BackfillRequest;
        } catch {
          // Un body vide utilise les valeurs par défaut contrôlées côté serveur.
        }

        const limit = Math.min(Math.max(Math.trunc(body.limit ?? 100), 1), 250);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (body.mode === "provider-covers") {
          const { syncProviderCoverForProject } = await import("@/lib/provider-cover.server");
          let query = supabaseAdmin
            .from("projects")
            .select(
              "id,user_id,title,status,archived_at,image_path,image_url,cover_url,cover_source,provider_cover_status,provider_cover_attempts,suno_task_id,is_public,publication_status,public_image_url",
            )
            .order("created_at", { ascending: true })
            .limit(limit);
          query = body.retryFailed
            ? query.in("provider_cover_status", ["pending", "failed"])
            : query.eq("provider_cover_status", "pending");

          const { data: projects, error } = await query;
          if (error) throw error;

          const report = {
            mode: "provider-covers" as const,
            scanned: projects?.length ?? 0,
            synced: 0,
            alreadySynced: 0,
            pending: 0,
            unavailable: 0,
            failed: 0,
            publicRefreshed: 0,
            details: [] as Array<{ projectId: string; status: string; reason?: string }>,
            hasMore: (projects?.length ?? 0) === limit,
          };

          for (const project of projects ?? []) {
            const result = await syncProviderCoverForProject(supabaseAdmin, project);
            if (result.status === "synced") report.synced += 1;
            else if (result.status === "already_synced") report.alreadySynced += 1;
            else if (result.status === "pending") report.pending += 1;
            else if (result.status === "unavailable") report.unavailable += 1;
            else report.failed += 1;
            if (result.publicRefreshed) report.publicRefreshed += 1;
            report.details.push({
              projectId: result.projectId,
              status: result.status,
              ...(result.reason ? { reason: result.reason } : {}),
            });
          }

          return Response.json(report);
        }

        const cutoff =
          body.cutoff ?? process.env.PUBLICATION_BACKFILL_CUTOFF ?? "2026-08-19T00:00:00.000Z";
        const cutoffTime = Date.parse(cutoff);
        if (!Number.isFinite(cutoffTime)) {
          return Response.json({ error: "Date de migration invalide." }, { status: 400 });
        }

        const { publishProjectAssets } = await import("@/lib/publication.server");
        const { ensureProjectCover } = await import("@/lib/default-cover.server");
        const { data: projects, error } = await supabaseAdmin
          .from("projects")
          .select(
            "id,user_id,title,genre,created_at,status,archived_at,is_public,publication_status,image_path,image_url,cover_url",
          )
          .lt("created_at", new Date(cutoffTime).toISOString())
          .is("archived_at", null)
          .order("created_at", { ascending: true })
          .limit(limit);
        if (error) throw error;

        const report = {
          cutoff: new Date(cutoffTime).toISOString(),
          scanned: projects?.length ?? 0,
          published: 0,
          alreadyPublic: 0,
          skipped: 0,
          failed: 0,
          coversCreated: 0,
          coversExisting: 0,
          coverFailures: 0,
          details: [] as Array<{ projectId: string; status: string; reason?: string }>,
        };

        for (const project of projects ?? []) {
          let coverReady = true;
          try {
            const cover = await ensureProjectCover(supabaseAdmin, project);
            if (cover.source === "existing") report.coversExisting += 1;
            else report.coversCreated += 1;
          } catch (error) {
            coverReady = false;
            report.coverFailures += 1;
            report.details.push({
              projectId: project.id,
              status: "cover_failed",
              reason: error instanceof Error ? error.message : "Pochette indisponible",
            });
          }
          if (!coverReady) {
            report.skipped += 1;
            continue;
          }
          if (project.status !== "ready" || project.archived_at) continue;
          // Les créations de la phase de test sont publiées indépendamment de la
          // formule actuelle. La règle ne concerne que les nouvelles créations.
          const { error: policyError } = await supabaseAdmin
            .from("projects")
            .update({ publication_policy: "automatic_free" })
            .eq("id", project.id);
          if (policyError) throw policyError;

          const result = await publishProjectAssets(supabaseAdmin, project.id);
          if (result.status === "published") report.published += 1;
          else if (result.status === "already_published") report.alreadyPublic += 1;
          else if (result.status === "skipped") report.skipped += 1;
          else report.failed += 1;
          report.details.push({
            projectId: project.id,
            status: result.status,
            ...(result.status !== "published" && result.status !== "already_published"
              ? { reason: result.reason }
              : {}),
          });
        }

        return Response.json(report);
      },
    },
  },
});
