import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CoverArt } from "@/components/studio/CoverArt";
import { WaveformBars } from "@/components/studio/WaveformBars";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { PageTransition } from "@/components/studio/PageTransition";
import {
  ArrowLeft,
  Download,
  Share2,
  Wand2,
  Play,
  Pause,
  Heart,
  Sliders,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { soon } from "@/lib/toast";

type Project = {
  id: string;
  title: string;
  genre: string | null;
  mood: string | null;
  duration_seconds: number | null;
  status: "ready" | "rendering" | "draft";
  cover_gradient: string | null;
  tags: string[];
  prompt: string | null;
  lyrics: string | null;
  is_favorite: boolean;
};

export const Route = createFileRoute("/_authenticated/library/$projectId")({
  head: () => ({
    meta: [{ title: "Projet · BeatStudio" }, { name: "description", content: "Détails du projet" }],
  }),
  notFoundComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">Projet introuvable.</div>
  ),
  component: ProjectDetail,
});

const wave = (id: string, len = 48) => {
  const s = id.charCodeAt(0) + id.length;
  return Array.from({ length: len }, (_, i) =>
    Math.max(0.15, Math.abs(Math.sin(s + i * 0.7)) * 0.75 + 0.2),
  );
};

function formatDuration(sec: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const tabs = ["Audio", "Paroles", "Pochette"] as const;

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Audio");
  const [playing, setPlaying] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as Project;
    },
  });

  if (isLoading || !project) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-400">
        Chargement…
      </div>
    );
  }

  const gradient = project.cover_gradient ?? "from-cyan-400 via-blue-600 to-fuchsia-700";

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

      <section className="px-5 pt-4">
        <CoverArt gradient={gradient} className="aspect-square w-full">
          <div className="absolute left-3 top-3">
            <StatusBadge status={project.status} />
          </div>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="neon-pulse absolute bottom-4 right-4 grid size-14 place-items-center rounded-full bg-neon text-background"
          >
            {playing ? (
              <Pause className="size-6" fill="currentColor" />
            ) : (
              <Play className="size-6" fill="currentColor" />
            )}
          </button>
        </CoverArt>

        <div className="mt-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-neon/70">
              {project.genre ?? "Projet"}
            </div>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{project.title}</h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {project.mood ?? "—"} · {formatDuration(project.duration_seconds)}
            </p>
          </div>
          <button
            onClick={() => soon()}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-surface"
          >
            <Heart className={cn("size-4", project.is_favorite && "fill-neon text-neon")} />
          </button>
        </div>

        <div className="mt-4 h-12 rounded-xl border border-white/5 bg-surface/60 p-2">
          <WaveformBars peaks={wave(project.id)} animated={playing} progress={0.35} />
        </div>

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
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button
            onClick={() => soon("Export bientôt disponible")}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface py-2.5 text-xs font-semibold"
          >
            <Download className="size-3.5" /> Export
          </button>
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
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-400">
              La génération audio arrivera avec l'intégration IA (phase 3).
            </div>
          )}
          {tab === "Paroles" && (
            <pre className="whitespace-pre-wrap rounded-2xl border border-white/5 bg-surface p-4 font-sans text-sm leading-relaxed text-zinc-300">
              {project.lyrics ?? project.prompt ?? "Aucune parole générée pour l'instant."}
            </pre>
          )}
          {tab === "Pochette" && (
            <CoverArt gradient={gradient} title={project.title} className="aspect-square" />
          )}
        </div>
      </section>
    </PageTransition>
  );
}
