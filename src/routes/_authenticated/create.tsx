import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { genres, moods, voices, templates } from "@/data/mock";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { Sparkles, Music, Mic2, Clock, Sliders, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const GENERATION_COST = 40;
const GRADIENTS = [
  "from-cyan-400 via-blue-600 to-fuchsia-700",
  "from-rose-500 via-orange-500 to-amber-500",
  "from-fuchsia-500 via-purple-700 to-cyan-500",
  "from-emerald-400 via-teal-500 to-purple-700",
  "from-amber-400 via-rose-500 to-indigo-700",
];

export const Route = createFileRoute("/_authenticated/create")({
  validateSearch: z.object({ template: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Créer · BeatStudio AI" },
      {
        name: "description",
        content: "Composez votre prochain titre : prompt, genre, mood, voix.",
      },
    ],
  }),
  component: CreatePage,
});

function CreatePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useProfile();

  const [prompt, setPrompt] = useState(
    "Un morceau phonk nocturne avec basses saturées, sensation de course en voiture sous la pluie.",
  );
  const [title, setTitle] = useState("Nouveau projet");
  const [genre, setGenre] = useState(genres[0]);
  const [mood, setMood] = useState(moods[0]);
  const [voice, setVoice] = useState(voices[0]);
  const [duration, setDuration] = useState(180);
  const [bpm, setBpm] = useState(120);
  const [generating, setGenerating] = useState(false);

  const template = templates.find((t) => t.id === search.template) ?? templates[0];
  const enough = (profile?.credits ?? 0) >= GENERATION_COST;

  const generate = async () => {
    if (!user) return;
    if (!enough) {
      toast.error("Crédits insuffisants", {
        description: `Il faut ${GENERATION_COST} crédits.`,
      });
      return;
    }
    setGenerating(true);
    try {
      const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
      const { data: inserted, error: insertError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title,
          prompt,
          genre,
          mood,
          voice,
          duration_seconds: duration,
          status: "rendering",
          cover_gradient: gradient,
          tags: [genre, mood],
          progress: 0,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      const { error: dedError } = await supabase.rpc("deduct_credits", {
        _amount: GENERATION_COST,
        _reason: `Génération · ${title}`,
        _project_id: inserted.id,
      });
      if (dedError) throw dedError;

      // Mark as draft (rendering placeholder — real AI generation in phase 3)
      await supabase
        .from("projects")
        .update({ status: "draft", progress: 100 })
        .eq("id", inserted.id);

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });

      toast.success("Projet créé", {
        description: `${GENERATION_COST} crédits débités. Génération audio à venir en phase 3.`,
      });
      navigate({ to: "/library/$projectId", params: { projectId: inserted.id } });
    } catch (err) {
      toast.error("Erreur", { description: err instanceof Error ? err.message : "Réessayez" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PageTransition>
      <section className="px-5 pt-8">
        <SectionHeader eyebrow={`Template · ${template.title}`} title="Nouvelle création" />

        <div className="rounded-2xl border border-white/10 bg-surface p-4">
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Titre
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mb-3 w-full bg-transparent text-lg font-semibold text-foreground focus:outline-none"
          />
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-zinc-600 focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["Cinématique", "808 heavy", "Voix éthérée", "Refrain accrocheur"].map((s) => (
              <button
                key={s}
                onClick={() => setPrompt((p) => `${p} ${s}.`)}
                className="rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-300 hover:text-neon"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pt-6">
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-neon/70">
          Paramètres
        </h3>
        <div className="space-y-3">
          <Select
            icon={<Music className="size-4" />}
            label="Genre"
            value={genre}
            options={genres}
            onChange={setGenre}
          />
          <Select
            icon={<Sliders className="size-4" />}
            label="Mood"
            value={mood}
            options={moods}
            onChange={setMood}
          />
          <Select
            icon={<Mic2 className="size-4" />}
            label="Voix"
            value={voice}
            options={voices}
            onChange={setVoice}
          />

          <div className="rounded-2xl border border-white/5 bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-zinc-400" />
                <span className="text-sm font-medium">Durée</span>
              </div>
              <span className="font-mono text-xs text-neon">
                {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={360}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="accent-cyan-400 w-full"
            />
          </div>

          <div className="rounded-2xl border border-white/5 bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-zinc-400" />
                <span className="text-sm font-medium">Tempo</span>
              </div>
              <span className="font-mono text-xs text-neon">{bpm} BPM</span>
            </div>
            <input
              type="range"
              min={60}
              max={180}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="accent-cyan-400 w-full"
            />
          </div>

          <button
            onClick={() => toast.info("Upload de référence bientôt disponible")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-surface/60 py-4 text-sm text-zinc-400"
          >
            <Upload className="size-4" /> Ajouter une piste de référence
          </button>
        </div>
      </section>

      <section className="px-5 pt-6">
        <button
          onClick={generate}
          disabled={generating || !user}
          className="neon-pulse flex w-full items-center justify-center gap-2 rounded-2xl bg-neon py-4 text-sm font-semibold text-background disabled:opacity-60"
        >
          {generating ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Création en cours…
            </>
          ) : (
            <>
              <Sparkles className="size-4" strokeWidth={2.6} />
              Créer le projet · {GENERATION_COST} crédits
            </>
          )}
        </button>
        {!enough && profile && (
          <p className="mt-3 text-center text-xs text-rose-300">
            Il vous reste {profile.credits} crédits. Rechargez pour générer.
          </p>
        )}
      </section>
    </PageTransition>
  );
}

function Select({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-zinc-400">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
              value === o
                ? "border-neon/40 bg-neon/10 text-neon"
                : "border-white/5 bg-white/[0.03] text-zinc-400",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
