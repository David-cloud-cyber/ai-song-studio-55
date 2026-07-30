import { WaveformBars } from "./WaveformBars";
import { projects } from "@/data/mock";
import { CoverArt } from "./CoverArt";
import { Link } from "@tanstack/react-router";

export function LivePlayerBar() {
  const p = projects[0];
  return (
    <Link
      to="/library/$projectId"
      params={{ projectId: p.id }}
      className="pointer-events-auto mx-auto flex items-center gap-3 rounded-xl border border-white/5 bg-surface/70 p-2 backdrop-blur-xl"
    >
      <CoverArt gradient={p.coverGradient} className="size-10 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-semibold">{p.title}</div>
        <div className="h-3 pt-0.5">
          <WaveformBars peaks={p.waveform.slice(0, 24)} animated />
        </div>
      </div>
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        00:45 / {p.duration}
      </span>
    </Link>
  );
}
