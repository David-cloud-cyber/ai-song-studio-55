import { cn } from "@/lib/utils";

interface Props {
  peaks: number[];
  className?: string;
  barClass?: string;
  animated?: boolean;
  progress?: number;
}

export function WaveformBars({ peaks, className, barClass, animated, progress }: Props) {
  return (
    <div className={cn("flex h-full w-full items-end gap-[2px]", className)}>
      {peaks.map((p, i) => {
        const played = progress !== undefined && i / peaks.length <= progress;
        return (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-[1px] transition-colors",
              played ? "bg-neon" : "bg-neon/50",
              animated && "wave-bar",
              barClass,
            )}
            style={{
              height: `${Math.round(p * 100)}%`,
              ...(animated
                ? {
                    animationDelay: `${(i % 8) * 0.08}s`,
                    animationDuration: `${0.8 + (i % 5) * 0.12}s`,
                  }
                : {}),
            }}
          />
        );
      })}
    </div>
  );
}
