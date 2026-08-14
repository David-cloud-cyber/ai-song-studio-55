import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { CoverArt } from "./CoverArt";
import { WaveformBars } from "./WaveformBars";

type LatestProject = {
  id: string;
  title: string;
  duration_seconds: number | null;
  audio_url: string | null;
  cover_gradient: string | null;
};
function duration(seconds: number | null) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function waveform(seed: string) {
  const value = seed.charCodeAt(0) + seed.length;
  return Array.from({ length: 24 }, (_, index) =>
    Math.max(0.18, Math.abs(Math.sin(value + index * 0.7)) * 0.8),
  );
}

export function LivePlayerBar() {
  const { user } = useSession();
  const { data: project } = useQuery({
    queryKey: ["latest-player-project", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,duration_seconds,audio_url,cover_gradient")
        .not("audio_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as LatestProject | null;
    },
  });
  if (!project?.audio_url) return null;
  return (
    <Link
      to="/library/$projectId"
      params={{ projectId: project.id }}
      className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-border bg-surface/95 p-2.5 backdrop-blur-xl"
    >
      <CoverArt
        gradient={project.cover_gradient ?? "from-cyan-300 via-blue-600 to-indigo-950"}
        className="size-10 shrink-0 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold">{project.title}</div>
        <div className="mt-1 h-3">
          <WaveformBars peaks={waveform(project.id)} animated />
        </div>
      </div>
      <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
        Prêt · {duration(project.duration_seconds)}
      </span>
    </Link>
  );
}
