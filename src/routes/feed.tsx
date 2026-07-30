import { createFileRoute } from "@tanstack/react-router";
import { feedItems } from "@/data/mock";
import { CoverArt } from "@/components/studio/CoverArt";
import { WaveformBars } from "@/components/studio/WaveformBars";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { Heart, Repeat2, MessageCircle, Play } from "lucide-react";
import { soon } from "@/lib/toast";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed · BeatStudio AI" },
      { name: "description", content: "Découvrez les créations de la communauté BeatStudio." },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  return (
    <PageTransition>
      <section className="px-5 pb-2 pt-8">
        <SectionHeader eyebrow="Community" title="Feed" />
      </section>
      <div className="space-y-4 px-5 pb-6">
        {feedItems.map((f) => (
          <article
            key={f.id}
            className="overflow-hidden rounded-2xl border border-white/5 bg-surface"
          >
            <div className="flex items-center gap-3 p-3">
              <div
                className={`grid size-9 place-items-center rounded-full bg-gradient-to-br ${f.authorColor} text-xs font-semibold text-background`}
              >
                {f.author
                  .split(" ")
                  .map((s) => s[0])
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{f.author}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {f.authorHandle} · {f.createdAt}
                </div>
              </div>
            </div>
            <CoverArt gradient={f.coverGradient} className="aspect-[4/3] rounded-none">
              <div className="absolute inset-0 grid place-items-center">
                <button
                  onClick={() => soon()}
                  className="grid size-14 place-items-center rounded-full bg-black/50 backdrop-blur"
                >
                  <Play className="size-6 text-white" fill="currentColor" />
                </button>
              </div>
              <div className="absolute inset-x-3 bottom-3 h-8">
                <WaveformBars peaks={f.waveform} animated />
              </div>
            </CoverArt>
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{f.title}</h3>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    {f.genre} · {f.duration}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase text-zinc-400">
                  {f.kind}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                <button
                  onClick={() => soon()}
                  className="flex items-center gap-1.5 hover:text-neon"
                >
                  <Heart className="size-4" /> {f.likes.toLocaleString("fr-FR")}
                </button>
                <button
                  onClick={() => soon()}
                  className="flex items-center gap-1.5 hover:text-neon"
                >
                  <Repeat2 className="size-4" /> {f.remixes}
                </button>
                <button
                  onClick={() => soon()}
                  className="flex items-center gap-1.5 hover:text-neon"
                >
                  <MessageCircle className="size-4" /> 42
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageTransition>
  );
}
