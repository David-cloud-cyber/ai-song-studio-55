import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { CoverArt } from "@/components/studio/CoverArt";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { PageTransition } from "@/components/studio/PageTransition";
import { AudioPlayer } from "@/components/studio/AudioPlayer";
import { useProjectSync } from "@/hooks/use-project-sync";
import { useProfile } from "@/hooks/use-profile";
import { isPaidPlan } from "@/lib/plans";
import {
  extendTrack,
  separateStems,
  addVocalsToProject,
  addInstrumentalToProject,
  generateProjectLyrics,
  convertProjectToWav,
  createProjectVideo,
  COSTS,
} from "@/lib/suno.functions";
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
  Mic2,
  Music,
  FileAudio,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  wav_url: string | null;
  video_url: string | null;
};

export const Route = createFileRoute("/_authenticated/library/$projectId")({
  head: () => ({
    meta: [
      { title: "Projet · Loopster" },
      {
        name: "description",
        content: "Écoutez, prolongez et séparez les pistes de votre morceau.",
      },
      { property: "og:title", content: "Projet · Loopster" },
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
      Oups, ce morceau joue à cache-cache. Réessaie dans un instant.
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

const tabs = ["Audio", "Stems", "Paroles", "Pochette", "Exports"] as const;

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Audio");
  const [busy, setBusy] = useState<
    null | "extend" | "stems" | "vocals" | "instrumental" | "lyrics" | "wav" | "video"
  >(null);
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const canDownload = isPaidPlan(profile);
  const runExtend = useServerFn(extendTrack);
  const runStems = useServerFn(separateStems);
  const runVocals = useServerFn(addVocalsToProject);
  const runInstrumental = useServerFn(addInstrumentalToProject);
  const runLyrics = useServerFn(generateProjectLyrics);
  const runWav = useServerFn(convertProjectToWav);
  const runVideo = useServerFn(createProjectVideo);

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

  const { data: jobs = [] } = useQuery({
    queryKey: ["generation-jobs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generation_jobs")
        .select("status,kind,error_message")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{ status: string; kind: string; error_message: string | null }>;
    },
    refetchInterval: (q) =>
      (q.state.data as Array<{ status: string }> | undefined)?.some(
        (job) => job.status === "processing",
      )
        ? 5000
        : false,
  });

  useEffect(() => {
    if (jobs.some((job) => job.status !== "processing")) {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    }
  }, [jobs, projectId, queryClient]);

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
      const res = await runExtend({
        data: { projectId: project.id, requestId: crypto.randomUUID() },
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Le morceau continue !", { description: `${COSTS.extend} crédits utilisés.` });
      window.location.href = `/library/${res.projectId}`;
    } catch {
      toast.error("Le morceau a besoin d'une petite pause", {
        description: "On retente dans un instant ?",
      });
    } finally {
      setBusy(null);
    }
  };

  const doStems = async () => {
    setBusy("stems");
    try {
      await runStems({ data: { projectId: project.id, requestId: crypto.randomUUID() } });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setTab("Stems");
      toast.success("Les pistes se séparent !", {
        description: `${COSTS.stems} crédits utilisés.`,
      });
    } catch {
      toast.error("Les pistes font une petite pause", {
        description: "On retente dans un instant ?",
      });
    } finally {
      setBusy(null);
    }
  };

  const runDerived = async (
    kind: "vocals" | "instrumental" | "lyrics" | "wav" | "video",
    action: () => Promise<unknown>,
    message: string,
  ) => {
    setBusy(kind);
    try {
      const result = await action();
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(message);
      if (kind === "vocals" || kind === "instrumental") {
        const child = result as { projectId?: string };
        if (child.projectId) window.location.href = `/library/${child.projectId}`;
      }
    } catch {
      toast.error("Oups, petit contretemps", {
        description: "On retente dans un instant ?",
      });
    } finally {
      setBusy(null);
    }
  };

  const doVocals = () =>
    runDerived(
      "vocals",
      () =>
        runVocals({
          data: {
            projectId: project.id,
            prompt: project.prompt ?? "Voix expressive et mélodique",
            requestId: crypto.randomUUID(),
          },
        }),
      "Ajout des voix lancé",
    );

  const doInstrumental = () =>
    runDerived(
      "instrumental",
      () => runInstrumental({ data: { projectId: project.id, requestId: crypto.randomUUID() } }),
      "Ajout instrumental lancé",
    );

  const doLyrics = () =>
    runDerived(
      "lyrics",
      () =>
        runLyrics({
          data: {
            projectId: project.id,
            prompt: project.prompt ?? `Paroles pour ${project.title}`,
            requestId: crypto.randomUUID(),
          },
        }),
      "Génération des paroles lancée",
    );

  const doWav = () =>
    runDerived(
      "wav",
      () => runWav({ data: { projectId: project.id, requestId: crypto.randomUUID() } }),
      "Conversion WAV lancée",
    );

  const doVideo = () =>
    runDerived(
      "video",
      () => runVideo({ data: { projectId: project.id, requestId: crypto.randomUUID() } }),
      "Création vidéo lancée",
    );

  const toggleFavorite = async () => {
    const { error } = await supabase
      .from("projects")
      .update({ is_favorite: !project.is_favorite })
      .eq("id", project.id);
    if (error) {
      toast.error("Le favori n'a pas pu être enregistré", {
        description: "On retente dans un instant ?",
      });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["project", project.id] });
  };

  const shareProject = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: project.title,
          text: "Écoutez ce morceau créé avec Loopster",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Lien copié");
      }
    } catch {
      // L'utilisateur peut annuler le partage natif sans afficher d'erreur.
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
              onClick={() => void toggleFavorite()}
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
              <span>
                Oups, ce morceau a rencontré un petit contretemps. Relance la création pour
                réessayer.
              </span>
            </div>
          )}

          {project.audio_url && (
            <AudioPlayer
              src={project.audio_url}
              seed={project.id}
              downloadName={`${project.title}.mp3`}
              canDownload={canDownload}
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
              onClick={doVocals}
              disabled={!project.audio_url || busy !== null}
              className="flex items-center justify-center gap-2 rounded-xl border border-neon/20 bg-neon/5 py-2.5 text-xs font-semibold text-neon disabled:opacity-40"
            >
              {busy === "vocals" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Mic2 className="size-3.5" />
              )}
              Ajouter voix · {COSTS.vocals} CR
            </button>
            <button
              onClick={doInstrumental}
              disabled={!project.audio_url || busy !== null}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface py-2.5 text-xs font-semibold disabled:opacity-40"
            >
              {busy === "instrumental" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Music className="size-3.5" />
              )}
              Ajouter instru · {COSTS.addInstrumental} CR
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => void shareProject()}
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

          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              onClick={doLyrics}
              disabled={busy !== null}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-surface py-2.5 text-[11px] font-semibold disabled:opacity-40"
            >
              {busy === "lyrics" ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Wand2 className="size-3" />
              )}{" "}
              Paroles
            </button>
            <button
              onClick={doWav}
              disabled={!project.suno_audio_id || busy !== null}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-surface py-2.5 text-[11px] font-semibold disabled:opacity-40"
            >
              {busy === "wav" ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <FileAudio className="size-3" />
              )}{" "}
              WAV
            </button>
            <button
              onClick={doVideo}
              disabled={!project.suno_audio_id || busy !== null}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-surface py-2.5 text-[11px] font-semibold disabled:opacity-40"
            >
              {busy === "video" ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Video className="size-3" />
              )}{" "}
              Vidéo
            </button>
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
                  canDownload={canDownload}
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
                  Les pistes n'ont pas fini leur petite danse. Réessaie dans un instant.
                </div>
              )}
              {stems?.vocalUrl && (
                <AudioPlayer
                  src={stems.vocalUrl}
                  seed={`${project.id}v`}
                  label="Voix"
                  downloadName={`${project.title} - voix.mp3`}
                  canDownload={canDownload}
                />
              )}
              {stems?.instrumentalUrl && (
                <AudioPlayer
                  src={stems.instrumentalUrl}
                  seed={`${project.id}i`}
                  label="Instrumental"
                  downloadName={`${project.title} - instrumental.mp3`}
                  canDownload={canDownload}
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

          {tab === "Exports" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {canDownload && project.audio_url && (
                <a
                  href={project.audio_url}
                  download={`${project.title}.mp3`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-surface p-4 text-sm font-semibold hover:border-neon/30"
                >
                  <span>Master MP3</span>
                  <FileAudio className="size-4 text-neon" />
                </a>
              )}
              {canDownload && project.wav_url && (
                <a
                  href={project.wav_url}
                  download={`${project.title}.wav`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-surface p-4 text-sm font-semibold hover:border-neon/30"
                >
                  <span>Master WAV</span>
                  <FileAudio className="size-4 text-neon" />
                </a>
              )}
              {canDownload && project.video_url && (
                <a
                  href={project.video_url}
                  download={`${project.title}.mp4`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-surface p-4 text-sm font-semibold hover:border-neon/30"
                >
                  <span>Clip MP4</span>
                  <Video className="size-4 text-neon" />
                </a>
              )}
              {!canDownload && (
                <a
                  href="/credits"
                  className="flex items-center justify-between rounded-2xl border border-neon/20 bg-neon/5 p-4 text-sm font-semibold text-neon hover:bg-neon/10 sm:col-span-2"
                >
                  <span>Passe à une formule payante pour télécharger tes créations ✨</span>
                  <FileAudio className="size-4 shrink-0" />
                </a>
              )}
              {canDownload && !project.wav_url && !project.video_url && (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-zinc-400 sm:col-span-2">
                  Les exports WAV et vidéo apparaîtront ici après leur traitement.
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
