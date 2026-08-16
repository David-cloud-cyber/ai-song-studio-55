import { Link } from "@tanstack/react-router";
import { Pause, Play, Sparkles } from "lucide-react";
import { useRef, useState, type ComponentType, type ReactNode } from "react";
import { LoopsterLogo } from "@/components/branding/LoopsterLogo";
import { cn } from "@/lib/utils";

export type PublicCreation = {
  id: string;
  title: string;
  genre: string | null;
  duration_seconds: number | null;
  cover_url: string | null;
  image_url: string | null;
  audio_url: string | null;
  creator_name: string;
  published_at: string | null;
};

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-background text-foreground">
      {children}
    </div>
  );
}

export function Pill({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: "primary" | "neutral" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em]",
        tone === "primary" && "border-primary/25 bg-primary/5 text-primary",
        tone === "accent" && "border-accent/30 bg-accent/10 text-accent",
        tone === "neutral" && "border-border bg-surface text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function MarketingButton({
  to,
  children,
  variant = "primary",
  className,
}: {
  to: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        variant === "primary" && "bg-primary text-primary-foreground",
        variant === "secondary" &&
          "border border-border bg-surface text-foreground hover:border-primary/50",
        variant === "ghost" && "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function FeatureCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group rounded-3xl border border-border bg-surface p-6 transition-colors hover:border-primary/40",
        className,
      )}
    >
      <div className="grid size-11 place-items-center rounded-2xl bg-surface-elevated text-primary">
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-xl font-semibold leading-tight tracking-tight">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </article>
  );
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export function AudioCard({ creation }: { creation: PublicCreation }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const cover = creation.image_url ?? creation.cover_url;

  const toggle = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) void audioRef.current.play();
    else audioRef.current.pause();
  };

  return (
    <article className="group w-[min(78vw,280px)] shrink-0">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/70 via-secondary/80 to-background">
        {cover && (
          <img
            src={cover}
            alt={`Pochette de ${creation.title}`}
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Mettre ${creation.title} en pause` : `Écouter ${creation.title}`}
          className="absolute bottom-4 left-4 grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-105"
        >
          {playing ? (
            <Pause className="size-4" fill="currentColor" />
          ) : (
            <Play className="size-4" fill="currentColor" />
          )}
        </button>
        <span className="absolute bottom-5 right-4 font-mono text-[10px] text-white/75">
          {formatDuration(creation.duration_seconds)}
        </span>
        <audio
          ref={audioRef}
          src={creation.audio_url ?? undefined}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      </div>
      <h3 className="mt-3 truncate text-sm font-semibold">{creation.title}</h3>
      <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {creation.genre ?? "Création Loopster"} · {creation.creator_name}
      </p>
    </article>
  );
}

export function CreationRail({
  items,
  loading = false,
  error = false,
}: {
  items: PublicCreation[];
  loading?: boolean;
  error?: boolean;
}) {
  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 sm:px-6 lg:justify-center">
      {loading &&
        Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[min(78vw,280px)] w-[min(78vw,280px)] shrink-0 animate-pulse rounded-3xl bg-surface"
          />
        ))}
      {!loading && error && (
        <div className="mx-auto rounded-2xl border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger">
          La galerie fait une petite pause. Réessaie dans un instant.
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border px-6 py-8 text-center">
          <Sparkles className="mx-auto size-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            La galerie Loopster se remplit. Publie ta première création pour l’ouvrir.
          </p>
        </div>
      )}
      {!loading &&
        !error &&
        items.map((creation) => <AudioCard key={creation.id} creation={creation} />)}
    </div>
  );
}

export function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border bg-surface shadow-2xl shadow-black/20">
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <LoopsterLogo compact className="size-6" imageClassName="size-6" />
        <span className="text-xs font-semibold">Studio Loopster</span>
        <span className="ml-auto rounded-full border border-primary/20 bg-primary/5 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-primary">
          Prêt à créer
        </span>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[1.1fr_.9fr] sm:p-6">
        <div className="rounded-2xl border border-border-subtle bg-background p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Nouvelle idée
          </p>
          <p className="mt-4 text-lg font-semibold leading-tight">
            Une nuit douce en ville, synthwave et voix aérienne.
          </p>
          <div className="mt-5 h-2 rounded-full bg-primary/15">
            <div className="h-full w-2/3 rounded-full bg-primary" />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Création en cours</span>
            <span>67%</span>
          </div>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-gradient-to-br from-secondary/30 via-surface-elevated to-accent/20 p-4">
          <div className="flex h-full min-h-36 flex-col justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Aperçu
            </span>
            <div>
              <p className="text-sm font-semibold">Neon after rain</p>
              <p className="mt-1 text-xs text-muted-foreground">Synthwave · 3:42</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LogoStrip({ labels }: { labels: string[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-full border border-border bg-surface px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function FinalCta({ title, description }: { title: string; description: string }) {
  return (
    <section className="px-4 pb-24 sm:px-6 md:pb-32">
      <div className="mx-auto max-w-5xl rounded-[28px] border border-primary/35 bg-primary/[0.06] p-7 text-center sm:p-12 md:p-16">
        <Sparkles className="mx-auto size-7 text-primary" aria-hidden />
        <h2 className="mx-auto mt-5 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
        <MarketingButton to="/auth" className="mt-8">
          Créer mon premier morceau
        </MarketingButton>
      </div>
    </section>
  );
}
