import { useNavigate } from "@tanstack/react-router";
import { ArrowUp, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const vibes = ["Phonk", "Synthwave", "Lo-fi", "R&B", "Cinématique"];
const suggestions = [
  "Un phonk sombre avec des cloches à 140 BPM",
  "Une ballade R&B mélancolique avec voix féminine",
  "Instrumental synthwave pour une virée de nuit",
];

export function HeroPromptInput() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [vibe, setVibe] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.min(180, Math.max(52, element.scrollHeight))}px`;
  }, [prompt]);

  const submit = () => {
    const value = prompt.trim();
    if (!value) return;
    try {
      window.sessionStorage.setItem(
        "loopster.hero-prompt",
        JSON.stringify({ prompt: value, vibe }),
      );
    } catch {
      // La création reste possible même si le navigateur ne conserve pas la suggestion.
    }
    navigate({ to: "/auth" });
  };

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div
        className={cn(
          "rounded-[24px] border bg-surface/90 p-2 transition-colors",
          focused ? "border-primary/70 ring-2 ring-primary/15" : "border-border-subtle",
        )}
      >
        <div className="flex items-end gap-2 rounded-[18px] px-3 py-2.5 sm:px-4">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={1}
            aria-label="Décris la musique que tu veux créer"
            placeholder="Décris la musique que tu veux créer…"
            className="min-h-[52px] min-w-0 flex-1 resize-none overflow-y-hidden bg-transparent py-3 text-[15px] leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!prompt.trim()}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Commencer la création"
          >
            <ArrowUp className="size-4" strokeWidth={2.6} />
          </button>
        </div>

        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 pb-2 pt-1 sm:px-4">
          {vibes.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setVibe((current) => (current === item ? null : item))}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                vibe === item
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-surface-elevated hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "mt-3 grid gap-2 transition-opacity sm:grid-cols-3",
          focused ? "opacity-100" : "opacity-75",
        )}
      >
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setPrompt(suggestion)}
            className="flex min-w-0 items-start gap-2 rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2 text-left text-xs leading-5 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
            <span className="line-clamp-2">{suggestion}</span>
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        80 crédits offerts chaque jour · aucune carte bancaire pour commencer
      </p>
    </div>
  );
}
