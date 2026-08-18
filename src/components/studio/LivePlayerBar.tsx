import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Pause, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { CoverArt } from "./CoverArt";
import { WaveformBars } from "./WaveformBars";
import { useMediaUrl } from "@/hooks/use-media-url";

type LatestProject = {
  id: string;
  title: string;
  duration_seconds: number | null;
  audio_url: string | null;
  audio_path: string | null;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { data: project } = useQuery({
    queryKey: ["latest-player-project", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,duration_seconds,audio_url,audio_path,cover_gradient")
        .eq("user_id", user!.id)
        .or("audio_url.not.is.null,audio_path.not.is.null")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as LatestProject | null;
    },
  });

  useEffect(() => {
    setPlaying(false);
    setLoading(false);
    setError(false);
    if (audioRef.current) audioRef.current.pause();
  }, [project?.id, project?.audio_url, project?.audio_path]);

  const resolvedAudioUrl = useMediaUrl(project?.audio_path ?? project?.audio_url);

  useEffect(() => {
    const handleOtherAudio = (event: Event) => {
      if (
        audioRef.current &&
        (event as CustomEvent<HTMLAudioElement>).detail !== audioRef.current
      ) {
        audioRef.current.pause();
      }
    };
    window.addEventListener("loopster:audio-play", handleOtherAudio);
    return () => window.removeEventListener("loopster:audio-play", handleOtherAudio);
  }, []);

  const toggle = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    setError(false);
    if (audio.paused) {
      setLoading(true);
      try {
        window.dispatchEvent(new CustomEvent("loopster:audio-play", { detail: audio }));
        await audio.play();
      } catch {
        setPlaying(false);
        setError(true);
      } finally {
        setLoading(false);
      }
    } else {
      audio.pause();
    }
  };

  if (!project || !resolvedAudioUrl) return null;
  return (
    <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-border bg-surface/95 p-2.5 backdrop-blur-xl">
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        aria-label={loading ? "Chargement du morceau" : playing ? "Pause" : "Écouter"}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : playing ? (
          <Pause className="size-4" fill="currentColor" />
        ) : (
          <Play className="ml-0.5 size-4" fill="currentColor" />
        )}
      </button>
      <Link
        to="/library/$projectId"
        params={{ projectId: project.id }}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <CoverArt
          gradient={project.cover_gradient ?? "from-cyan-300 via-blue-600 to-indigo-950"}
          className="size-10 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold">{project.title}</div>
          <div className="mt-1 h-3">
            <WaveformBars peaks={waveform(project.id)} animated={playing} />
          </div>
          {error && (
            <div className="mt-1 truncate text-[10px] text-danger">
              Lecture indisponible pour l’instant.
            </div>
          )}
        </div>
        <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
          Prêt · {duration(project.duration_seconds)}
        </span>
      </Link>
      <audio
        ref={audioRef}
        src={resolvedAudioUrl}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setLoading(false);
          setError(true);
        }}
        className="sr-only"
      />
    </div>
  );
}
