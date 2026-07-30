import { Link } from "@tanstack/react-router";
import type { Template } from "@/data/mock";
import { cn } from "@/lib/utils";

export function TemplateTile({ template, featured }: { template: Template; featured?: boolean }) {
  return (
    <Link
      to="/create"
      search={{ template: template.id }}
      className={cn(
        "group flex flex-col items-start rounded-2xl border border-white/5 bg-surface p-4 text-left transition-colors hover:bg-surface-2",
        featured && "ring-1 ring-neon/40",
      )}
    >
      <div
        className={cn(
          "mb-3 flex size-9 items-center justify-center rounded-lg font-mono text-[11px] font-semibold",
          featured ? "bg-neon/15 text-neon" : "bg-white/5 text-zinc-400",
        )}
      >
        {template.code}
      </div>
      <span className="text-sm font-semibold text-foreground">{template.title}</span>
      <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {template.subtitle}
      </span>
    </Link>
  );
}
