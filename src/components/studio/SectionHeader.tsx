import type { ReactNode } from "react";

export function SectionHeader({
  title,
  action,
  eyebrow,
}: {
  title: ReactNode;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-neon/70">
            {eyebrow}
          </div>
        )}
        <h2 className="text-xl font-semibold leading-tight tracking-tight text-balance">{title}</h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
