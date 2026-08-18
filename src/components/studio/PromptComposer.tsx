import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateTrack, COSTS } from "@/lib/suno.functions";
import { useProfile } from "@/hooks/use-profile";

const chips = ["Phonk", "Agressif", "120 BPM", "Voix féminine", "Cinématique", "Lo-fi", "Trap"];

export function PromptComposer({ compact = true }: { compact?: boolean }) {
  const [value, setValue] = useState("");
  const [active, setActive] = useState<string[]>(["Phonk", "120 BPM"]);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const generate = useServerFn(generateTrack);

  const toggleChip = (chip: string) => {
    setActive((current) =>
      current.includes(chip) ? current.filter((item) => item !== chip) : [...current, chip],
    );
    if (!value.trim()) {
      setValue(`Crée un morceau ${chip.toLowerCase()}`);
    }
  };

  const submit = async () => {
    const prompt = value.trim();
    if (!prompt || busy) return;
    if ((profile?.credits ?? 0) < COSTS.song) {
      toast.error("Il te manque un peu d’élan", {
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
          voice: active.includes("Voix féminine") ? "Voix féminine" : undefined,
          instrumental: false,
          customMode: false,
          model: "V4_5",
          requestId: crypto.randomUUID(),
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["studio-projects"] }),
        queryClient.invalidateQueries({ queryKey: ["latest-player-project"] }),
      ]);
      setValue("");
      navigate({ to: "/library/$projectId", params: { projectId: result.projectId } });
    } catch (error) {
      console.error("[prompt-composer] generation failed", error);
      const message = error instanceof Error ? error.message : "";
      toast.error("Le morceau fait une petite pause", {
        description: message.includes("Crédit")
          ? "Vérifie ton solde puis réessaie."
          : "Le studio musical est momentanément indisponible. Si la création a échoué, tes crédits sont rendus automatiquement. Réessaie dans un instant.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="pointer-events-auto overflow-hidden rounded-2xl border border-border bg-surface/95 backdrop-blur-xl"
    >
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-border-subtle px-3 py-2.5">
        {chips.map((chip) => {
          const selected = active.includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => toggleChip(chip)}
              aria-pressed={selected}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]",
                selected
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border-subtle bg-surface-subtle text-muted-foreground hover:text-foreground",
              )}
            >
              {chip}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 p-2.5">
        {busy ? (
          <Loader2 className="ml-1 size-4 shrink-0 animate-spin text-primary" aria-hidden />
        ) : (
          <Sparkles className="ml-1 size-4 shrink-0 text-primary" aria-hidden />
        )}
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={
            compact ? "Décris ton prochain morceau…" : "Décris le morceau, le clip ou l’ambiance…"
          }
          aria-label="Décris ton prochain morceau"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="submit"
          disabled={!value.trim() || busy || profileLoading || (profile?.credits ?? 0) < COSTS.song}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
          title={
            profileLoading
              ? "Préparation de ton espace…"
              : !value.trim()
                ? "Écris une idée ou choisis un style"
                : "Créer le morceau"
          }
          aria-label={busy ? "Création en cours" : "Créer le morceau"}
        >
          <ArrowUp className="size-4" strokeWidth={2.6} />
        </button>
      </div>
    </form>
  );
}
