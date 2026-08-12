import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { CoverArt } from "@/components/studio/CoverArt";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { PageTransition } from "@/components/studio/PageTransition";
import { AudioPlayer } from "@/components/studio/AudioPlayer";
import { useProjectSync } from "@/hooks/use-project-sync";
import { extendTrack, separateStems, COSTS } from "@/lib/suno.functions";
import {
  ArrowLeft,
  Share2,
  Wand2,
  Heart,
  Sliders,
  Users,
  Loader2,
  Scissors,
  FastForward,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { soon } from "@/lib/toast";
import { toast } from "sonner";

type Stems = {
  taskId?: string;
  status?: string;
  vocalUrl?: string | null;
  instrumentalUrl?: string | null;
  originUrl?: string | null;
  error?: string | null;
};

type Project = {
  id: string;
  title: string;
  genre: string | null;
  mood: string | null;
  duration_seconds: number | null;
  status: "ready" | "rendering" | "draft";
  cover_gradient: string | null;
  cover_url: string | null;
  image_url: string | null;
  tags: string[];
  prompt: string | null;
  lyrics: string | null;
  is_favorite: boolean;
  progress: number;
  audio_url: string | null;
  suno_audio_id: string | null;
  instrumental: boolean;
  model: string | null;
  stems: Stems | null;
  error_message: string | null;
};

export const Route = createFileRoute("/_authenticated/library/$projectId")({
  head: () => ({
    meta: [
      { title: "Projet · BeatStudio AI" },
      { name: "description", content: "Écoutez, prolongez et séparez les pistes de votre morceau." },
      { property: "og:title", content: "Projet · BeatStudio AI" },
      {
        property: "og:description",
        content: "Lecture audio, extension et séparation voix/instrumental.",
      },
      { property: "og:type", content: "music.song" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  notFoundComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">Projet introuvable.</div>
  ),
  errorComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">
      Impossible de charger ce projet.
    </div>
  ),
  component: ProjectDetail,
});

function formatDuration(sec: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const tabs = ["Audio", "Stems", "Paroles", "Pochette"] as const;

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Audio");
  const [busy, setBusy] = useState<null | "extend" | "stems">(null);
  const queryClient = useQueryClient();
  const runExtend = useServerFn(extendTrack);
  const runStems = useServerFn(separateStems);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    refetchInterval: (q) =>
      (q.state.data as Project | undefined)?.status === "rendering" ? 5000 : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as unknown as Project;
    },
  });

  const stems = project?.stems ?? null;
  const needsSync =
    project?.status === "rendering" || (!!stems?.taskId && stems.status === "processing");
  useProjectSync(project?.id, needsSync);

  if (isLoading || !project) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-400">
        Chargement…
      </div>
    );
  }

  const gradient = project.cover_gradient ?? "from-cyan-400 via-blue-600 to-fuchsia-700";
  const cover = project.image_url ?? project.cover_url;

  const doExtend = async () => {
    setBusy("extend");
    try {
      const res = await runExtend({ data: { projectId: project.id } });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Extension lancée", { description: `${COSTS.extend} crédits débités.` });
      window.location.href = `/library/${res.projectId}`;
    } catch (err) {
      toast.error("Extension impossible", {
        description: err instanceof Error ? err.message : "Réessayez",
      });
    } finally {
      setBusy(null);
    }
  };

  const doStems = async () => {
    setBusy("stems");
    try {
      await runStems({ data: { projectId: project.id } });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setTab("Stems");
      toast.success("Séparation lancée", { description: `${COSTS.stems} crédits débités.` });
    } catch (err) {
      toast.error("Séparation impossible", {
        description: err instanceof Error ? err.message : "Réessayez",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageTransition>
      <div className="px-5 pt-6">
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-zinc-400 hover:text-neon"
        >
          <ArrowLeft className="size-3.5" /> Library
        </Link>
      </div>

      <section className="px-5 pt-4 md:grid md:grid-cols-[minmax(0,340px)_1fr] md:gap-8">
        <div>
          {cover ? (
            <img
              src={cover}
              alt={`Pochette générée pour ${project.title}`}
              className="aspect-square w-full rounded-2xl border border-white/10 object-cover"
              loading="lazy"
            />
          ) : (
            <CoverArt gradient={gradient} className="aspect-square w-full">
              <div className="absolute left-3 top-3">
                <StatusBadge status={project.status} />
              </div>
            </CoverArt>
          )}
        </div>

        <div>
          <div className="mt-5 flex items-start justify-between gap-3 md:mt-0">
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-neon/70">
                {project.instrumental ? "Instrumentale" : (project.genre ?? "Projet")}
                {project.model ? ` · ${project.model.replace("_", ".").toLowerCase()}` : ""}
              </div>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
                {project.title}
              </h1>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {project.mood ?? "—"} · {formatDuration(project.duration_seconds)}
              </p>
            </div>
            <button
              onClick={() => soon()}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-surface"
              aria-label="Favori"
            >
              <Heart className={cn("size-4", project.is_favorite && "fill-neon text-neon")} />
            </button>
          </div>

          {project.status === "rendering" && (
            <div className="mt-4 rounded-2xl border border-neon/25 bg-neon/5 p-4">
              <div className="flex items-center gap-2 text-sm text-neon">
                <Loader2 className="size-4 animate-spin" />
                Génération en cours… {project.progress}%
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-neon transition-all duration-700"
                  style={{ width: `${Math.max(5, project.progress)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Le rendu prend en général 1 à 3 minutes. Vous pouvez quitter cette page.
              </p>
            </div>
          )}

          {project.error_message && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{project.error_message}</span>
            </div>
          )}

          {project.audio_url && (
            <AudioPlayer
              src={project.audio_url}
              seed={project.id}
              downloadName={`${project.title}.mp3`}
              className="mt-4"
            />
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              to="/editor/$projectId"
              params={{ projectId: project.id }}
              className="flex items-center justify-center gap-2 rounded-xl bg-neon py-2.5 text-xs font-semibold text-background"
            >
              <Sliders className="size-3.5" /> Ouvrir l'éditeur
            </Link>
            <Link
              to="/collab"
              className="flex items-center justify-center gap-2 rounded-xl border border-neon/30 bg-neon/10 py-2.5 text-xs font-semibold text-neon"
            >
              <Users className="size-3.5" /> Collab
            </Link>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={doExtend}
              disabled={!project.suno_audio_id || busy !== null}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface py-2.5 text-xs font-semibold disabled:opacity-40"
            >
              {busy === "extend" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FastForward className="size-3.5" />
              )}
              Prolonger · {COSTS.extend} CR
            </button>
            <button
              onClick={doStems}
              disabled={!project.suno_audio_id || busy !== null || stems?.status === "processing"}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface py-2.5 text-xs font-semibold disabled:opacity-40"
            >
              {busy === "stems" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Scissors className="size-3.5" />
              )}
              Stems · {COSTS.stems} CR
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => soon("Partage bientôt disponible")}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface py-2.5 text-xs font-semibold"
            >
              <Share2 className="size-3.5" /> Partager
            </button>
            <Link
              to="/create"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface py-2.5 text-xs font-semibold"
            >
              <Wand2 className="size-3.5" /> Remix
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 px-5">
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-white/5">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "shrink-0 border-b-2 px-3 pb-2.5 pt-1 text-sm transition-colors",
                tab === t ? "border-neon text-neon" : "border-transparent text-zinc-500",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="pt-5">
          {tab === "Audio" && (
            <div className="space-y-3">
              {project.audio_url ? (
                <AudioPlayer
                  src={project.audio_url}
                  seed={project.id}
                  label="Master"
                  downloadName={`${project.title}.mp3`}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-400">
                  {project.status === "rendering"
                    ? "L'audio apparaîtra ici dès la fin du rendu."
                    : "Aucun audio pour ce projet."}
                </div>
              )}
            </div>
          )}

          {tab === "Stems" && (
            <div className="space-y-3">
              {stems?.status === "processing" && (
                <div className="flex items-center gap-2 rounded-2xl border border-neon/25 bg-neon/5 p-4 text-sm text-neon">
                  <Loader2 className="size-4 animate-spin" /> Séparation des pistes en cours…
                </div>
              )}
              {stems?.status === "failed" && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {stems.error ?? "La séparation a échoué."}
                </div>
              )}
              {stems?.vocalUrl && (
                <AudioPlayer
                  src={stems.vocalUrl}
                  seed={`${project.id}v`}
                  label="Voix"
                  downloadName={`${project.title} - voix.mp3`}
                />
              )}
              {stems?.instrumentalUrl && (
                <AudioPlayer
                  src={stems.instrumentalUrl}
                  seed={`${project.id}i`}
                  label="Instrumental"
                  downloadName={`${project.title} - instrumental.mp3`}
                />
              )}
              {!stems && (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-400">
                  Lancez une séparation pour extraire la voix et l'instrumental ({COSTS.stems}{" "}
                  crédits).
                </div>
              )}
            </div>
          )}

          {tab === "Paroles" && (
            <pre className="whitespace-pre-wrap rounded-2xl border border-white/5 bg-surface p-4 font-sans text-sm leading-relaxed text-zinc-300">
              {project.lyrics ?? project.prompt ?? "Aucune parole générée pour l'instant."}
            </pre>
          )}

          {tab === "Pochette" &&
            (cover ? (
              <img
                src={cover}
                alt={`Pochette de ${project.title}`}
                className="aspect-square w-full max-w-md rounded-2xl border border-white/10 object-cover"
                loading="lazy"
              />
            ) : (
              <CoverArt gradient={gradient} title={project.title} className="aspect-square" />
            ))}
        </div>
      </section>
    </PageTransition>
  );
}
