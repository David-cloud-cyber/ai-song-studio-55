import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { onboardingStyles, moods, voices } from "@/data/mock";
import { markOnboardingDone } from "@/components/studio/OnboardingGate";
import { ArrowRight, Check, Sparkles, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Bienvenue · Loopster" },
      { name: "description", content: "Configurez votre studio en quelques étapes." },
    ],
  }),
  component: OnboardingPage,
});

const STEPS = ["style", "voice", "prompt", "credits"] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [style, setStyle] = useState<string | null>(null);
  const [voice, setVoice] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  const canNext =
    (step === 0 && style) ||
    (step === 1 && voice && mood) ||
    (step === 2 && prompt.trim().length > 4) ||
    step === 3;

  const finish = () => {
    markOnboardingDone();
    navigate({ to: "/studio" });
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pt-10 md:max-w-lg md:pt-16">
      <div className="mb-8 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-neon">
          Loopster · Onboarding
        </div>
        <button
          onClick={finish}
          className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
        >
          Passer
        </button>
      </div>

      <div className="mb-8 flex gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= step ? "bg-neon" : "bg-white/10",
            )}
          />
        ))}
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Quel est ton son&nbsp;?</h1>
                <p className="mt-2 text-sm text-zinc-400">
                  Choisis un style pour calibrer ton studio IA.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {onboardingStyles.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={cn(
                        "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all",
                        style === s.id
                          ? "border-neon/60 ring-1 ring-neon/40"
                          : "border-white/5 bg-surface hover:bg-surface-2",
                      )}
                    >
                      <div
                        className={`absolute inset-0 -z-10 bg-gradient-to-br ${s.gradient} opacity-${style === s.id ? "40" : "15"} transition-opacity`}
                      />
                      <div className="text-2xl">{s.emoji}</div>
                      <div className="mt-2 text-sm font-semibold">{s.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Ta voix, ton mood</h1>
                <p className="mt-2 text-sm text-zinc-400">On peaufine ton profil créatif.</p>
                <div className="mt-6">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    Voix préférée
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {voices.map((v) => (
                      <button
                        key={v}
                        onClick={() => setVoice(v)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition-colors",
                          voice === v
                            ? "border-neon/60 bg-neon/10 text-neon"
                            : "border-white/10 bg-surface text-zinc-300 hover:bg-surface-2",
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-6">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    Ambiance
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {moods.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMood(m)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition-colors",
                          mood === m
                            ? "border-neon/60 bg-neon/10 text-neon"
                            : "border-white/10 bg-surface text-zinc-300 hover:bg-surface-2",
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Ton premier prompt</h1>
                <p className="mt-2 text-sm text-zinc-400">
                  Décris le morceau que tu veux créer. On préparera un draft.
                </p>
                <div className="mt-6 rounded-2xl border border-white/10 bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-neon" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-neon">
                      Prompt
                    </span>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Un track phonk sombre, 140 BPM, avec un drop cinématique…"
                    rows={5}
                    className="mt-2 w-full resize-none bg-transparent text-sm text-foreground placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Cinématique", "808 lourd", "Voix chuchotée", "Drop épique"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setPrompt((p) => (p ? p + ", " + c.toLowerCase() : c))}
                      className="rounded-full border border-white/10 bg-surface px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-zinc-400 hover:text-neon"
                    >
                      + {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center">
                <div className="mx-auto grid size-20 place-items-center rounded-full bg-neon/15 ring-1 ring-neon/40">
                  <Gift className="size-9 text-neon" />
                </div>
                <h1 className="mt-6 text-3xl font-semibold tracking-tight">80 crédits offerts chaque jour</h1>
                <p className="mt-2 text-sm text-zinc-400">
                  De quoi générer une chanson complète, une pochette et un clip.
                </p>
                <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left">
                  {[
                    "80 crédits ajoutés à ton studio chaque jour",
                    "Style " + (style ?? "personnalisé") + " calibré",
                    "1 rendu prioritaire offert",
                    "Accès à la Library & au Feed",
                  ].map((t) => (
                    <li
                      key={t}
                      className="flex items-start gap-2 rounded-xl border border-white/5 bg-surface px-3 py-2 text-sm"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-neon" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 mt-8 flex items-center gap-3 py-6">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="rounded-full border border-white/10 bg-surface px-4 py-3 text-sm"
          >
            Retour
          </button>
        )}
        <button
          onClick={next}
          disabled={!canNext}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-opacity",
            canNext ? "bg-neon text-background" : "bg-white/5 text-zinc-500",
          )}
        >
          {step === STEPS.length - 1 ? "Entrer dans le studio" : "Continuer"}
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
