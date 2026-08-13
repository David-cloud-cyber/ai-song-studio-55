import { cn } from "@/lib/utils";

type LoopsterLogoProps = {
  compact?: boolean;
  className?: string;
  imageClassName?: string;
};

export function LoopsterLogo({ compact = false, className, imageClassName }: LoopsterLogoProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <img
        src={compact ? "/loopster-mark.svg" : "/loopster-logo-source.png"}
        alt="Loopster"
        className={cn(
          compact ? "size-8" : "h-8 w-[180px] max-w-full object-contain object-center",
          imageClassName,
        )}
      />
    </span>
  );
}
