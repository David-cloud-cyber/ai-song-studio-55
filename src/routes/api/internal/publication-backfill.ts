import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

function matchesToken(received: string, expected: string) {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

type BackfillRequest = {
  cutoff?: string;
  limit?: number;
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

        const cutoff =
          body.cutoff ?? process.env.PUBLICATION_BACKFILL_CUTOFF ?? "2026-08-19T00:00:00.000Z";
        const cutoffTime = Date.parse(cutoff);
        if (!Number.isFinite(cutoffTime)) {
          return Response.json({ error: "Date de migration invalide." }, { status: 400 });
        }

        const limit = Math.min(Math.max(Math.trunc(body.limit ?? 100), 1), 250);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { publishProjectAssets } = await import("@/lib/publication.server");
        const { data: projects, error } = await supabaseAdmin
          .from("projects")
          .select("id,created_at,status,archived_at,is_public,publication_status")
          .lt("created_at", new Date(cutoffTime).toISOString())
          .eq("status", "ready")
          .is("archived_at", null)
          .neq("publication_status", "published")
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
          details: [] as Array<{ projectId: string; status: string; reason?: string }>,
        };

        for (const project of projects ?? []) {
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
