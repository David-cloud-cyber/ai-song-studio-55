import { useEffect, useRef, useState } from "react";
import { Play, Pause, Download, Lock } from "lucide-react";
import { WaveformBars } from "./WaveformBars";
import { cn } from "@/lib/utils";

function peaks(seed: string, len = 48) {
  const s = seed.charCodeAt(0) + seed.length;
  return Array.from({ length: len }, (_, i) =>
    Math.max(0.15, Math.abs(Math.sin(s + i * 0.7)) * 0.75 + 0.2),
  );
}

function fmt(sec: number) {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AudioPlayer({
  src,
  seed,
  label,
  downloadName,
  canDownload = false,
  compact = false,
  className,
}: {
  src: string;
  seed: string;
  label?: string;
  downloadName?: string;
  canDownload?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setDuration(0);
    setError(false);
    setLoading(false);
    if (ref.current) ref.current.pause();
  }, [src]);

  useEffect(() => {
    const handleOtherAudio = (event: Event) => {
      if (ref.current && (event as CustomEvent<HTMLAudioElement>).detail !== ref.current) {
        ref.current.pause();
      }
    };
    window.addEventListener("loopster:audio-play", handleOtherAudio);
    return () => window.removeEventListener("loopster:audio-play", handleOtherAudio);
  }, []);

  const toggle = async () => {
    const el = ref.current;
    if (!el) return;
    setError(false);
    if (el.paused) {
      setLoading(true);
      try {
        window.dispatchEvent(new CustomEvent("loopster:audio-play", { detail: el }));
        await el.play();
      } catch {
        setPlaying(false);
        setError(true);
      } finally {
        setLoading(false);
      }
    } else {
      el.pause();
    }
  };

  const progress = duration ? time / duration : 0;

  return (
    <div
      className={cn(
        compact
          ? "rounded-xl border border-white/10 bg-surface/80 p-2 backdrop-blur-sm"
          : "rounded-2xl border border-white/10 bg-surface/80 p-3 backdrop-blur-sm",
        className,
      )}
    >
      {label && (
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          {label}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          aria-label={loading ? "Chargement" : playing ? "Pause" : "Lecture"}
          className={cn(
            "grid shrink-0 place-items-center rounded-full bg-neon text-background",
            compact ? "size-9" : "size-11",
            "disabled:cursor-wait disabled:opacity-70",
          )}
        >
          {loading ? (
            <span className="size-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
          ) : playing ? (
            <Pause className="size-5" fill="currentColor" />
          ) : (
            <Play className="size-5" fill="currentColor" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div
            role="presentation"
            onClick={(e) => {
              const el = ref.current;
              if (!el || !duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              el.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
            }}
            className={cn(compact ? "h-8" : "h-10", "cursor-pointer")}
          >
            <WaveformBars peaks={peaks(seed)} animated={playing} progress={progress} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-500">
            <span>{fmt(time)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {!compact && canDownload && (
          <a
            href={src}
            download={downloadName ?? true}
            target="_blank"
            rel="noreferrer"
            aria-label="Télécharger"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-surface text-zinc-300 hover:text-neon"
          >
            <Download className="size-4" />
          </a>
        )}
        {!compact && !canDownload && (
          <a
            href="/credits"
            aria-label="Débloquer le téléchargement"
            title="Passe à une formule payante pour télécharger"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-neon/20 bg-neon/5 text-neon hover:bg-neon/10"
          >
            <Lock className="size-3.5" />
          </a>
        )}
      </div>

      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => {
          setPlaying(false);
          setLoading(false);
          setError(true);
        }}
        className="sr-only"
      />
      {error && (
        <p className="mt-2 text-center text-[11px] text-danger">
          Lecture indisponible pour l’instant. Réessaie dans un instant.
        </p>
      )}
    </div>
  );
}
