import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, AudioLines, Mic2, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { useSession } from "@/hooks/use-session";
import type { Project } from "@/data/mock";
import { CollabCard } from "@/components/studio/CollabCard";
import { PageTransition } from "@/components/studio/PageTransition";
import { ProjectCard } from "@/components/studio/ProjectCard";
import { SectionHeader } from "@/components/studio/SectionHeader";

type DbProject = {
  id: string;
  title: string;
  genre: string | null;
  duration_seconds: number | null;
  status: string;
  cover_gradient: string | null;
  created_at: string;
  progress: number;
};

function duration(seconds: number | null) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function wave(seed: string, length = 32) {
  const value = seed.charCodeAt(0) + seed.length;
  return Array.from({ length }, (_, index) =>
    Math.max(0.15, Math.abs(Math.sin(value + index * 0.7)) * 0.75 + 0.2),
  );
}
function toProject(project: DbProject): Project {
  return {
    id: project.id,
    title: project.title,
    genre: project.genre ?? "Projet",
    bpm: 0,
    duration: duration(project.duration_seconds),
    kind: "song",
    status: project.status === "ready" || project.status === "rendering" ? project.status : "draft",
    coverGradient: project.cover_gradient ?? "from-cyan-300 via-blue-600 to-indigo-950",
    waveform: wave(project.id),
    author: "Vous",
    createdAt: new Date(project.created_at).toLocaleDateString("fr-FR"),
    progress: project.progress,
  };
}

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Accueil — Loopster" },
      {
        name: "description",
        content: "Ton espace pour créer, écouter et faire évoluer tes morceaux.",
      },
    ],
  }),
  component: Studio,
});

function Studio() {
  const { user } = useSession();
  const { data: profile } = useProfile();
  const {
    data: recent = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["studio-projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,genre,duration_seconds,status,cover_gradient,created_at,progress")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data as DbProject[]).map(toProject);
    },
  });
  const firstName = (profile?.display_name ?? "Créateur").split(" ")[0];

  return (
    <PageTransition>
      <section className="px-5 pb-8 pt-8 sm:pt-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
          Ton espace de création
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Salut {firstName}.<br />
          On donne vie à quelle idée aujourd’hui ?
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Commence avec un prompt, retrouve une piste récente ou explore les outils qui peuvent
          l’emmener plus loin.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            to="/create"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            <Sparkles className="size-4" /> Nouvelle création
          </Link>
          <Link
            to="/library"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 py-3 text-sm font-medium hover:bg-surface-elevated"
          >
            Ouvrir la bibliothèque <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="px-5 pt-2">
        <SectionHeader
          eyebrow="Tes dernières pistes"
          title="Reprendre là où tu t’es arrêté"
          action={
            <Link to="/library" className="text-xs font-medium text-primary hover:text-foreground">
              Tout voir
            </Link>
          }
        />
        <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
          {isLoading ? (
            <div className="rounded-2xl border border-border bg-surface px-5 py-8 text-sm text-muted-foreground">
              Chargement de tes créations…
            </div>
          ) : isError ? (
            <div className="w-full rounded-2xl border border-dashed border-danger/40 bg-danger/5 p-8 text-center">
              <p className="text-sm text-danger">Impossible de charger tes créations.</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-danger/30 px-4 py-2.5 text-xs font-semibold text-danger"
              >
                <RefreshCw className="size-3.5" /> Réessayer
              </button>
            </div>
          ) : recent.length > 0 ? (
            recent.map((project) => <ProjectCard key={project.id} project={project} />)
          ) : (
            <div className="w-full rounded-2xl border border-dashed border-border bg-surface-subtle p-8 text-center">
              <p className="text-sm text-muted-foreground">Ta bibliothèque est encore vide.</p>
              <Link
                to="/create"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
              >
                <Sparkles className="size-3.5" /> Créer mon premier morceau
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="px-5 pt-10">
        <SectionHeader eyebrow="Outils de création" title="Choisir un point de départ" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              id: "song",
              title: "Morceau complet",
              description: "Voix et instru",
              icon: AudioLines,
            },
            {
              id: "instru",
              title: "Instrumental",
              description: "Beat et texture",
              icon: Mic2,
            },
          ].map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                to="/create"
                search={{ template: tool.id }}
                className="rounded-2xl border border-border bg-surface p-4 hover:border-primary/40 hover:bg-surface-elevated"
              >
                <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <p className="mt-5 text-sm font-semibold">{tool.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="px-5 pt-10">
        <SectionHeader eyebrow="Collaboration" title="Créer à plusieurs" />
        <CollabCard />
      </section>

      <section className="px-5 pb-6 pt-10">
        <SectionHeader eyebrow="Activité récente" title="Ton historique" />
        {recent.length > 0 ? (
          <ul className="space-y-2">
            {recent.slice(0, 3).map((project) => (
              <li
                key={project.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{project.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {project.genre} · {project.createdAt}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-primary">
                  {project.status === "rendering"
                    ? "En cours"
                    : project.status === "ready"
                      ? "Prêt"
                      : "Brouillon"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Ton activité apparaîtra ici après ta première création.
          </p>
        )}
      </section>
    </PageTransition>
  );
}
