import { cn } from "@/lib/utils";
import { useMediaUrl } from "@/hooks/use-media-url";

interface Props {
  gradient: string;
  title?: string;
  imageUrl?: string | null;
  className?: string;
  children?: React.ReactNode;
}

export function CoverArt({ gradient, title, imageUrl, className, children }: Props) {
  const resolvedImageUrl = useMediaUrl(imageUrl ?? null);
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-gradient-to-br outline outline-1 -outline-offset-1 outline-white/10",
        gradient,
        className,
      )}
    >
      {resolvedImageUrl && (
        <img
          src={resolvedImageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)] mix-blend-overlay" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_90%,rgba(0,0,0,0.6),transparent_55%)]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(115deg,rgba(255,255,255,0.05)_0_1px,transparent_1px_6px)]" />
      {title && (
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/70">
            Loopster · AI
          </div>
          <div className="text-sm font-semibold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            {title}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
