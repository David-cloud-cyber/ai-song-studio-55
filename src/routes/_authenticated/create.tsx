import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { useFreePublicationNotice } from "@/hooks/use-free-publication-notice";
import { generateTrack, generateUploadedTrack, COSTS } from "@/lib/suno.functions";
import { supabase } from "@/integrations/supabase/client";
import { genres, moods, voices, templates } from "@/data/mock";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import {
  Sparkles,
  Music,
  Mic2,
  Clock,
  Sliders,
  MicOff,
  Loader2,
  Cpu,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FreePublicationNotice } from "@/components/studio/FreePublicationNotice";

const GRADIENTS = [
  "from-cyan-400 via-blue-600 to-fuchsia-700",
  "from-rose-500 via-orange-500 to-amber-500",
  "from-fuchsia-500 via-purple-700 to-cyan-500",
  "from-emerald-400 via-teal-500 to-purple-700",
  "from-amber-400 via-rose-500 to-indigo-700",
];

const MODELS = [
  { id: "V4_5", label: "v4.5", hint: "Équilibré" },
  { id: "V4_5PLUS", label: "v4.5+", hint: "Plus riche" },
  { id: "V5", label: "v5", hint: "Qualité max" },
  { id: "V5_5", label: "v5.5", hint: "Studio avancé" },
] as const;

const STRUCTURES = [
  { id: "Couplet · refrain", label: "Couplet · refrain" },
  { id: "Intro · couplet · refrain · pont", label: "Intro · refrain · pont" },
  { id: "Structure libre", label: "Structure libre" },
] as const;

export const Route = createFileRoute("/_authenticated/create")({
  validateSearch: z.object({
    template: z.string().optional(),
    sourceProjectId: z.string().uuid().optional(),
    mode: z.enum(["remix", "recreate", "variant"]).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Créer · Loopster" },
      {
        name: "description",
        content: "Composez votre prochain titre : prompt, genre, mood, voix, instrumentale.",
      },
      { property: "og:title", content: "Créer un morceau · Loopster" },
      {
        property: "og:description",
        content: "Génération musicale IA : chanson, instrumentale, extension et stems.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatePage,
});

function CreatePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const freePublicationNotice = useFreePublicationNotice(profile);
  const generate = useServerFn(generateTrack);
  const generateUploaded = useServerFn(generateUploadedTrack);

  const [prompt, setPrompt] = useState(
    "Un morceau phonk nocturne avec basses saturées, sensation de course en voiture sous la pluie.",
  );
  const [title, setTitle] = useState("Nouveau projet");
  const [genre, setGenre] = useState(genres[0]);
  const [mood, setMood] = useState(moods[0]);
  const [voice, setVoice] = useState(voices[0]);
  const [personaId, setPersonaId] = useState("");
  const [voiceProfileId, setVoiceProfileId] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [model, setModel] = useState<(typeof MODELS)[number]["id"]>("V5_5");
  const [duration, setDuration] = useState(180);
  const [bpm, setBpm] = useState(120);
  const [structure, setStructure] = useState<(typeof STRUCTURES)[number]["id"]>(STRUCTURES[0].id);
  const [generating, setGenerating] = useState(false);
  const [sourceAudio, setSourceAudio] = useState<File | null>(null);

  const { data: sourceProject } = useQuery({
    queryKey: ["create-source-project", search.sourceProjectId],
    enabled: Boolean(search.sourceProjectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,prompt,genre,mood,voice,instrumental,model,duration_seconds,style")
        .eq("id", search.sourceProjectId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: personas = [] } = useQuery({
    queryKey: ["music-personas", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_personas")
        .select("id,name,provider_persona_id,status")
        .eq("user_id", user!.id)
        .eq("status", "ready")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: voiceProfiles = [] } = useQuery({
    queryKey: ["voice-profiles", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_profiles")
        .select("id,name,status")
        .eq("user_id", user!.id)
        .eq("status", "ready")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const template =
    templates.find((t) => t.id === search.template && (t.id === "song" || t.id === "instru")) ??
    templates.find((t) => t.id === "song") ??
    templates[0];

  useEffect(() => {
    setInstrumental(template.id === "instru");
  }, [template.id]);

  useEffect(() => {
    if (search.sourceProjectId) return;
    try {
      const raw = window.localStorage.getItem("loopster.onboarding.preferences");
      if (!raw) return;
      const preferences = JSON.parse(raw) as {
        prompt?: unknown;
        style?: unknown;
        mood?: unknown;
        voice?: unknown;
      };
      if (typeof preferences.prompt === "string" && preferences.prompt.trim()) {
        setPrompt(preferences.prompt.trim());
      }

      const findOption = (
        value: unknown,
        options: readonly string[],
        aliases: Record<string, string>,
      ) => {
        if (typeof value !== "string") return null;
        const normalized = value.trim().toLocaleLowerCase();
        const alias = aliases[normalized] ?? value.trim();
        return (
          options.find((option) => option.toLocaleLowerCase() === alias.toLocaleLowerCase()) ?? null
        );
      };
      const selectedGenre = findOption(preferences.style, genres, {
        "afro pop": "Pop",
        house: "Techno",
        rap: "Drill",
      });
      const selectedMood = findOption(preferences.mood, moods, {
        énergique: "Agressif",
      });
      const selectedVoice = findOption(preferences.voice, voices, {});
      if (selectedGenre) setGenre(selectedGenre);
      if (selectedMood) setMood(selectedMood);
      if (selectedVoice) setVoice(selectedVoice);
      window.localStorage.removeItem("loopster.onboarding.preferences");
    } catch {
      // Une préférence locale invalide ne doit jamais bloquer la création.
    }
  }, [search.sourceProjectId]);

  useEffect(() => {
    if (!sourceProject) return;
    setTitle(
      search.mode === "remix"
        ? `${sourceProject.title} · remix`
        : search.mode === "variant"
          ? `${sourceProject.title} · variante`
          : `${sourceProject.title} · recréation`,
    );
    setPrompt(sourceProject.prompt ?? "");
    if (sourceProject.genre) setGenre(sourceProject.genre);
    if (sourceProject.mood) setMood(sourceProject.mood);
    if (sourceProject.voice) setVoice(sourceProject.voice);
    setInstrumental(sourceProject.instrumental);
    if (sourceProject.model && MODELS.some((model) => model.id === sourceProject.model)) {
      setModel(sourceProject.model as (typeof MODELS)[number]["id"]);
    }
    if (sourceProject.duration_seconds) setDuration(sourceProject.duration_seconds);
  }, [search.mode, sourceProject]);
  const cost = instrumental ? COSTS.instrumental : COSTS.song;
  const enough = (profile?.credits ?? 0) >= cost;

  const runGeneration = async () => {
    if (!user) return;
    if (!enough) {
      toast.error("Il te manque un peu d'élan", {
        description: `Il te faut encore ${cost} crédits pour lancer ce morceau.`,
      });
      return;
    }
    setGenerating(true);
    try {
      const style = [genre, mood, `${bpm} BPM`, structure, instrumental ? "instrumental" : voice]
        .filter(Boolean)
        .join(", ");

      let res;
      if (sourceAudio) {
        if (!sourceAudio.type.startsWith("audio/") || sourceAudio.size > 50 * 1024 * 1024) {
          throw new Error("Choisissez un fichier audio de moins de 50 Mo.");
        }
        const extension = sourceAudio.name.split(".").pop()?.toLowerCase() || "audio";
        const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const upload = await supabase.storage.from("audio-inputs").upload(path, sourceAudio, {
          cacheControl: "3600",
          contentType: sourceAudio.type || "audio/mpeg",
          upsert: false,
        });
        if (upload.error) throw new Error(`Import audio impossible : ${upload.error.message}`);
        const signed = await supabase.storage.from("audio-inputs").createSignedUrl(path, 3600);
        if (signed.error || !signed.data?.signedUrl) {
          throw new Error(`URL audio impossible : ${signed.error?.message ?? "erreur inconnue"}`);
        }
        res = await generateUploaded({
          data: {
            title,
            prompt,
            uploadUrl: signed.data.signedUrl,
            style,
            genre,
            mood,
            instrumental,
            model,
            coverGradient: GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)],
            parentProjectId: search.sourceProjectId,
            requestId: crypto.randomUUID(),
          },
        });
      } else {
        res = await generate({
          data: {
            title,
            prompt,
            style,
            genre,
            mood,
            voice,
            instrumental,
            customMode: false,
            model,
            personaId: personaId || undefined,
            voiceProfileId: voiceProfileId || undefined,
            durationSeconds: duration,
            coverGradient: GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)],
            parentProjectId: search.sourceProjectId,
            requestId: crypto.randomUUID(),
          },
        });
      }

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });

      toast.success("C'est parti, ça compose !", {
        description: `${res.creditsSpent} crédits utilisés · ton morceau arrive bientôt.`,
      });
      navigate({ to: "/library/$projectId", params: { projectId: res.projectId } });
    } catch (error) {
      console.error("[create] generation failed", error);
      const message = error instanceof Error ? error.message : "";
      const description = message.includes("Crédit")
        ? "Vérifie ton solde puis réessaie."
        : "Le studio musical est momentanément indisponible. Si la création a échoué, tes crédits sont rendus automatiquement. Réessaie dans un instant.";
      toast.error("Le morceau fait une petite pause", {
        description,
      });
    } finally {
      setGenerating(false);
    }
  };

  const launch = () => {
    freePublicationNotice.request(() => void runGeneration());
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
          <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3">
            <input
              id="source-audio"
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={(event) => setSourceAudio(event.target.files?.[0] ?? null)}
            />
            {sourceAudio ? (
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-zinc-300">
                  <Music className="size-4 shrink-0 text-neon" />
                  <span className="truncate">{sourceAudio.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSourceAudio(null)}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/10 hover:text-foreground"
                  aria-label="Retirer l'audio"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="source-audio"
                className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400 hover:text-foreground"
              >
                <Upload className="size-4 text-neon" />
                Importer un audio à remixer ou transformer
              </label>
            )}
            <p className="mt-2 text-[10px] text-zinc-600">
              MP3, WAV ou M4A · durée recommandée : 8 min maximum
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 pt-6">
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-neon/70">
          Paramètres
        </h3>
        <div className="space-y-3">
          <button
            onClick={() => setInstrumental((v) => !v)}
            className={cn(
              "flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors",
              instrumental
                ? "border-neon/40 bg-neon/10"
                : "border-white/5 bg-surface hover:bg-surface-2",
            )}
          >
            <span className="flex items-center gap-2">
              <MicOff className={cn("size-4", instrumental ? "text-neon" : "text-zinc-400")} />
              <span className="text-sm font-medium">Instrumentale (sans voix)</span>
            </span>
            <span
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                instrumental ? "bg-neon" : "bg-white/10",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-background transition-all",
                  instrumental ? "left-[22px]" : "left-0.5",
                )}
              />
            </span>
          </button>

          <div className="rounded-2xl border border-white/5 bg-surface p-4">
            <div className="mb-2 flex items-center gap-2">
              <Cpu className="size-4 text-zinc-400" />
              <span className="text-sm font-medium">Modèle</span>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-4">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={cn(
                    "min-w-0 flex-1 rounded-xl border px-2 py-2 text-xs transition-colors",
                    model === m.id
                      ? "border-neon/40 bg-neon/10 text-neon"
                      : "border-white/5 bg-white/[0.03] text-zinc-400",
                  )}
                >
                  <span className="block font-semibold">{m.label}</span>
                  <span className="block text-[10px] opacity-70">{m.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-surface p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sliders className="size-4 text-zinc-400" />
              <span className="text-sm font-medium">Structure</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {STRUCTURES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStructure(option.id)}
                  aria-pressed={structure === option.id}
                  className={cn(
                    "min-h-11 rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                    structure === option.id
                      ? "border-neon/40 bg-neon/10 text-neon"
                      : "border-white/5 bg-white/[0.03] text-zinc-400 hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-5 text-zinc-500">
              La structure guide l’arrangement sans garantir une forme identique à chaque rendu.
            </p>
          </div>

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
          {!instrumental && (
            <Select
              icon={<Mic2 className="size-4" />}
              label="Voix"
              value={voice}
              options={voices}
              onChange={setVoice}
            />
          )}
          {personas.length > 0 && (
            <Select
              icon={<Sparkles className="size-4" />}
              label="Persona musicale"
              value={
                personaId
                  ? (personas.find((item) => item.provider_persona_id === personaId)?.name ?? "")
                  : "Aucune"
              }
              options={["Aucune", ...personas.map((item) => item.name)]}
              onChange={(value) =>
                setPersonaId(
                  value === "Aucune"
                    ? ""
                    : (personas.find((item) => item.name === value)?.provider_persona_id ?? ""),
                )
              }
            />
          )}
          {!instrumental && voiceProfiles.length > 0 && (
            <Select
              icon={<Mic2 className="size-4" />}
              label="Voix personnelle"
              value={
                voiceProfileId
                  ? (voiceProfiles.find((item) => item.id === voiceProfileId)?.name ?? "")
                  : "Aucune"
              }
              options={["Aucune", ...voiceProfiles.map((item) => item.name)]}
              onChange={(value) =>
                setVoiceProfileId(
                  value === "Aucune"
                    ? ""
                    : (voiceProfiles.find((item) => item.name === value)?.id ?? ""),
                )
              }
            />
          )}

          <div className="rounded-2xl border border-white/5 bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-zinc-400" />
                <span className="text-sm font-medium">Durée visée</span>
              </div>
              <span className="font-mono text-xs text-neon">
                {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={480}
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
        </div>
      </section>

      <section className="px-5 pt-6">
        <button
          onClick={launch}
          disabled={generating || profileLoading || !user}
          className="neon-pulse flex w-full items-center justify-center gap-2 rounded-2xl bg-neon py-4 text-sm font-semibold text-background disabled:opacity-60"
        >
          {generating ? (
            <>
              <Loader2 className="size-4 animate-spin" /> On compose ton morceau…
            </>
          ) : (
            <>
              <Sparkles className="size-4" strokeWidth={2.6} />
              {instrumental ? "Générer l'instrumentale" : "Générer la chanson"} · {cost} crédits
            </>
          )}
        </button>
        {!enough && profile && (
          <p className="mt-3 text-center text-xs text-rose-300">
            Il vous reste {profile.credits} crédits. Rechargez pour générer.
          </p>
        )}
      </section>
      <FreePublicationNotice
        open={freePublicationNotice.open}
        saving={freePublicationNotice.saving}
        onConfirm={() => void freePublicationNotice.confirm()}
        onCancel={freePublicationNotice.cancel}
      />
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
