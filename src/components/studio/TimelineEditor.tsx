import { useMemo, useRef, useState } from "react";
import { Check, CircleStop, Play, Save, Scissors, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Track = {
  id: string;
  label: string;
  role: string;
  asset_url: string | null;
  muted: boolean;
  solo: boolean;
  gain: number;
  fade_in_seconds: number;
  fade_out_seconds: number;
};

type Section = {
  id: string;
  label: string;
  section_type: string;
  start_seconds: number;
  end_seconds: number;
};

const DEFAULT_SECTIONS = [
  { label: "Intro", section_type: "intro", start_seconds: 0, end_seconds: 15 },
  { label: "Couplet", section_type: "verse", start_seconds: 15, end_seconds: 45 },
  { label: "Refrain", section_type: "chorus", start_seconds: 45, end_seconds: 75 },
];

export function TimelineEditor({
  projectId,
  audioUrl,
  duration,
  initialState,
  initialTracks,
  initialSections,
  onReplaceSection,
}: {
  projectId: string;
  audioUrl: string;
  duration: number;
  initialState: Record<string, unknown> | null;
  initialTracks: Track[];
  initialSections: Section[];
  onReplaceSection?: (start: number, end: number, prompt: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const maxDuration = Math.max(1, duration);
  const initialStart = typeof initialState?.trimStart === "number" ? initialState.trimStart : 0;
  const initialEnd = typeof initialState?.trimEnd === "number" ? initialState.trimEnd : maxDuration;
  const [position, setPosition] = useState(0);
  const [trimStart, setTrimStart] = useState(Math.min(initialStart, maxDuration));
  const [trimEnd, setTrimEnd] = useState(
    Math.min(Math.max(initialEnd, initialStart + 1), maxDuration),
  );
  const [fadeIn, setFadeIn] = useState(
    typeof initialState?.fadeIn === "number" ? initialState.fadeIn : 0,
  );
  const [fadeOut, setFadeOut] = useState(
    typeof initialState?.fadeOut === "number" ? initialState.fadeOut : 0,
  );
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [sections, setSections] = useState<Section[]>(
    initialSections.length > 0
      ? initialSections
      : DEFAULT_SECTIONS.map((section, index) => ({ ...section, id: `local-${index}` })),
  );
  const [saving, setSaving] = useState(false);
  const [selectionPrompt, setSelectionPrompt] = useState(
    "Une variation plus intense et plus mélodique",
  );

  const percent = useMemo(() => (position / maxDuration) * 100, [maxDuration, position]);
  const playSelection = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    audio.currentTime = Math.max(trimStart, 0);
    try {
      await audio.play();
    } catch {
      toast.error("La lecture n’a pas pu démarrer", {
        description: "Vérifie que le fichier audio est encore accessible.",
      });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error: projectError } = await supabase
        .from("projects")
        .update({
          edit_state: { trimStart, trimEnd, fadeIn, fadeOut, savedAt: new Date().toISOString() },
        })
        .eq("id", projectId);
      if (projectError) throw projectError;

      for (const track of tracks.filter((item) => !item.id.startsWith("local-"))) {
        const { error } = await supabase
          .from("project_tracks")
          .update({
            muted: track.muted,
            solo: track.solo,
            gain: track.gain,
            fade_in_seconds: track.fade_in_seconds,
            fade_out_seconds: track.fade_out_seconds,
          })
          .eq("id", track.id);
        if (error) throw error;
      }

      const existing = sections
        .filter((section) => !section.id.startsWith("local-"))
        .map((section) => section.id);
      if (existing.length > 0) {
        for (const section of sections.filter((item) => existing.includes(item.id))) {
          const { error } = await supabase
            .from("project_sections")
            .update({
              label: section.label,
              section_type: section.section_type,
              start_seconds: section.start_seconds,
              end_seconds: section.end_seconds,
            })
            .eq("id", section.id);
          if (error) throw error;
        }
      } else if (sections.length > 0) {
        const { data: insertedSections, error } = await supabase
          .from("project_sections")
          .insert(
            sections.map((section) => ({
              project_id: projectId,
              label: section.label,
              section_type: section.section_type,
              start_seconds: section.start_seconds,
              end_seconds: section.end_seconds,
            })),
          )
          .select("id,label,section_type,start_seconds,end_seconds");
        if (error) throw error;
        if (insertedSections) setSections(insertedSections);
      }
      toast.success("Modifications enregistrées");
    } catch (error) {
      toast.error("Impossible d’enregistrer l’édition", {
        description: error instanceof Error ? error.message : "Réessaie dans un instant.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="space-y-4 rounded-2xl border border-white/10 bg-surface p-4 sm:p-5"
      aria-label="Éditeur audio"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon">Studio audio</p>
          <h2 className="mt-1 text-base font-semibold">Timeline et versions</h2>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-neon px-3 text-xs font-semibold text-background disabled:opacity-60"
        >
          <Save className="size-4" /> {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-background/50 p-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={playSelection}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-neon text-background"
            aria-label="Lecture ou pause de la sélection"
          >
            <Play className="size-5" fill="currentColor" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="relative h-10 overflow-hidden rounded-lg bg-white/[0.04]">
              <div
                className="absolute inset-y-0 left-0 bg-neon/15"
                style={{ width: `${percent}%` }}
              />
              <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
              <input
                type="range"
                min={0}
                max={maxDuration}
                step={0.1}
                value={position}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setPosition(next);
                  if (audioRef.current) audioRef.current.currentTime = next;
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Position dans la timeline"
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>{formatSeconds(position)}</span>
              <span>{formatSeconds(maxDuration)}</span>
            </div>
          </div>
        </div>
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          className="sr-only"
          onTimeUpdate={(event) => {
            const current = event.currentTarget.currentTime;
            setPosition(current);
            if (current >= trimEnd) event.currentTarget.pause();
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Pistes</h3>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {tracks.length || 1} piste(s)
            </span>
          </div>
          {(tracks.length > 0
            ? tracks
            : [
                {
                  id: "master",
                  label: "Master audio",
                  role: "master",
                  asset_url: audioUrl,
                  muted: false,
                  solo: false,
                  gain: 1,
                  fade_in_seconds: 0,
                  fade_out_seconds: 0,
                },
              ]
          ).map((track) => (
            <div key={track.id} className="rounded-xl border border-white/10 bg-background/40 p-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setTracks((current) =>
                      current.map((item) =>
                        item.id === track.id ? { ...item, muted: !item.muted } : item,
                      ),
                    )
                  }
                  className={cn(
                    "grid size-9 place-items-center rounded-lg border",
                    track.muted ? "border-danger/40 text-danger" : "border-white/10 text-neon",
                  )}
                  aria-label={track.muted ? `Réactiver ${track.label}` : `Couper ${track.label}`}
                >
                  {track.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{track.label}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {track.role}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="text-[11px] text-muted-foreground">
                  Volume
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={track.gain}
                    onChange={(event) =>
                      setTracks((current) =>
                        current.map((item) =>
                          item.id === track.id
                            ? { ...item, gain: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                    className="mt-1 w-full accent-cyan-300"
                  />
                </label>
                <label className="text-[11px] text-muted-foreground">
                  Fondu entrée
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.5}
                    value={track.fade_in_seconds}
                    onChange={(event) =>
                      setTracks((current) =>
                        current.map((item) =>
                          item.id === track.id
                            ? { ...item, fade_in_seconds: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                    className="mt-1 w-full accent-cyan-300"
                  />
                </label>
                <label className="text-[11px] text-muted-foreground">
                  Fondu sortie
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.5}
                    value={track.fade_out_seconds}
                    onChange={(event) =>
                      setTracks((current) =>
                        current.map((item) =>
                          item.id === track.id
                            ? { ...item, fade_out_seconds: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                    className="mt-1 w-full accent-cyan-300"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-background/40 p-3">
            <div className="mb-3 flex items-center gap-2">
              <Scissors className="size-4 text-neon" />
              <h3 className="text-sm font-semibold">Découpe</h3>
            </div>
            <RangeField
              label="Début"
              value={trimStart}
              max={Math.max(0, trimEnd - 1)}
              onChange={setTrimStart}
            />
            <RangeField
              label="Fin"
              value={trimEnd}
              min={Math.min(maxDuration, trimStart + 1)}
              max={maxDuration}
              onChange={setTrimEnd}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <RangeField label="Fondu entrée" value={fadeIn} max={8} onChange={setFadeIn} />
              <RangeField label="Fondu sortie" value={fadeOut} max={8} onChange={setFadeOut} />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-background/40 p-3">
            <h3 className="text-sm font-semibold">Sections</h3>
            <div className="mt-3 space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setTrimStart(section.start_seconds);
                    setTrimEnd(section.end_seconds);
                  }}
                  className="flex min-h-11 w-full items-center justify-between rounded-lg border border-white/10 px-3 text-left hover:border-neon/40"
                >
                  <span className="text-xs font-medium">{section.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {formatSeconds(section.start_seconds)}–{formatSeconds(section.end_seconds)}
                  </span>
                </button>
              ))}
            </div>
            <label className="mt-3 block text-[11px] text-muted-foreground">
              Idée pour remplacer la sélection
              <textarea
                value={selectionPrompt}
                onChange={(event) => setSelectionPrompt(event.target.value)}
                rows={2}
                className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-background px-2 py-2 text-xs text-foreground outline-none focus:border-neon/50"
              />
            </label>
            {onReplaceSection && (
              <button
                type="button"
                onClick={() => onReplaceSection(trimStart, trimEnd, selectionPrompt)}
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-neon/30 bg-neon/10 text-xs font-semibold text-neon"
              >
                <CircleStop className="size-4" />
                Remplacer cette section
              </button>
            )}
            <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
              La préécoute s’arrête à la fin de la sélection. Les nouvelles versions restent
              séparées de l’originale.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RangeField({
  label,
  value,
  min = 0,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-[11px] text-muted-foreground">
      {label}
      <span className="float-right font-mono text-[10px] text-neon">{formatSeconds(value)}</span>
      <input
        type="range"
        min={min}
        max={Math.max(min, max)}
        step={0.1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full accent-cyan-300"
      />
    </label>
  );
}

function formatSeconds(value: number) {
  const safe = Math.max(0, Math.round(value));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
