import { useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { soon } from "@/lib/toast";

const chips = ["Phonk", "Agressif", "120 BPM", "Voix F", "Cinématique", "Lo-fi", "Trap"];

export function PromptComposer({ compact = true }: { compact?: boolean }) {
  const [value, setValue] = useState("");
  const [active, setActive] = useState<string[]>(["Phonk", "120 BPM"]);

  const toggle = (c: string) =>
    setActive((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]));

  return (
    <div className="pointer-events-auto overflow-hidden rounded-2xl border border-white/10 bg-surface/95 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-white/5 px-3 py-2.5">
        {chips.map((c) => {
          const on = active.includes(c);
          return (
            <button
              key={c}
              onClick={() => toggle(c)}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                on
                  ? "border-neon/40 bg-neon/10 text-neon"
                  : "border-white/5 bg-white/[0.03] text-zinc-400 hover:text-zinc-200",
              )}
            >
              {c}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 p-2.5">
        <Sparkles className="ml-1 size-4 shrink-0 text-neon/70" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            compact ? "Décris ton prochain hit…" : "Décris le morceau, le clip, le mood…"
          }
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-zinc-600 focus:outline-none"
        />
        <button
          onClick={() => soon("Génération bientôt disponible")}
          className="neon-pulse grid size-9 shrink-0 place-items-center rounded-xl bg-neon text-background"
          aria-label="Générer"
        >
          <ArrowUp className="size-4" strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
