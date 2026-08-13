import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { templates, templateMeta, moods, genres, voices, templateDurations } from "@/data/mock";
import { TemplateTile } from "@/components/studio/TemplateTile";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates · Loopster" },
      {
        name: "description",
        content: "Modèles créatifs filtrables par genre, mood, durée et voix.",
      },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [voice, setVoice] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const m = templateMeta[t.id];
      const query = q.trim().toLowerCase();
      if (query) {
        const hay = [t.title, t.subtitle, ...(m?.genres ?? []), ...(m?.moods ?? [])]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (genre && !m?.genres.includes(genre)) return false;
      if (mood && !m?.moods.includes(mood)) return false;
      if (voice && !m?.voices.includes(voice)) return false;
      if (duration && m?.duration && !matchDuration(duration, m.duration)) return false;
      return true;
    });
  }, [q, genre, mood, voice, duration]);

  const activeCount = [genre, mood, voice, duration].filter(Boolean).length;

  const reset = () => {
    setGenre(null);
    setMood(null);
    setVoice(null);
    setDuration(null);
    setQ("");
  };

  return (
    <PageTransition>
      <section className="px-5 pt-8">
        <SectionHeader eyebrow="Toolkit" title="Templates créatifs" />

        {/* Search + filter toggle */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-surface px-3 py-2.5">
            <Search className="size-4 shrink-0 text-zinc-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un template, un genre…"
              className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-zinc-600 focus:outline-none"
            />
            {q && (
              <button onClick={() => setQ("")}>
                <X className="size-4 text-zinc-500 hover:text-zinc-200" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={cn(
              "relative grid size-11 shrink-0 place-items-center rounded-2xl border transition-colors",
              showFilters || activeCount
                ? "border-neon/40 bg-neon/10 text-neon"
                : "border-white/10 bg-surface text-zinc-300",
            )}
          >
            <SlidersHorizontal className="size-4" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-neon font-mono text-[9px] font-bold text-background">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-3 space-y-3 rounded-2xl border border-white/5 bg-surface p-4">
            <FilterRow label="Genre" options={genres} value={genre} onChange={setGenre} />
            <FilterRow label="Mood" options={moods} value={mood} onChange={setMood} />
            <FilterRow label="Voix" options={voices} value={voice} onChange={setVoice} />
            <FilterRow
              label="Durée"
              options={templateDurations}
              value={duration}
              onChange={setDuration}
            />
            {activeCount > 0 && (
              <button
                onClick={reset}
                className="w-full rounded-xl border border-white/10 bg-background/60 py-2 text-xs text-zinc-300 hover:text-neon"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        {/* Result count */}
        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </span>
          {(q || activeCount > 0) && (
            <button
              onClick={reset}
              className="font-mono text-[10px] uppercase tracking-widest text-neon"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Grid */}
        {filtered.length ? (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {filtered.map((t, i) => (
              <TemplateTile key={t.id} template={t} featured={i === 0} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-surface/50 py-10 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Aucun template
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Essaie d'assouplir les filtres ou de changer la recherche.
            </p>
          </div>
        )}
      </section>
    </PageTransition>
  );
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value === o;
          return (
            <button
              key={o}
              onClick={() => onChange(on ? null : o)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                on
                  ? "border-neon/50 bg-neon/10 text-neon"
                  : "border-white/10 bg-background/40 text-zinc-300 hover:bg-white/5",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function matchDuration(bucket: string, meta: string): boolean {
  const nums = meta.match(/\d+/g);
  if (!nums) return true;
  const max = parseInt(nums[nums.length - 1]!, 10);
  if (bucket.startsWith("Court")) return max <= 2;
  if (bucket.startsWith("Standard")) return max >= 2 && max <= 4;
  if (bucket.startsWith("Long")) return max > 4;
  return true;
}
