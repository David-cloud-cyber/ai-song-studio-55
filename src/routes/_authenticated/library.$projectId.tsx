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
  createProjectCover,
  COSTS,
} from "@/lib/suno.functions";
import {
  ArrowLeft,
  Archive,
  CalendarDays,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  History,
  RotateCcw,
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
  Globe2,
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
  suno_task_id: string | null;
  suno_audio_id: string | null;
  instrumental: boolean;
  model: string | null;
  stems: Stems | null;
  error_message: string | null;
  wav_url: string | null;
  video_url: string | null;
  is_public: boolean;
  published_at: string | null;
  archived_at: string | null;
  parent_project_id: string | null;
  voice: string | null;
  style: string | null;
  created_at: string;
  updated_at: string;
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

const tabs = [
  "Résumé",
  "Audio",
  "Prompt",
  "Paroles",
  "Pistes",
  "Pochette",
  "Vidéo",
  "Exports",
  "Versions",
] as const;

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Audio");
  const [busy, setBusy] = useState<
    null | "extend" | "stems" | "vocals" | "instrumental" | "lyrics" | "wav" | "video" | "cover"
  >(null);
  const [publishing, setPublishing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [archivePromptOpen, setArchivePromptOpen] = useState(false);
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
  const runCover = useServerFn(createProjectCover);

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
        .select("status,kind,error_message,created_at,credits_spent")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{
        status: string;
        kind: string;
        error_message: string | null;
        created_at: string;
        credits_spent: number;
      }>;
    },
    refetchInterval: (q) =>
      (q.state.data as Array<{ status: string }> | undefined)?.some(
        (job) => job.status === "processing",
      )
        ? 5000
        : false,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["project-versions", projectId, project?.parent_project_id],
    enabled: Boolean(project),
    queryFn: async () => {
      const parentQuery = project?.parent_project_id
        ? supabase
            .from("projects")
            .select("id,title,status,created_at,parent_project_id")
            .eq("id", project.parent_project_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null });
      const childrenQuery = supabase
        .from("projects")
        .select("id,title,status,created_at,parent_project_id")
        .eq("parent_project_id", projectId)
        .order("created_at", { ascending: false });
      const [parentResult, childrenResult] = await Promise.all([parentQuery, childrenQuery]);
      if (parentResult.error) throw parentResult.error;
      if (childrenResult.error) throw childrenResult.error;
      return [
        ...(parentResult.data ? [{ ...parentResult.data, relation: "parent" as const }] : []),
        ...(childrenResult.data ?? []).map((item) => ({ ...item, relation: "variant" as const })),
      ];
    },
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
  const isArchived = Boolean(project.archived_at);

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
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      toast.error("Le morceau a besoin d'une petite pause", {
        description: message.includes("crédit")
          ? "Vérifie ton solde puis réessaie."
          : "La création n’a pas abouti. Tes crédits seront rendus si nécessaire.",
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
      setTab("Pistes");
      toast.success("Les pistes se séparent !", {
        description: `${COSTS.stems} crédits utilisés.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      toast.error("Les pistes font une petite pause", {
        description: message.includes("crédit")
          ? "Vérifie ton solde puis réessaie."
          : "La séparation n’a pas abouti. Tes crédits seront rendus si nécessaire.",
      });
    } finally {
      setBusy(null);
    }
  };

  const runDerived = async (
    kind: "vocals" | "instrumental" | "lyrics" | "wav" | "video" | "cover",
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
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      toast.error("Oups, petit contretemps", {
        description: message.includes("crédit")
          ? "Vérifie ton solde puis réessaie."
          : message.includes("copyright") || message.includes("protég")
            ? "Essaie une description plus personnelle, sans reprendre des paroles connues."
            : "Le traitement n’a pas abouti. Tes crédits seront rendus si nécessaire.",
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

  const doCover = () =>
    runDerived(
      "cover",
      () => runCover({ data: { projectId: project.id, requestId: crypto.randomUUID() } }),
      "La nouvelle pochette est en préparation",
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

  const saveTitle = async () => {
    const title = titleDraft.trim();
    if (!title || title === project.title) {
      setEditingTitle(false);
      return;
    }
    const { error } = await supabase.from("projects").update({ title }).eq("id", project.id);
    if (error) {
      toast.error("Le titre n'a pas pu être enregistré", {
        description: "On retente dans un instant.",
      });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["project", project.id] });
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    setEditingTitle(false);
    toast.success("Titre mis à jour");
  };

  const toggleArchive = async () => {
    setArchiving(true);
    const archived = !project.archived_at;
    const { error } = await supabase
      .from("projects")
      .update({
        archived_at: archived ? new Date().toISOString() : null,
        is_public: archived ? false : project.is_public,
        published_at: archived ? null : project.published_at,
      })
      .eq("id", project.id);
    if (error) {
      toast.error("Le projet n'a pas pu être déplacé", {
        description: "On retente dans un instant.",
      });
    } else {
      await queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["public-creations"] });
      toast.success(archived ? "Projet archivé" : "Projet restauré");
      setArchivePromptOpen(false);
      if (archived) window.location.href = "/library";
    }
    setArchiving(false);
  };

  const togglePublic = async () => {
    if (publishing || isArchived || project.status !== "ready" || !project.audio_url) return;
    setPublishing(true);
    const next = !project.is_public;
    const { error } = await supabase
      .from("projects")
      .update({
        is_public: next,
        published_at: next ? new Date().toISOString() : null,
      })
      .eq("id", project.id);

    if (error) {
      toast.error("La galerie n'a pas pu être mise à jour", {
        description: "On retente dans un instant ?",
      });
    } else {
      await queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      await queryClient.invalidateQueries({ queryKey: ["public-creations"] });
      toast.success(next ? "Création publiée dans la galerie" : "Création retirée de la galerie");
    }
    setPublishing(false);
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
              {editingTitle ? (
                <form
                  className="mt-1 flex min-w-0 items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveTitle();
                  }}
                >
                  <input
                    autoFocus
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onBlur={() => void saveTitle()}
                    className="min-w-0 flex-1 rounded-lg border border-primary/40 bg-background px-2 py-1 text-xl font-semibold outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Nouveau titre du projet"
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft(project.title);
                    setEditingTitle(true);
                  }}
                  className="group mt-1 flex max-w-full items-center gap-2 text-left"
                  title="Renommer le projet"
                >
                  <h1 className="truncate text-2xl font-semibold tracking-tight">
                    {project.title}
                  </h1>
                  <Edit3 className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}
              <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {project.mood ?? "—"} · {formatDuration(project.duration_seconds)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void toggleFavorite()}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-surface"
              aria-label={project.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              aria-pressed={project.is_favorite}
            >
              <Heart className={cn("size-4", project.is_favorite && "fill-neon text-neon")} />
            </button>
          </div>

          {project.archived_at && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground">
              <span>Ce projet est archivé. Il n’apparaît plus dans la galerie.</span>
              <button
                type="button"
                onClick={() => void toggleArchive()}
                disabled={archiving}
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-warning/30 px-3 text-xs font-semibold disabled:opacity-50"
              >
                {archiving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="size-3.5" />
                )}
                Restaurer
              </button>
            </div>
          )}

          {!isArchived && archivePromptOpen && (
            <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4">
              <p className="text-sm font-medium text-warning-foreground">Archiver ce projet ?</p>
              <p className="mt-1 text-xs leading-5 text-warning-foreground/80">
                Il quittera ta bibliothèque principale et la galerie publique, mais tu pourras le
                restaurer à tout moment.
              </p>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setArchivePromptOpen(false)}
                  className="min-h-10 rounded-xl border border-warning/30 px-3 text-xs font-semibold text-warning-foreground"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void toggleArchive()}
                  disabled={archiving}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-warning px-3 text-xs font-semibold text-warning-foreground disabled:opacity-50"
                >
                  {archiving && <Loader2 className="size-3.5 animate-spin" />}
                  Confirmer l’archivage
                </button>
              </div>
            </div>
          )}

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

          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              onClick={doExtend}
              disabled={isArchived || !project.suno_audio_id || busy !== null}
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
              disabled={
                isArchived ||
                !project.suno_audio_id ||
                busy !== null ||
                stems?.status === "processing"
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface py-2.5 text-xs font-semibold disabled:opacity-40"
            >
              {busy === "stems" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Scissors className="size-3.5" />
              )}
              Pistes · {COSTS.stems} CR
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={doVocals}
              disabled={isArchived || !project.audio_url || busy !== null}
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
              disabled={isArchived || !project.audio_url || busy !== null}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface py-2.5 text-xs font-semibold disabled:opacity-40"
            >
              {busy === "instrumental" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Music className="size-3.5" />
              )}
              Ajouter instru · {COSTS.addInstrumental} CR
            </button>
            <button
              onClick={doCover}
              disabled={isArchived || !project.suno_task_id || Boolean(cover) || busy !== null}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface py-2.5 text-xs font-semibold disabled:opacity-40"
            >
              {busy === "cover" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Wand2 className="size-3.5" />
              )}
              Pochette
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => void shareProject()}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface py-2.5 text-xs font-semibold"
            >
              <Share2 className="size-3.5" /> Partager
            </button>
            <button
              type="button"
              onClick={() => void togglePublic()}
              disabled={
                isArchived || publishing || project.status !== "ready" || !project.audio_url
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface py-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Globe2 className="size-3.5" />
              )}
              {project.is_public ? "Retirer de la galerie" : "Publier dans la galerie"}
            </button>
            <a
              href={`/create?sourceProjectId=${project.id}&mode=remix`}
              aria-disabled={isArchived}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface py-2.5 text-xs font-semibold",
                isArchived && "pointer-events-none opacity-40",
              )}
            >
              <Wand2 className="size-3.5" /> Remix
            </a>
            <a
              href={`/create?sourceProjectId=${project.id}&mode=recreate`}
              aria-disabled={isArchived}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface py-2.5 text-xs font-semibold",
                isArchived && "pointer-events-none opacity-40",
              )}
            >
              <Copy className="size-3.5" /> Recréer
            </a>
            <a
              href={`/create?sourceProjectId=${project.id}&mode=variant`}
              aria-disabled={isArchived}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface py-2.5 text-xs font-semibold",
                isArchived && "pointer-events-none opacity-40",
              )}
            >
              <Sliders className="size-3.5" /> Variante
            </a>
            <button
              type="button"
              onClick={() => (isArchived ? void toggleArchive() : setArchivePromptOpen(true))}
              disabled={archiving}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface py-2.5 text-xs font-semibold disabled:opacity-50"
            >
              {archiving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Archive className="size-3.5" />
              )}
              {project.archived_at ? "Restaurer" : "Archiver"}
            </button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              onClick={doLyrics}
              disabled={isArchived || busy !== null}
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
              disabled={isArchived || !project.suno_audio_id || busy !== null}
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
              disabled={isArchived || !project.suno_audio_id || busy !== null}
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
          {tab === "Résumé" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard icon={<FileText className="size-4" />} label="Prompt original">
                {project.prompt ?? "Aucun prompt enregistré."}
              </InfoCard>
              <InfoCard icon={<Music className="size-4" />} label="Style">
                {project.style ??
                  ([project.genre, project.mood, project.voice].filter(Boolean).join(" · ") || "—")}
              </InfoCard>
              <InfoCard icon={<CalendarDays className="size-4" />} label="Créé le">
                {new Date(project.created_at).toLocaleString("fr-FR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </InfoCard>
              <InfoCard icon={<History className="size-4" />} label="Dernière mise à jour">
                {new Date(project.updated_at).toLocaleString("fr-FR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </InfoCard>
            </div>
          )}

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

          {tab === "Prompt" && (
            <pre className="whitespace-pre-wrap rounded-2xl border border-white/5 bg-surface p-5 font-sans text-sm leading-relaxed text-zinc-300">
              {project.prompt ?? "Aucun prompt enregistré pour ce projet."}
            </pre>
          )}

          {tab === "Pistes" && (
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

          {tab === "Paroles" &&
            (project.lyrics ? (
              <pre className="whitespace-pre-wrap rounded-2xl border border-white/5 bg-surface p-4 font-sans text-sm leading-relaxed text-zinc-300">
                {project.lyrics}
              </pre>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-400">
                Aucune parole générée pour l’instant. Utilise le bouton Paroles pour en créer.
              </div>
            ))}

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

          {tab === "Vidéo" &&
            (project.video_url ? (
              <video
                controls
                preload="metadata"
                src={project.video_url}
                className="w-full max-w-3xl rounded-2xl border border-white/10 bg-black"
              >
                Ton navigateur ne peut pas lire cette vidéo.
              </video>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-400">
                La vidéo apparaîtra ici après son traitement.
              </div>
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

          {tab === "Versions" && (
            <div className="space-y-3">
              {versions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-400">
                  Les variantes et versions de ce projet apparaîtront ici.
                </div>
              ) : (
                versions.map((version) => (
                  <Link
                    key={version.id}
                    to="/library/$projectId"
                    params={{ projectId: version.id }}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-surface p-4 hover:border-primary/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{version.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {version.relation === "parent" ? "Projet d’origine" : "Version dérivée"} ·{" "}
                        {version.status}
                      </span>
                    </span>
                    <ExternalLink className="size-4 shrink-0 text-primary" />
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </section>
    </PageTransition>
  );
}

function InfoCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-surface p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">
        {children}
      </p>
    </div>
  );
}
