import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Download,
  FileAudio,
  Film,
  ListMusic,
  Loader2,
  Mic2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { isPaidPlan } from "@/lib/plans";
import {
  COSTS,
  addInstrumentalToProject,
  addVocalsToProject,
  convertProjectToWav,
  createProjectCover,
  createProjectVideo,
  extendTrack,
  generateProjectLyrics,
  separateStems,
} from "@/lib/suno.functions";
import { PageTransition } from "@/components/studio/PageTransition";
import { AudioPlayer } from "@/components/studio/AudioPlayer";
import { CoverArt } from "@/components/studio/CoverArt";
import { useProjectSync } from "@/hooks/use-project-sync";
import { TimelineEditor } from "@/components/studio/TimelineEditor";
import {
  createPersonaOperation,
  replaceProjectSection,
  separateStemsAdvanced,
} from "@/lib/advanced-music.functions";

export const Route = createFileRoute("/_authenticated/editor/$projectId")({
  head: () => ({
    meta: [
      { title: "Éditeur · Loopster" },
      {
        name: "description",
        content: "Écoute, améliore et exporte une création réelle Loopster.",
      },
    ],
  }),
  component: EditorPage,
});

type StemState = {
  taskId?: string;
  status?: string;
  mode?: string;
  vocalUrl?: string | null;
  instrumentalUrl?: string | null;
  backingVocalsUrl?: string | null;
  drumsUrl?: string | null;
  bassUrl?: string | null;
  guitarUrl?: string | null;
  keyboardUrl?: string | null;
  percussionUrl?: string | null;
  stringsUrl?: string | null;
  synthUrl?: string | null;
  fxUrl?: string | null;
  brassUrl?: string | null;
  woodwindsUrl?: string | null;
};

function friendlyError(value: string | null | undefined) {
  const message = (value ?? "").toLowerCase();
  if (message.includes("copyright") || message.includes("protég")) {
    return "Essaie une description plus personnelle, sans reprendre des paroles connues.";
  }
  if (message.includes("trop de temps") || message.includes("timeout")) {
    return "Le traitement a pris plus de temps que prévu. Tes crédits ont été rendus.";
  }
  return "Le traitement n’a pas abouti. Tes crédits ont été rendus si nécessaire.";
}

function EditorPage() {
  const { projectId } = Route.useParams();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const canDownload = isPaidPlan(profile);
  const [busy, setBusy] = useState<string | null>(null);
  const runExtend = useServerFn(extendTrack);
  const runStems = useServerFn(separateStems);
  const runVocals = useServerFn(addVocalsToProject);
  const runInstrumental = useServerFn(addInstrumentalToProject);
  const runCover = useServerFn(createProjectCover);
  const runLyrics = useServerFn(generateProjectLyrics);
  const runWav = useServerFn(convertProjectToWav);
  const runVideo = useServerFn(createProjectVideo);
  const runAdvancedStems = useServerFn(separateStemsAdvanced);
  const runReplaceSection = useServerFn(replaceProjectSection);
  const runPersona = useServerFn(createPersonaOperation);

  const { data: project, isLoading } = useQuery({
    queryKey: ["editor-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id,title,prompt,genre,model,status,cover_gradient,image_url,cover_url,audio_url,wav_url,video_url,lyrics,stems,duration_seconds,progress,suno_task_id,suno_audio_id,error_message,edit_state",
        )
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
    refetchInterval: (query) =>
      query.state.data?.status === "rendering" ||
      (query.state.data?.stems as StemState | null)?.status === "processing"
        ? 5000
        : false,
  });

  const { data: timelineTracks = [] } = useQuery({
    queryKey: ["project-tracks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tracks")
        .select("id,label,role,asset_url,muted,solo,gain,fade_in_seconds,fade_out_seconds")
        .eq("project_id", projectId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: timelineSections = [] } = useQuery({
    queryKey: ["project-sections", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_sections")
        .select("id,label,section_type,start_seconds,end_seconds")
        .eq("project_id", projectId)
        .order("start_seconds");
      if (error) throw error;
      return data;
    },
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["generation-jobs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generation_jobs")
        .select("kind,status,error_message")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{ kind: string; status: string; error_message: string | null }>;
    },
    refetchInterval: (query) =>
      (query.state.data as Array<{ status: string }> | undefined)?.some(
        (job) => job.status === "pending" || job.status === "processing",
      )
        ? 4000
        : false,
  });

  useEffect(() => {
    if (jobs.some((job) => job.status === "pending" || job.status === "processing")) {
      void queryClient.invalidateQueries({ queryKey: ["editor-project", projectId] });
    }
  }, [jobs, projectId, queryClient]);

  const projectStems = (project?.stems as StemState | null) ?? null;
  useProjectSync(
    project?.id,
    project?.status === "rendering" || projectStems?.status === "processing",
  );

  if (isLoading || !project) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-400">
        Chargement…
      </div>
    );
  }

  const stems = projectStems;
  const latestJob = (kind: string) => jobs.find((job) => job.kind === kind);
  const jobIsRunning = (kind: string) => {
    const status = latestJob(kind)?.status;
    return status === "pending" || status === "processing";
  };
  const cover = project.image_url ?? project.cover_url;
  const gradient = project.cover_gradient ?? "from-cyan-400 via-blue-600 to-fuchsia-700";
  const duration = project.duration_seconds
    ? `${Math.floor(project.duration_seconds / 60)}:${String(project.duration_seconds % 60).padStart(2, "0")}`
    : "—";

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["editor-project", project.id] }),
      queryClient.invalidateQueries({ queryKey: ["project", project.id] }),
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
      queryClient.invalidateQueries({ queryKey: ["music-personas"] }),
    ]);
  };

  const run = async (name: string, action: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(name);
    try {
      await action();
      await refresh();
      toast.success(success);
    } catch (error) {
      toast.error("Cette action n'a pas pu démarrer", {
        description: friendlyError(error instanceof Error ? error.message : null),
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-5 px-5 pb-10 pt-6 md:px-0">
        <div className="flex items-center gap-3">
          <Link
            to="/library/$projectId"
            params={{ projectId: project.id }}
            className="grid size-9 place-items-center rounded-full border border-white/10 bg-surface text-zinc-300 hover:text-neon"
            aria-label="Retour au projet"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon">
              Éditeur Loopster
            </p>
            <h1 className="truncate text-xl font-semibold">{project.title}</h1>
          </div>
          <span className="rounded-full border border-white/10 bg-surface px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            {project.status === "ready"
              ? "Prêt"
              : project.status === "rendering"
                ? "En préparation"
                : "Brouillon"}
          </span>
        </div>

        {project.error_message && (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger-foreground">
            <p className="font-semibold">Cette action n’a pas abouti.</p>
            <p className="mt-1 text-danger-foreground/80">{friendlyError(project.error_message)}</p>
            <Link
              to="/create"
              className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-danger/30 px-3 text-xs font-semibold text-danger-foreground"
            >
              Recommencer une création
            </Link>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-white/5 bg-surface">
              <div className="relative">
                {cover ? (
                  <img
                    src={cover}
                    alt={`Pochette de ${project.title}`}
                    className="aspect-[16/8] w-full object-cover"
                  />
                ) : (
                  <CoverArt gradient={gradient} className="aspect-[16/8] rounded-none" />
                )}
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
                  <div className="rounded-xl bg-background/75 px-3 py-2 backdrop-blur">
                    <p className="text-sm font-semibold">{project.genre ?? "Création Loopster"}</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                      {duration}
                    </p>
                  </div>
                  {project.model && (
                    <span className="rounded-full bg-background/75 px-2.5 py-1 font-mono text-[10px] text-zinc-300 backdrop-blur">
                      {project.model}
                    </span>
                  )}
                </div>
              </div>
              {project.audio_url ? (
                <AudioPlayer
                  src={project.audio_url}
                  seed={project.id}
                  label="Master audio"
                  downloadName={`${project.title}.mp3`}
                  canDownload={canDownload}
                  className="m-3"
                />
              ) : (
                <p className="p-5 text-sm text-zinc-400">
                  Ton aperçu audio apparaîtra ici dès que la création sera prête.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-white/5 bg-surface p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <ListMusic className="size-4 text-neon" />
                <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300">
                  Prompt original
                </h2>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">
                {project.prompt ?? "Aucun prompt enregistré pour ce projet."}
              </p>
            </section>

            {project.audio_url && (
              <TimelineEditor
                projectId={project.id}
                audioUrl={project.audio_url}
                duration={project.duration_seconds ?? 180}
                initialState={(project.edit_state as Record<string, unknown> | null) ?? null}
                initialTracks={timelineTracks}
                initialSections={timelineSections}
                onReplaceSection={(start, end, prompt) =>
                  run(
                    "replace-section",
                    () =>
                      runReplaceSection({
                        data: {
                          projectId: project.id,
                          sectionStart: start,
                          sectionEnd: end,
                          prompt,
                          requestId: crypto.randomUUID(),
                        },
                      }),
                    "La nouvelle section est en préparation",
                  )
                }
              />
            )}

            <section className="rounded-2xl border border-white/5 bg-surface p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <ListMusic className="size-4 text-neon" />
                <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300">
                  Outils disponibles
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ActionCard
                  icon={<Wand2 className="size-4" />}
                  title="Prolonger le morceau"
                  description={`${COSTS.extend} crédits · crée une nouvelle version`}
                  busy={busy === "extend"}
                  disabled={!project.suno_audio_id}
                  onClick={() =>
                    run(
                      "extend",
                      async () => {
                        const result = await runExtend({
                          data: { projectId: project.id, requestId: crypto.randomUUID() },
                        });
                        window.location.href = `/library/${result.projectId}`;
                      },
                      "La nouvelle version est en préparation",
                    )
                  }
                />
                <ActionCard
                  icon={<Wand2 className="size-4" />}
                  title="Créer un persona"
                  description={`${COSTS.persona} crédits · réutiliser ce style`}
                  busy={busy === "persona"}
                  disabled={!project.suno_task_id}
                  onClick={() => {
                    const name = window.prompt("Donne un nom à ce persona");
                    if (!name?.trim()) return;
                    void run(
                      "persona",
                      () =>
                        runPersona({
                          data: {
                            projectId: project.id,
                            name: name.trim(),
                            requestId: crypto.randomUUID(),
                          },
                        }),
                      "Le persona est en préparation",
                    );
                  }}
                />
                <ActionCard
                  icon={<ListMusic className="size-4" />}
                  title="Séparer les pistes"
                  description={`${COSTS.stems} crédits · voix et instrumental`}
                  busy={busy === "stems"}
                  disabled={!project.suno_audio_id || stems?.status === "processing"}
                  onClick={() =>
                    run(
                      "stems",
                      () =>
                        runStems({
                          data: { projectId: project.id, requestId: crypto.randomUUID() },
                        }),
                      "La séparation des pistes est lancée",
                    )
                  }
                />
                <ActionCard
                  icon={<ListMusic className="size-4" />}
                  title="Séparation avancée"
                  description={`${COSTS.advancedStems} crédits · pistes détaillées`}
                  busy={busy === "advanced-stems"}
                  disabled={!project.suno_audio_id || stems?.status === "processing"}
                  onClick={() =>
                    run(
                      "advanced-stems",
                      () =>
                        runAdvancedStems({
                          data: {
                            projectId: project.id,
                            mode: "advanced",
                            requestId: crypto.randomUUID(),
                          },
                        }),
                      "La séparation avancée est lancée",
                    )
                  }
                />
                <ActionCard
                  icon={<ListMusic className="size-4" />}
                  title="Toutes les pistes"
                  description={`${COSTS.fullStems} crédits · séparation complète`}
                  busy={busy === "full-stems"}
                  disabled={!project.suno_audio_id || stems?.status === "processing"}
                  onClick={() =>
                    run(
                      "full-stems",
                      () =>
                        runAdvancedStems({
                          data: {
                            projectId: project.id,
                            mode: "full",
                            requestId: crypto.randomUUID(),
                          },
                        }),
                      "La séparation complète est lancée",
                    )
                  }
                />
                <ActionCard
                  icon={<Mic2 className="size-4" />}
                  title="Ajouter une voix"
                  description={`${COSTS.vocals} crédits · crée une version chantée`}
                  busy={busy === "vocals"}
                  disabled={!project.audio_url}
                  onClick={() =>
                    run(
                      "vocals",
                      async () => {
                        const result = await runVocals({
                          data: {
                            projectId: project.id,
                            prompt: project.prompt ?? `Voix expressive pour ${project.title}`,
                            requestId: crypto.randomUUID(),
                          },
                        });
                        window.location.href = `/library/${result.projectId}`;
                      },
                      "L’ajout de voix est en préparation",
                    )
                  }
                />
                <ActionCard
                  icon={<FileAudio className="size-4" />}
                  title="Ajouter un instrumental"
                  description={`${COSTS.addInstrumental} crédits · crée une version instru`}
                  busy={busy === "instrumental"}
                  disabled={!project.audio_url}
                  onClick={() =>
                    run(
                      "instrumental",
                      async () => {
                        const result = await runInstrumental({
                          data: { projectId: project.id, requestId: crypto.randomUUID() },
                        });
                        window.location.href = `/library/${result.projectId}`;
                      },
                      "L’instrumental est en préparation",
                    )
                  }
                />
                <ActionCard
                  icon={<FileAudio className="size-4" />}
                  title="Préparer un WAV"
                  description={
                    jobIsRunning("wav")
                      ? "Préparation en cours…"
                      : project.wav_url
                        ? "Fichier WAV disponible"
                        : `${COSTS.wav} crédits · export haute qualité`
                  }
                  busy={busy === "wav" || jobIsRunning("wav")}
                  disabled={
                    !project.suno_audio_id || Boolean(project.wav_url) || jobIsRunning("wav")
                  }
                  onClick={() =>
                    run(
                      "wav",
                      () =>
                        runWav({ data: { projectId: project.id, requestId: crypto.randomUUID() } }),
                      "La conversion WAV est lancée",
                    )
                  }
                />
                <ActionCard
                  icon={<Wand2 className="size-4" />}
                  title="Créer une pochette"
                  description={
                    jobIsRunning("cover")
                      ? "Préparation en cours…"
                      : project.image_url || project.cover_url
                        ? "Pochette disponible"
                        : "Gratuit · 2 styles visuels"
                  }
                  busy={jobIsRunning("cover")}
                  disabled={
                    !project.suno_task_id ||
                    Boolean(project.image_url || project.cover_url) ||
                    jobIsRunning("cover")
                  }
                  onClick={() =>
                    run(
                      "cover",
                      () =>
                        runCover({
                          data: { projectId: project.id, requestId: crypto.randomUUID() },
                        }),
                      "La pochette est en préparation",
                    )
                  }
                />
                <ActionCard
                  icon={<Film className="size-4" />}
                  title="Créer une vidéo"
                  description={
                    jobIsRunning("video")
                      ? "Préparation en cours…"
                      : project.video_url
                        ? "Vidéo disponible"
                        : `${COSTS.video} crédits · clip synchronisé`
                  }
                  busy={busy === "video" || jobIsRunning("video")}
                  disabled={
                    !project.suno_audio_id || Boolean(project.video_url) || jobIsRunning("video")
                  }
                  onClick={() =>
                    run(
                      "video",
                      () =>
                        runVideo({
                          data: { projectId: project.id, requestId: crypto.randomUUID() },
                        }),
                      "La vidéo est en préparation",
                    )
                  }
                />
              </div>
            </section>

            {(stems?.status === "ready" || stems?.vocalUrl || stems?.instrumentalUrl) && (
              <section className="space-y-3 rounded-2xl border border-white/5 bg-surface p-4 sm:p-5">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300">
                  Pistes séparées
                </h2>
                {stems.vocalUrl && (
                  <AudioPlayer
                    src={stems.vocalUrl}
                    seed={`${project.id}-vocal`}
                    label="Voix"
                    canDownload={canDownload}
                    downloadName={`${project.title}-voix.mp3`}
                  />
                )}
                {stems.instrumentalUrl && (
                  <AudioPlayer
                    src={stems.instrumentalUrl}
                    seed={`${project.id}-instrumental`}
                    label="Instrumental"
                    canDownload={canDownload}
                    downloadName={`${project.title}-instrumental.mp3`}
                  />
                )}
                {[
                  ["Chœurs", stems.backingVocalsUrl],
                  ["Batterie", stems.drumsUrl],
                  ["Basse", stems.bassUrl],
                  ["Guitare", stems.guitarUrl],
                  ["Claviers", stems.keyboardUrl],
                  ["Percussions", stems.percussionUrl],
                  ["Cordes", stems.stringsUrl],
                  ["Synthé", stems.synthUrl],
                  ["FX", stems.fxUrl],
                  ["Cuivres", stems.brassUrl],
                  ["Bois", stems.woodwindsUrl],
                ].map(
                  ([label, url]) =>
                    url && (
                      <AudioPlayer
                        key={String(label)}
                        src={String(url)}
                        seed={`${project.id}-${label}`}
                        label={String(label)}
                        canDownload={canDownload}
                        downloadName={`${project.title}-${label}.mp3`}
                      />
                    ),
                )}
              </section>
            )}

            {project.lyrics ? (
              <section className="rounded-2xl border border-white/5 bg-surface p-5">
                <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300">
                  Paroles
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">
                  {project.lyrics}
                </p>
              </section>
            ) : (
              <section className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-surface p-5">
                <div>
                  <h2 className="text-sm font-semibold">Créer les paroles</h2>
                  <p className="mt-1 text-xs text-zinc-400">
                    Une version de paroles sera ajoutée à ce projet.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    run(
                      "lyrics",
                      () =>
                        runLyrics({
                          data: {
                            projectId: project.id,
                            prompt: project.prompt ?? `Paroles pour ${project.title}`,
                            requestId: crypto.randomUUID(),
                          },
                        }),
                      "Les paroles sont en préparation",
                    )
                  }
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-neon/30 bg-neon/10 px-3 text-xs font-semibold text-neon disabled:opacity-50"
                >
                  {busy === "lyrics" && <Loader2 className="size-3.5 animate-spin" />}
                  Générer
                </button>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-white/5 bg-surface p-5">
              <h2 className="text-sm font-semibold">Exporter ta création</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Écoute gratuitement dans Loopster. L’export reste réservé aux formules payantes.
              </p>
              {!canDownload && (
                <Link
                  to="/credits"
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-neon px-4 text-sm font-semibold text-background"
                >
                  Débloquer les exports
                </Link>
              )}
              {canDownload && project.audio_url && (
                <a
                  href={project.audio_url}
                  download={`${project.title}.mp3`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-neon px-4 text-sm font-semibold text-background"
                >
                  <Download className="size-4" /> Télécharger le MP3
                </a>
              )}
              {project.wav_url && canDownload && (
                <a
                  href={project.wav_url}
                  download={`${project.title}.wav`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-zinc-200"
                >
                  <FileAudio className="size-4" /> Télécharger le WAV
                </a>
              )}
              {project.video_url && canDownload && (
                <a
                  href={project.video_url}
                  download={`${project.title}.mp4`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-zinc-200"
                >
                  <Film className="size-4" /> Télécharger la vidéo
                </a>
              )}
            </section>
            <section className="rounded-2xl border border-white/5 bg-surface p-5">
              <h2 className="mb-3 text-sm font-semibold">Détails du projet</h2>
              <dl className="space-y-2 text-sm">
                <Detail
                  label="Statut"
                  value={
                    project.status === "ready"
                      ? "Prêt"
                      : project.status === "rendering"
                        ? "En préparation"
                        : "Brouillon"
                  }
                />
                <Detail label="Durée" value={duration} />
                <Detail label="Modèle" value={project.model ?? "—"} />
                <Detail label="Progression" value={`${project.progress ?? 0}%`} />
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </PageTransition>
  );
}

function ActionCard({
  icon,
  title,
  description,
  busy,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className="flex min-h-20 items-center gap-3 rounded-xl border border-white/10 bg-background/30 p-3 text-left transition-colors hover:border-neon/40 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-neon/10 text-neon">
        {busy ? <Loader2 className="size-4 animate-spin" /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs text-zinc-500">{description}</span>
      </span>
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-mono text-xs text-zinc-300">{value}</dd>
    </div>
  );
}
