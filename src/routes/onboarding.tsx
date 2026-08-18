import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Music2, Sparkles } from "lucide-react";
import { useState } from "react";
import { markOnboardingDone } from "@/components/studio/OnboardingGate";
import { cn } from "@/lib/utils";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/onboarding")({
  head: () =>
    seoHead({
      title: "Bienvenue dans Loopster",
      description: "Prépare ton espace de création Loopster.",
      path: "/onboarding",
      noIndex: true,
    }),
  component: OnboardingPage,
});

const styles = ["Afro pop", "R&B", "Synthwave", "Phonk", "Lo-fi", "Cinematic", "House", "Rap"];
const moods = ["Solaire", "Mélancolique", "Énergique", "Rêveur", "Sombre", "Chill"];
const voices = ["Voix féminine", "Voix masculine", "Chœur", "Instrumental"];

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [style, setStyle] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [voice, setVoice] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  const canContinue =
    step === 0 ? !!style : step === 1 ? !!mood && !!voice : prompt.trim().length > 4;
  const finish = () => {
    try {
      window.localStorage.setItem(
        "loopster.onboarding.preferences",
        JSON.stringify({ style, mood, voice, prompt: prompt.trim() }),
      );
    } catch {
      /* La création reste disponible. */
    }
    markOnboardingDone();
    navigate({ to: "/create" });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8 sm:px-8 sm:py-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
          <Music2 className="size-4" /> Ton espace Loopster
        </div>
        <button
          type="button"
          onClick={finish}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Passer pour l’instant
        </button>
      </div>
      <div className="mt-8 flex gap-1.5" aria-label={`Étape ${step + 1} sur 3`}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={cn("h-1 flex-1 rounded-full", index <= step ? "bg-primary" : "bg-border")}
          />
        ))}
      </div>
      <div className="flex-1 pt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <Step
                title="Quel univers veux-tu explorer ?"
                description="Choisis une direction pour que Loopster te propose de meilleurs points de départ."
              >
                <ChoiceGrid items={styles} value={style} onChange={setStyle} />
              </Step>
            )}
            {step === 1 && (
              <Step
                title="Quelle énergie te ressemble ?"
                description="Tu pourras toujours changer d’avis dans ton studio."
              >
                <ChoiceGroup label="Ambiance" items={moods} value={mood} onChange={setMood} />
                <ChoiceGroup label="Voix" items={voices} value={voice} onChange={setVoice} />
              </Step>
            )}
            {step === 2 && (
              <Step
                title="Donne-nous une première idée"
                description="Même une phrase suffit. Tu pourras l’améliorer ensuite."
              >
                <div className="rounded-3xl border border-border bg-surface p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="size-4 text-primary" /> Ton point de départ
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={6}
                    placeholder="Une chanson R&B douce sur le fait de recommencer…"
                    className="mt-4 w-full resize-none bg-transparent text-sm leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Une ambiance nocturne", "Un refrain accrocheur", "Une énergie dansante"].map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() =>
                          setPrompt((current) =>
                            current ? `${current}, ${suggestion.toLowerCase()}` : suggestion,
                          )
                        }
                        className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary"
                      >
                        + {suggestion}
                      </button>
                    ),
                  )}
                </div>
              </Step>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-3 border-t border-border-subtle pt-6">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((current) => current - 1)}
            className="rounded-full border border-border bg-surface px-4 py-3 text-sm"
          >
            Retour
          </button>
        )}
        <button
          type="button"
          onClick={() => (step === 2 ? finish() : setStep((current) => current + 1))}
          disabled={!canContinue}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          {step === 2 ? "Entrer dans le studio" : "Continuer"}
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Step({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
function ChoiceGrid({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "rounded-2xl border p-4 text-left text-sm font-medium",
            value === item
              ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
              : "border-border bg-surface hover:border-primary/40",
          )}
        >
          {value === item && <Check className="mb-3 size-4" />}
          {item}
        </button>
      ))}
    </div>
  );
}
function ChoiceGroup({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: string[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-7">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm",
              value === item
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
