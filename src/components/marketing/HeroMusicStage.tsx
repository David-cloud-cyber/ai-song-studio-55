import { Pause, Play, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import type { PublicCreation } from "./MarketingPrimitives";
import { cn } from "@/lib/utils";

type HeroMusicItem = {
  id: string;
  title: string;
  genre: string;
  creator: string;
  duration: string;
  cover: string | null;
  audio: string | null;
  preview: boolean;
};

const previewItems: HeroMusicItem[] = [
  {
    id: "loopster-preview-left",
    title: "Une idée prend forme",
    genre: "Aperçu Loopster",
    creator: "Signal Studio",
    duration: "—",
    cover: null,
    audio: null,
    preview: true,
  },
  {
    id: "loopster-preview-main",
    title: "Ton prochain morceau",
    genre: "Aperçu Loopster",
    creator: "À partir de ton idée",
    duration: "—",
    cover: null,
    audio: null,
    preview: true,
  },
  {
    id: "loopster-preview-right",
    title: "Une direction à explorer",
    genre: "Aperçu Loopster",
    creator: "Voix · instru · ambiance",
    duration: "—",
    cover: null,
    audio: null,
    preview: true,
  },
];

function durationLabel(seconds: number | null) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function toHeroItem(creation: PublicCreation): HeroMusicItem {
  return {
    id: creation.id,
    title: creation.title,
    genre: creation.genre ?? "Création Loopster",
    creator: creation.creator_name,
    duration: durationLabel(creation.duration_seconds),
    cover: creation.image_url ?? creation.cover_url,
    audio: creation.audio_url,
    preview: false,
  };
}

function waveform(id: string) {
  return Array.from({ length: 34 }, (_, index) => {
    const seed = id.charCodeAt(index % id.length) + index * 17;
    return 18 + ((seed * 13) % 68);
  });
}

function HeroMusicCard({
  item,
  position,
  playing,
  onPlay,
  onPause,
}: {
  item: HeroMusicItem;
  position: "left" | "center" | "right";
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);
  const bars = waveform(item.id);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || audioFailed || item.preview) return;
    if (audio.paused) {
      void audio.play().catch(() => setAudioFailed(true));
    } else {
      audio.pause();
    }
  };

  return (
    <article
      className={cn(
        "hero-music-card pointer-events-auto relative overflow-hidden rounded-[22px] border border-white/15 bg-[#10161d]/85 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl",
        position === "left" && "hero-music-card-left",
        position === "center" && "hero-music-card-center",
        position === "right" && "hero-music-card-right",
      )}
    >
      <div
        className={cn(
          "relative aspect-[1.12/1] overflow-hidden rounded-[16px] bg-gradient-to-br from-primary/60 via-secondary/45 to-accent/55",
          item.preview && "hero-preview-art",
        )}
      >
        {item.cover && (
          <img
            src={item.cover}
            alt={`Pochette de ${item.title}`}
            className="absolute inset-0 size-full object-cover"
            loading={position === "center" ? "eager" : "lazy"}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/5 to-white/10" />
        {item.preview && (
          <div className="absolute inset-0 grid place-items-center">
            <Sparkles className="size-8 text-white/85" aria-hidden />
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          disabled={item.preview || audioFailed}
          aria-label={
            item.preview
              ? "Aperçu visuel Loopster"
              : audioFailed
                ? `Audio indisponible pour ${item.title}`
                : playing
                  ? `Mettre ${item.title} en pause`
                  : `Écouter ${item.title}`
          }
          className="absolute bottom-3 left-3 grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 disabled:cursor-default disabled:bg-white/20 disabled:text-white/80"
        >
          {playing ? (
            <Pause className="size-4" fill="currentColor" />
          ) : (
            <Play className="size-4" fill="currentColor" />
          )}
        </button>
        <span className="absolute bottom-4 right-3 font-mono text-[10px] text-white/75">
          {item.duration}
        </span>
        {item.audio && (
          <audio
            ref={audioRef}
            src={item.audio}
            preload="none"
            onPlay={onPlay}
            onPause={onPause}
            onEnded={onPause}
            onError={() => setAudioFailed(true)}
          />
        )}
      </div>
      <div className="px-1 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-xs font-semibold text-white">{item.title}</h3>
            <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.15em] text-white/50">
              {item.genre}
            </p>
          </div>
          <div className="flex h-6 w-16 shrink-0 items-end gap-[2px]" aria-hidden>
            {bars.map((height, index) => (
              <span
                key={`${item.id}-${index}`}
                className={cn(
                  "hero-wave-bar flex-1 rounded-full bg-primary/70",
                  playing && "hero-wave-bar-active",
                )}
                style={{ height: `${height}%`, animationDelay: `${(index % 7) * 70}ms` }}
              />
            ))}
          </div>
        </div>
        <p className="mt-2 truncate text-[10px] text-white/40">{item.creator}</p>
      </div>
    </article>
  );
}

export function HeroMusicStage({
  creations,
  loading = false,
  error = false,
}: {
  creations: PublicCreation[];
  loading?: boolean;
  error?: boolean;
}) {
  const items =
    !loading && !error && creations.length > 0
      ? creations.slice(0, 3).map(toHeroItem)
      : previewItems;
  const [playingId, setPlayingId] = useState<string | null>(null);

  const playItem = (id: string) => {
    setPlayingId(id);
  };

  const pauseItem = (id: string) => {
    setPlayingId((current) => (current === id ? null : current));
  };

  const mobileItem = items[1] ?? items[0];

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden md:block">
        <div className="pointer-events-auto absolute left-[-3%] top-28 w-[min(22vw,230px)]">
          <HeroMusicCard
            item={items[0]}
            position="left"
            playing={playingId === items[0].id}
            onPlay={() => playItem(items[0].id)}
            onPause={() => pauseItem(items[0].id)}
          />
        </div>
        <div className="pointer-events-auto absolute right-[-3%] top-20 w-[min(24vw,255px)]">
          <HeroMusicCard
            item={items[2] ?? items[0]}
            position="right"
            playing={playingId === (items[2] ?? items[0]).id}
            onPlay={() => playItem((items[2] ?? items[0]).id)}
            onPause={() => pauseItem((items[2] ?? items[0]).id)}
          />
        </div>
        <div className="pointer-events-auto absolute bottom-[-18rem] left-1/2 w-[min(27vw,285px)] -translate-x-1/2">
          <HeroMusicCard
            item={mobileItem}
            position="center"
            playing={playingId === mobileItem.id}
            onPlay={() => playItem(mobileItem.id)}
            onPause={() => pauseItem(mobileItem.id)}
          />
        </div>
      </div>
      <div className="relative mx-auto mt-8 w-full max-w-[18rem] md:hidden">
        <HeroMusicCard
          item={mobileItem}
          position="center"
          playing={playingId === mobileItem.id}
          onPlay={() => playItem(mobileItem.id)}
          onPause={() => pauseItem(mobileItem.id)}
        />
      </div>
    </>
  );
}
