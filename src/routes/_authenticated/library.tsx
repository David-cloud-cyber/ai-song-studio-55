import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { PageTransition } from "@/components/studio/PageTransition";
import { CoverArt } from "@/components/studio/CoverArt";
import { WaveformBars } from "@/components/studio/WaveformBars";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { AudioPlayer } from "@/components/studio/AudioPlayer";
import { RefreshCw, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type DbProject = {
  id: string;
  title: string;
  genre: string | null;
  mood: string | null;
  duration_seconds: number | null;
  status: string;
  cover_gradient: string | null;
  tags: string[];
  created_at: string;
  progress: number;
  audio_url: string | null;
  audio_path: string | null;
  archived_at: string | null;
};

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Library · Loopster" },
      {
        name: "description",
        content: "Retrouvez toutes vos créations : chansons, clips, instrus, paroles, pochettes.",
      },
    ],
  }),
  component: LibraryPage,
});

const filters = [
  { id: "all", label: "Tout" },
  { id: "ready", label: "Prêts" },
  { id: "rendering", label: "En cours" },
  { id: "draft", label: "Brouillons" },
  { id: "archived", label: "Archives" },
] as const;

const wave = (seed: string, len = 32) => {
  const s = seed.charCodeAt(0) + seed.length;
  return Array.from({ length: len }, (_, i) =>
    Math.max(0.15, Math.abs(Math.sin(s + i * 0.7)) * 0.75 + 0.2),
  );
};

const fallbackGradient = "from-cyan-400 via-blue-600 to-fuchsia-700";

function formatDuration(sec: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function LibraryPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isLibraryIndex = pathname === "/library" || pathname === "/library/";
  const { user } = useSession();
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [q, setQ] = useState("");

  const {
    data: projects = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["projects", user?.id],
    enabled: isLibraryIndex && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id,title,genre,mood,duration_seconds,status,cover_gradient,tags,created_at,progress,audio_url,audio_path,archived_at",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DbProject[];
    },
  });

  const filtered = projects.filter(
    (p) =>
      (filter === "archived" ? Boolean(p.archived_at) : !p.archived_at) &&
      (filter === "all" || filter === "archived" || p.status === filter) &&
      (q === "" || p.title.toLowerCase().includes(q.toLowerCase())),
  );

  // `library/$projectId` is a child route of this file-based route. Keep the
  // list as the index view and let the child render the project detail page.
  if (!isLibraryIndex) return <Outlet />;

  return (
    <PageTransition>
      <section className="px-5 pb-4 pt-8">
        <SectionHeader
          eyebrow={`${projects.length} projet${projects.length > 1 ? "s" : ""}`}
          title="Bibliothèque"
          action={
            <Link
              to="/create"
              className="inline-flex items-center gap-1.5 rounded-full bg-neon px-3 py-1.5 text-xs font-semibold text-background"
            >
              <Sparkles className="size-3.5" /> Nouveau
            </Link>
          }
        />
        <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-surface px-3 py-2.5">
          <Search className="size-4 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un projet…"
            className="flex-1 bg-transparent text-sm placeholder:text-zinc-600 focus:outline-none"
          />
        </div>
      </section>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-4">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
              filter === f.id
                ? "border-neon/40 bg-neon/10 text-neon"
                : "border-white/5 bg-surface text-zinc-400",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="px-5">
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-400">
            Chargement…
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-dashed border-danger/40 bg-danger/5 p-10 text-center">
            <p className="text-sm text-danger">Ta bibliothèque fait une petite pause.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-danger/30 px-4 py-2 text-xs font-semibold text-danger"
            >
              <RefreshCw className="size-3.5" /> Réessayer
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <p className="text-sm text-zinc-300">
              {projects.length === 0
                ? "Aucune création pour l'instant."
                : "Aucun projet ne correspond."}
            </p>
            <Link
              to="/create"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-neon px-4 py-2 text-xs font-semibold text-background"
            >
              <Sparkles className="size-3.5" /> Créer votre premier projet
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <div key={p.id} className="min-w-0">
                <Link
                  to="/library/$projectId"
                  params={{ projectId: p.id }}
                  className={cn("group block", p.archived_at && "opacity-70")}
                >
                  <CoverArt
                    gradient={p.cover_gradient ?? fallbackGradient}
                    className="aspect-square rounded-2xl"
                  >
                    <div className="absolute left-2 top-2">
                      <StatusBadge status={p.status as "ready" | "rendering" | "draft"} />
                    </div>
                    <div className="absolute inset-x-2 bottom-2 h-8">
                      <WaveformBars peaks={wave(p.id)} animated={p.status === "rendering"} />
                    </div>
                  </CoverArt>
                  <div className="mt-2 truncate text-sm font-semibold">{p.title}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    {p.archived_at ? "Archivé" : (p.genre ?? "—")} ·{" "}
                    {formatDuration(p.duration_seconds)}
                  </div>
                </Link>
                {(p.audio_path || p.audio_url) && p.status === "ready" && (
                  <AudioPlayer
                    src={p.audio_path ?? p.audio_url!}
                    seed={p.id}
                    compact
                    className="mt-2"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </PageTransition>
  );
}
