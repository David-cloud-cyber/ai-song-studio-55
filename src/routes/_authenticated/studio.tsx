import { createFileRoute, Link } from "@tanstack/react-router";
import { projects, templates, user } from "@/data/mock";
import { ProjectCard } from "@/components/studio/ProjectCard";
import { TemplateTile } from "@/components/studio/TemplateTile";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { CollabCard } from "@/components/studio/CollabCard";
import { PageTransition } from "@/components/studio/PageTransition";
import { ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Studio · BeatStudio AI" },
      {
        name: "description",
        content:
          "Le tableau de bord créatif : projets récents, templates, prompt composer et espace collab.",
      },
    ],
  }),
  component: Studio,
});

function Studio() {
  const recent = projects.slice(0, 6);
  return (
    <PageTransition>
      <section className="px-5 pb-6 pt-8">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-neon/70">
          Session · {new Date().toLocaleDateString("fr-FR", { weekday: "long" })}
        </div>
        <h1 className="text-3xl font-semibold leading-[1.05] tracking-tight text-balance">
          Bonsoir <span className="text-neon">{user.name.split(" ")[0]}</span>.
          <br />
          On termine <span className="text-zinc-400">Midnight Whispers</span> ?
        </h1>
        <div className="mt-5 flex gap-2">
          <Link
            to="/create"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-neon px-4 py-3 text-sm font-semibold text-background"
          >
            <Sparkles className="size-4" strokeWidth={2.4} />
            Nouvelle création
          </Link>
          <Link
            to="/library"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-surface px-4 py-3 text-sm font-medium"
          >
            Library
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="pt-2">
        <div className="px-5">
          <SectionHeader
            eyebrow="Recent sessions"
            title="Vos dernières pistes"
            action={
              <Link to="/library" className="text-xs text-zinc-400 hover:text-neon">
                Tout voir
              </Link>
            }
          />
        </div>
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-2">
          {recent.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </section>

      <section className="px-5 pt-8">
        <SectionHeader eyebrow="Creative toolkit" title="Studio tools" />
        <div className="grid grid-cols-2 gap-3">
          {templates.map((t, i) => (
            <TemplateTile key={t.id} template={t} featured={i === 0} />
          ))}
        </div>
      </section>

      <section className="px-5 pt-8">
        <SectionHeader eyebrow="Collab" title="Session en direct" />
        <CollabCard />
      </section>

      <section className="px-5 pt-8">
        <SectionHeader eyebrow="Activity" title="Dernière activité" />
        <ul className="space-y-2">
          {[
            { t: "Naomi a remixé Neon Drift", w: "il y a 12 min" },
            { t: "Rendu terminé — Chrome Echoes", w: "il y a 48 min" },
            { t: "Ilyas a rejoint Midnight City", w: "il y a 2h" },
          ].map((a) => (
            <li
              key={a.t}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-surface/60 px-4 py-3"
            >
              <span className="text-sm">{a.t}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                {a.w}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </PageTransition>
  );
}
