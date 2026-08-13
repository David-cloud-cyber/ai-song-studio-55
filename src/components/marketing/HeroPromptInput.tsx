import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const vibes = ["Phonk", "Synthwave", "Lo-fi", "R&B", "Cinematic"];

const suggestions = [
  "Un phonk sombre avec des cloches à 140 BPM",
  "Une ballade R&B mélancolique avec voix féminine",
  "Instrumental synthwave, drive de nuit à Tokyo",
];

export function HeroPromptInput() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [vibe, setVibe] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 280);
    el.style.height = `${Math.max(next, 44)}px`;
  }, [prompt]);

  const submit = () => {
    try {
      window.sessionStorage.setItem(
        "loopster.hero-prompt",
        JSON.stringify({ prompt: prompt.trim(), vibe }),
      );
    } catch {
      /* noop */
    }
    navigate({ to: "/auth" });
  };

  const showSuggestions = focused || prompt.length === 0;

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-2xl">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 rounded-[48px] bg-[radial-gradient(55%_55%_at_50%_50%,rgba(34,211,238,0.16),transparent_70%)] blur-2xl"
      />

      <div
        className={cn(
          "group rounded-3xl border bg-surface/60 p-2 backdrop-blur-xl transition-all duration-500 ease-out",
          focused
            ? "border-neon/25 shadow-[0_30px_90px_-30px_rgba(34,211,238,0.35)] ring-1 ring-neon/10"
            : "border-white/[0.07] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]",
        )}
      >
        <div className="flex min-w-0 items-end gap-2 rounded-2xl px-3 py-2.5">
          <textarea
            ref={taRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Décrivez la piste que vous voulez créer…"
            className="min-h-[44px] flex-1 resize-none overflow-y-hidden bg-transparent py-2.5 text-[15px] leading-relaxed text-foreground placeholder:text-zinc-500 transition-colors focus:outline-none"
            style={{ transition: "height 240ms cubic-bezier(0.32,0.72,0,1)" }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!prompt.trim()}
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-full transition-all duration-300 ease-out",
              prompt.trim()
                ? "bg-neon text-background shadow-[0_0_24px_rgba(34,211,238,0.45)] hover:scale-105"
                : "bg-white/[0.06] text-zinc-500",
            )}
            aria-label="Générer"
          >
            <ArrowUp className="size-4" strokeWidth={2.6} />
          </button>
        </div>

        {/* Vibe chips – discrète, une seule ligne */}
        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2 pt-1">
          {vibes.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setVibe((v) => (v === g ? null : g))}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-300",
                vibe === g
                  ? "bg-neon/15 text-neon"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions – apparaissent en fondu, discrètes sous l'input */}
      <div
        className={cn(
          "grid grid-cols-1 gap-1 overflow-hidden transition-all duration-500 ease-out sm:grid-cols-3",
          showSuggestions ? "mt-2.5 max-h-24 opacity-100" : "mt-0 max-h-0 opacity-0",
        )}
      >
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPrompt(s)}
            className="group flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.015] px-2.5 py-1.5 text-left text-[11px] leading-tight text-zinc-400 transition-all duration-300 hover:border-neon/20 hover:bg-white/[0.04] hover:text-foreground"
          >
            <Sparkles className="size-2.5 shrink-0 text-neon/60 transition-colors group-hover:text-neon" />
            <span className="line-clamp-1">{s}</span>
          </button>
        ))}
      </div>

      <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
        80 crédits offerts chaque jour · Aucune carte requise
      </p>
    </div>
  );
}
