import { Link } from "@tanstack/react-router";
import type { Project } from "@/data/mock";
import { CoverArt } from "./CoverArt";
import { WaveformBars } from "./WaveformBars";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";

export function ProjectCard({ project, className }: { project: Project; className?: string }) {
  return (
    <Link
      to="/library/$projectId"
      params={{ projectId: project.id }}
      className={cn("group block w-44 shrink-0", className)}
    >
      <CoverArt gradient={project.coverGradient} className="aspect-square">
        <div className="absolute inset-x-2 bottom-2 h-8">
          <WaveformBars peaks={project.waveform.slice(0, 22)} />
        </div>
        <div className="absolute left-2 top-2">
          <StatusBadge status={project.status} />
        </div>
      </CoverArt>
      <h3 className="mt-3 truncate text-sm font-semibold text-foreground">{project.title}</h3>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {project.genre} · {project.duration}
      </p>
    </Link>
  );
}

export function ProjectGridCard({ project }: { project: Project }) {
  return (
    <Link to="/library/$projectId" params={{ projectId: project.id }} className="group block">
      <CoverArt gradient={project.coverGradient} className="aspect-square">
        <div className="absolute inset-x-2 bottom-2 h-7">
          <WaveformBars peaks={project.waveform.slice(0, 18)} />
        </div>
        <div className="absolute left-2 top-2">
          <StatusBadge status={project.status} />
        </div>
      </CoverArt>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{project.title}</h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {project.genre}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-zinc-500">{project.duration}</span>
      </div>
    </Link>
  );
}
