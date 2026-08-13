import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
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
      { name: "description", content: "Retrouvez vos créations récentes dans Loopster." },
    ],
  }),
  component: FeedPage,
});

type FeedProject = {
  id: string;
  title: string;
  genre: string | null;
  duration_seconds: number | null;
  status: string;
  cover_gradient: string | null;
  audio_url: string | null;
  created_at: string;
};

const fallbackGradient = "from-cyan-400 via-blue-600 to-fuchsia-700";

function duration(seconds: number | null) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function FeedPage() {
  const { user } = useSession();
  const { data: profile } = useProfile();
  const canDownload = isPaidPlan(profile);
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["feed-projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,genre,duration_seconds,status,cover_gradient,audio_url,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as FeedProject[];
    },
  });

  return (
    <PageTransition>
      <section className="px-5 pb-2 pt-8">
        <SectionHeader eyebrow="Vos créations" title="Feed" />
      </section>
      <div className="space-y-4 px-5 pb-6">
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-400">
            Chargement de vos créations…
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <p className="text-sm text-zinc-300">Aucune création à afficher.</p>
            <Link to="/create" className="mt-4 inline-flex items-center gap-2 rounded-full bg-neon px-4 py-2 text-xs font-semibold text-background">
              <Sparkles className="size-3.5" /> Créer un morceau
            </Link>
          </div>
        ) : (
          projects.map((project) => (
            <article key={project.id} className="overflow-hidden rounded-2xl border border-white/5 bg-surface">
              <div className="flex items-center gap-3 p-3">
                <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-600 text-xs font-semibold text-background">
                  VO
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Votre création</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    {new Date(project.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </div>
              <Link to="/library/$projectId" params={{ projectId: project.id }}>
                {project.cover_gradient ? (
                  <CoverArt gradient={project.cover_gradient} className="aspect-[4/3] rounded-none" />
                ) : (
                  <CoverArt gradient={fallbackGradient} className="aspect-[4/3] rounded-none" />
                )}
              </Link>
              <div className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{project.title}</h3>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                      {project.genre ?? "Projet"} · {duration(project.duration_seconds)} · {project.status}
                    </p>
                  </div>
                  <Link to="/library/$projectId" params={{ projectId: project.id }} className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs text-neon">
                    Ouvrir
                  </Link>
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
