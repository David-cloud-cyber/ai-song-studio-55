import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { isPaidPlan } from "@/lib/plans";
import { CoverArt } from "@/components/studio/CoverArt";
import { AudioPlayer } from "@/components/studio/AudioPlayer";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed · Loopster" },
      {
        name: "description",
        content: "Écoutez les créations publiées par la communauté Loopster.",
      },
    ],
  }),
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
  const { data: projects = [], isLoading } = useQuery({
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
    <PageTransition>
      <section className="px-5 pb-2 pt-8">
        <SectionHeader eyebrow="Créations publiques" title="Galerie Loopster" />
      </section>
      <div className="space-y-4 px-5 pb-6">
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-400">
            Chargement de la galerie…
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <p className="text-sm text-zinc-300">Aucune création à afficher.</p>
            <Link
              to="/create"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-neon px-4 py-2 text-xs font-semibold text-background"
            >
              <Sparkles className="size-3.5" /> Créer un morceau
            </Link>
          </div>
        ) : (
          projects.map((project) => (
            <article
              key={project.id}
              className="overflow-hidden rounded-2xl border border-white/5 bg-surface"
            >
              <div className="flex items-center gap-3 p-3">
                <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-600 text-xs font-semibold text-background">
                  VO
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{project.creator_name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    {new Date(project.created_at).toLocaleDateString("fr-FR")}
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
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                      {project.genre ?? "Projet"} · {duration(project.duration_seconds)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs text-neon">
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
  );
}
