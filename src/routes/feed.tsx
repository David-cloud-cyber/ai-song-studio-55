import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { isPaidPlan } from "@/lib/plans";
import { CoverArt } from "@/components/studio/CoverArt";
import { AudioPlayer } from "@/components/studio/AudioPlayer";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingShell } from "@/components/marketing/MarketingPrimitives";
import { RefreshCw, Sparkles } from "lucide-react";
import { publicSeo, seoHead } from "@/lib/seo";

export const Route = createFileRoute("/feed")({
  head: () => seoHead({ ...publicSeo.gallery, path: "/feed" }),
  component: FeedPage,
});

type FeedProject = {
  id: string;
  title: string;
  genre: string | null;
  duration_seconds: number | null;
  cover_url: string | null;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
  published_at: string | null;
  creator_name: string;
};

const fallbackGradient = "from-cyan-400 via-blue-600 to-fuchsia-700";

function duration(seconds: number | null) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function FeedPage() {
  const { data: profile } = useProfile();
  const canDownload = isPaidPlan(profile);
  const {
    data: projects = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["public-creations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_creations")
        .select(
          "id,title,genre,duration_seconds,cover_url,image_url,audio_url,created_at,published_at,creator_name",
        )
        .order("published_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as FeedProject[];
    },
  });

  return (
    <MarketingShell>
      <MarketingNav />
      <main className="min-h-screen px-4 pb-16 pt-[84px] sm:px-6 sm:pt-24">
        <PageTransition>
          <section className="mx-auto max-w-7xl pb-8">
            <SectionHeader
              eyebrow="Créations publiques"
              title="Galerie Loopster"
              description="Écoute les morceaux que les créateurs ont choisi de partager avec la communauté."
            />
          </section>
          <div className="mx-auto grid max-w-7xl gap-4 pb-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3 xl:col-span-4">
                Chargement de la galerie…
              </div>
            ) : isError ? (
              <div className="rounded-2xl border border-dashed border-danger/40 bg-danger/5 p-10 text-center sm:col-span-2 lg:col-span-3 xl:col-span-4">
                <p className="text-sm text-danger">La galerie fait une petite pause.</p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-danger/30 px-4 py-2 text-xs font-semibold text-danger"
                >
                  <RefreshCw className="size-3.5" /> Réessayer
                </button>
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center sm:col-span-2 lg:col-span-3 xl:col-span-4">
                <p className="text-sm text-muted-foreground">
                  Aucune création à afficher pour le moment.
                </p>
                <Link
                  to="/auth"
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  <Sparkles className="size-3.5" /> Créer un morceau
                </Link>
              </div>
            ) : (
              projects.map((project) => (
                <article
                  key={project.id}
                  className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface"
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-600 text-xs font-semibold text-background">
                      {project.creator_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{project.creator_name}</div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {new Date(project.published_at ?? project.created_at).toLocaleDateString(
                          "fr-FR",
                        )}
                      </div>
                    </div>
                  </div>
                  {project.image_url || project.cover_url ? (
                    <img
                      src={project.image_url ?? project.cover_url ?? undefined}
                      alt={`Pochette de ${project.title}`}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <CoverArt gradient={fallbackGradient} className="aspect-[4/3] rounded-none" />
                  )}
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">{project.title}</h3>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {project.genre ?? "Projet"} · {duration(project.duration_seconds)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-primary">
                        Public
                      </span>
                    </div>
                    {project.audio_url && (
                      <AudioPlayer
                        src={project.audio_url}
                        seed={project.id}
                        label="Écouter"
                        canDownload={canDownload}
                        className="mt-3"
                      />
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </PageTransition>
      </main>
      <MarketingFooter />
    </MarketingShell>
  );
}
