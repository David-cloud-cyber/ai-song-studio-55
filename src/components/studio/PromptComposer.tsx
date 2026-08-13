import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateTrack, COSTS } from "@/lib/suno.functions";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";

const chips = ["Phonk", "Agressif", "120 BPM", "Voix F", "Cinématique", "Lo-fi", "Trap"];

export function PromptComposer({ compact = true }: { compact?: boolean }) {
  const [value, setValue] = useState("");
  const [active, setActive] = useState<string[]>(["Phonk", "120 BPM"]);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const generate = useServerFn(generateTrack);

  const toggle = (c: string) =>
    setActive((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]));

  const submit = async () => {
    const prompt = value.trim();
    if (!prompt || busy) return;
    if ((profile?.credits ?? 0) < COSTS.song) {
      toast.error("Il te manque un peu d'élan", {
        description: `Il te faut encore ${COSTS.song} crédits pour lancer ce morceau.`,
      });
      return;
    }
    setBusy(true);
    try {
      const title = prompt.split(/[.!?]/)[0].slice(0, 80) || "Nouveau morceau";
      const result = await generate({
        data: {
          title,
          prompt,
          style: active.join(", "),
          genre: active[0],
          mood: active[1],
          voice: active.includes("Voix F") ? "Voix féminine" : undefined,
          instrumental: false,
          customMode: true,
          model: "V4_5",
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      setValue("");
      navigate({ to: "/library/$projectId", params: { projectId: result.projectId } });
    } catch {
      toast.error("Le morceau fait une petite pause", {
        description: "On retente dans un instant ?",
      });
    } finally {
      setBusy(false);
    }
  };

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
          onClick={() => void submit()}
          disabled={!value.trim() || busy || (profile?.credits ?? 0) < COSTS.song}
          className="neon-pulse grid size-9 shrink-0 place-items-center rounded-xl bg-neon text-background disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Générer"
        >
          <ArrowUp className="size-4" strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
