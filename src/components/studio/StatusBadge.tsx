import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/data/mock";

const map: Record<ProjectStatus, { label: string; className: string; dot: string }> = {
  ready: {
    label: "Prêt",
    className: "text-neon border-neon/30 bg-neon/10",
    dot: "bg-neon",
  },
  rendering: {
    label: "Rendu…",
    className: "text-amber-300 border-amber-400/30 bg-amber-400/10",
    dot: "bg-amber-400 animate-pulse",
  },
  draft: {
    label: "Brouillon",
    className: "text-zinc-400 border-white/10 bg-white/5",
    dot: "bg-zinc-500",
  },
};

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]",
        s.className,
        className,
      )}
    >
      <span className={cn("size-1 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
