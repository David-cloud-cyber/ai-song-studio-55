import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export function CollabCard() {
  return (
    <Link
      to="/collab"
      className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-surface p-4 text-left ring-1 ring-white/5 transition-colors hover:bg-surface-2"
    >
      <div className="flex -space-x-2">
        <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-[10px] font-semibold text-background ring-2 ring-background">
          CL
        </div>
        <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-fuchsia-400 to-purple-600 text-[10px] font-semibold text-background ring-2 ring-background">
          +
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="size-1.5 animate-pulse rounded-full bg-neon" />
          <p className="text-sm font-semibold">Espace collab actif</p>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          Ouvrez le salon communautaire en temps réel
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-zinc-500" />
    </Link>
  );
}
