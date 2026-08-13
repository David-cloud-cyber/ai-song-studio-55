import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { isPaidPlan } from "@/lib/plans";
import { stems, timelineClips } from "@/data/mock";
import { PageTransition } from "@/components/studio/PageTransition";
import { WaveformBars } from "@/components/studio/WaveformBars";
import { CoverArt } from "@/components/studio/CoverArt";
import { AudioPlayer } from "@/components/studio/AudioPlayer";
import { soon } from "@/lib/toast";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Sliders,
  Save,
  Download,
  Wand2,
  Scissors,
  Copy,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/editor/$projectId")({
  head: () => ({
    meta: [
      { title: "Éditeur · Loopster" },
      {
        name: "description",
        content: "Timeline multipiste, réglages audio et aperçus en temps réel.",
      },
    ],
  }),
  component: EditorPage,
});

function EditorPage() {
  const { projectId } = Route.useParams();
  const { data: profile } = useProfile();
  const canDownload = isPaidPlan(profile);
  const { data: project, isLoading } = useQuery({
    queryKey: ["editor-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,genre,status,cover_gradient,image_url,cover_url,audio_url,duration_seconds,progress")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      const seed = data.id.charCodeAt(0) + data.id.length;
      return {
        ...data,
        genre: data.genre ?? "Projet",
        status: data.status === "ready" || data.status === "rendering" ? data.status : "draft",
        coverGradient: data.cover_gradient ?? "from-cyan-400 via-blue-600 to-fuchsia-700",
        cover: data.image_url ?? data.cover_url,
        waveform: Array.from({ length: 48 }, (_, i) => Math.max(0.15, Math.abs(Math.sin(seed + i * 0.7)) * 0.75 + 0.2)),
        bpm: 0,
        duration: data.duration_seconds
          ? `${Math.floor(data.duration_seconds / 60)}:${String(data.duration_seconds % 60).padStart(2, "0")}`
          : "—",
      };
    },
  });
  const [playing, setPlaying] = useState(true);
  const [playhead, setPlayhead] = useState(38);
  const [selected, setSelected] = useState<string | null>("c5");
  const [reverb, setReverb] = useState(28);
  const [compression, setCompression] = useState(64);
  const [tempo, setTempo] = useState(0);
  const [master, setMaster] = useState(80);

  if (isLoading || !project) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-400">Chargement…</div>;
  }

  return (
    <PageTransition>
      {/* Editor top bar */}
      <div className="sticky top-0 z-20 -mx-5 mb-4 border-b border-white/5 bg-background/85 px-5 py-3 backdrop-blur-xl md:top-0 md:mx-0 md:rounded-2xl md:border md:px-4">
        <div className="flex items-center gap-3">
          <Link
            to="/library/$projectId"
            params={{ projectId: project.id }}
            className="grid size-9 place-items-center rounded-full border border-white/10 bg-surface"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-widest text-neon">
              Éditeur · {project.status}
            </div>
            <h1 className="truncate text-base font-semibold">{project.title}</h1>
          </div>
          <button
            onClick={() => soon("Sauvegarde bientôt disponible")}
            className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-surface px-3 py-1.5 text-xs md:inline-flex"
          >
            <Save className="size-3.5" />
            Enregistrer
          </button>
          <button
            onClick={() => soon("Export bientôt disponible")}
            className="inline-flex items-center gap-1.5 rounded-full bg-neon px-3 py-1.5 text-xs font-semibold text-background"
          >
            <Download className="size-3.5" />
            Exporter
          </button>
        </div>
      </div>

      <div className="grid gap-4 px-5 md:grid-cols-[1fr_320px] md:px-0">
        {/* Preview + timeline */}
        <div className="space-y-4">
          {/* Preview */}
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-surface">
            <div className="relative">
              {project.cover ? (
                <img src={project.cover} alt={`Pochette de ${project.title}`} className="aspect-[16/9] w-full object-cover" />
              ) : (
                <CoverArt gradient={project.coverGradient} className="aspect-[16/9] rounded-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={() => setPlaying((p) => !p)}
                    className="grid size-16 place-items-center rounded-full bg-background/60 backdrop-blur-xl ring-1 ring-white/20"
                  >
                    {playing ? (
                      <Pause className="size-6 text-neon" />
                    ) : (
                      <Play className="size-6 text-neon" />
                    )}
                  </button>
                </div>
                <div className="absolute inset-x-4 bottom-4 h-10">
                  <WaveformBars peaks={project.waveform} />
                </div>
                </CoverArt>
              )}
              <div className="absolute inset-x-0 top-3 flex items-center justify-between px-4">
                <span className="rounded-full bg-background/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neon backdrop-blur">
                  ● LIVE PREVIEW
                </span>
                <span className="rounded-full bg-background/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-300 backdrop-blur">
                  {tempo} BPM · {project.genre}
                </span>
              </div>
            </div>

            {project.audio_url && (
              <AudioPlayer
                src={project.audio_url}
                seed={project.id}
                label="Master réel"
                canDownload={canDownload}
                className="m-3"
              />
            )}

            {/* Transport */}
            <div className="flex items-center gap-2 border-t border-white/5 px-3 py-2.5">
              <button className="grid size-9 place-items-center rounded-lg hover:bg-white/5">
                <SkipBack className="size-4" />
              </button>
              <button
                onClick={() => setPlaying((p) => !p)}
                className="grid size-11 place-items-center rounded-xl bg-neon text-background"
              >
                {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
              </button>
              <button className="grid size-9 place-items-center rounded-lg hover:bg-white/5">
                <SkipForward className="size-4" />
              </button>
              <div className="ml-2 font-mono text-[11px] tabular-nums text-zinc-400">
                01:24 <span className="text-zinc-600">/ {project.duration}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Volume2 className="size-3.5 text-zinc-500" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={master}
                  onChange={(e) => setMaster(+e.target.value)}
                  className="w-24 accent-cyan-300"
                />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-surface">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-neon" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-300">
                  Timeline · 4 pistes
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[
                  { icon: Scissors, label: "Couper" },
                  { icon: Copy, label: "Dupliquer" },
                  { icon: Wand2, label: "AI Fix" },
                  { icon: Trash2, label: "Suppr" },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={() => soon(a.label + " bientôt disponible")}
                    className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-neon"
                    aria-label={a.label}
                  >
                    <a.icon className="size-3.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Ruler */}
            <div className="relative flex h-6 items-end border-b border-white/5 px-16">
              {[0, 25, 50, 75, 100].map((t) => (
                <div
                  key={t}
                  className="flex-1 font-mono text-[9px] text-zinc-600"
                  style={{ position: "relative" }}
                >
                  <span>{Math.round((t / 100) * 4)}:00</span>
                </div>
              ))}
            </div>

            {/* Tracks */}
            <div className="relative">
              {stems.slice(0, 4).map((track) => {
                const clips = timelineClips.filter((c) => c.track === track.id);
                return (
                  <div
                    key={track.id}
                    className="flex items-stretch border-b border-white/5 last:border-b-0"
                  >
                    <div className="flex w-16 shrink-0 flex-col justify-center border-r border-white/5 bg-background/40 px-2">
                      <span className="truncate font-mono text-[10px] uppercase tracking-wider text-zinc-300">
                        {track.label}
                      </span>
                      <span className="mt-0.5 font-mono text-[9px] text-zinc-600">
                        vol {track.volume}
                      </span>
                    </div>
                    <div className="relative h-14 flex-1">
                      {clips.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelected(c.id)}
                          className={cn(
                            "absolute top-1.5 bottom-1.5 overflow-hidden rounded-md bg-gradient-to-br text-left transition-all",
                            c.color,
                            selected === c.id
                              ? "ring-2 ring-neon shadow-[0_0_18px_rgba(34,211,238,0.4)]"
                              : "opacity-80 hover:opacity-100",
                          )}
                          style={{ left: `${c.start}%`, width: `${c.width}%` }}
                        >
                          <span className="block truncate px-2 pt-1 font-mono text-[9px] uppercase tracking-wider text-white/90">
                            {c.label}
                          </span>
                          <div className="absolute inset-x-1 bottom-1 h-3 opacity-70">
                            <WaveformBars peaks={track.peaks.slice(0, 16)} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Playhead */}
              <div
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-neon shadow-[0_0_10px_rgba(34,211,238,0.7)]"
                style={{ left: `calc(4rem + ${playhead}% * (100% - 4rem) / 100)` }}
              >
                <div className="absolute -top-1 -left-1 size-2 rounded-full bg-neon" />
              </div>
            </div>

            {/* Scrub */}
            <div className="border-t border-white/5 px-3 py-2">
              <input
                type="range"
                min={0}
                max={100}
                value={playhead}
                onChange={(e) => setPlayhead(+e.target.value)}
                className="w-full accent-cyan-300"
              />
            </div>
          </div>
        </div>

        {/* Right panel — mixer & FX */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-neon">
                Mixer
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">
                5 pistes
              </span>
            </div>
            <div className="space-y-3">
              {stems.map((s) => (
                <StemRow key={s.id} stem={s} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-surface p-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-neon">
              Effets Master
            </div>
            <FaderControl label="Reverb" value={reverb} onChange={setReverb} unit="%" />
            <FaderControl
              label="Compression"
              value={compression}
              onChange={setCompression}
              unit="%"
            />
            <FaderControl
              label="Tempo"
              value={tempo}
              onChange={setTempo}
              min={60}
              max={200}
              unit=" BPM"
            />
          </div>

          <button
            onClick={() => soon("Régénération IA bientôt disponible")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neon/30 bg-neon/10 py-3 text-sm font-semibold text-neon"
          >
            <Wand2 className="size-4" />
            Régénérer avec IA
          </button>
        </div>
      </div>
    </PageTransition>
  );
}

function StemRow({ stem }: { stem: (typeof stems)[number] }) {
  const [vol, setVol] = useState(stem.volume);
  const [muted, setMuted] = useState(false);
  const [solo, setSolo] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <div className={`size-2 rounded-full bg-gradient-to-br ${stem.color}`} />
      <div className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-wider">
        {stem.label}
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={muted ? 0 : vol}
        onChange={(e) => setVol(+e.target.value)}
        className="flex-1 accent-cyan-300"
      />
      <span className="w-8 text-right font-mono text-[10px] tabular-nums text-zinc-400">
        {muted ? "—" : vol}
      </span>
      <button
        onClick={() => setMuted((m) => !m)}
        className={cn(
          "grid size-6 place-items-center rounded font-mono text-[9px] font-bold",
          muted ? "bg-rose-500/80 text-white" : "bg-white/5 text-zinc-400",
        )}
      >
        M
      </button>
      <button
        onClick={() => setSolo((s) => !s)}
        className={cn(
          "grid size-6 place-items-center rounded font-mono text-[9px] font-bold",
          solo ? "bg-neon text-background" : "bg-white/5 text-zinc-400",
        )}
      >
        S
      </button>
    </div>
  );
}

function FaderControl({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  unit = "",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs text-zinc-300">{label}</span>
        <span className="font-mono text-[10px] tabular-nums text-neon">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-cyan-300"
      />
    </div>
  );
}
