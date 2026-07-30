import { collaborators } from "@/data/mock";
import { ChevronRight } from "lucide-react";
import { soon } from "@/lib/toast";

export function CollabCard() {
  return (
    <button
      onClick={() => soon("Espace collab bientôt disponible")}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-surface p-4 text-left ring-1 ring-white/5 transition-colors hover:bg-surface-2"
    >
      <div className="flex -space-x-2">
        {collaborators.slice(0, 3).map((c) => (
          <div
            key={c.id}
            className={`grid size-8 place-items-center rounded-full bg-gradient-to-br ring-2 ring-background ${c.color} text-[10px] font-semibold text-background`}
          >
            {c.name
              .split(" ")
              .map((s) => s[0])
              .join("")}
          </div>
        ))}
        <div className="grid size-8 place-items-center rounded-full bg-white/5 text-[10px] text-zinc-300 ring-2 ring-background">
          +4
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="size-1.5 animate-pulse rounded-full bg-neon" />
          <p className="text-sm font-semibold">Session collab active</p>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          Naomi & Ilyas travaillent sur "Midnight City"
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-zinc-500" />
    </button>
  );
}
