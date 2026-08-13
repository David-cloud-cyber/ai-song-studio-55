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
  className,
}: {
  src: string;
  seed: string;
  label?: string;
  downloadName?: string;
  canDownload?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setTime(0);
  }, [src]);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  const progress = duration ? time / duration : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-surface/80 p-3 backdrop-blur-sm",
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
          onClick={toggle}
          aria-label={playing ? "Pause" : "Lecture"}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-neon text-background"
        >
          {playing ? (
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
            className="h-10 cursor-pointer"
          >
            <WaveformBars peaks={peaks(seed)} animated={playing} progress={progress} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-500">
            <span>{fmt(time)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {canDownload ? (
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
        ) : (
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
        className="hidden"
      />
    </div>
  );
}
