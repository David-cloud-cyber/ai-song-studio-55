import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { Mail, MessageSquare, Send, CheckCircle2, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact · BeatStudio AI" },
      {
        name: "description",
        content:
          "Contactez l'équipe BeatStudio AI pour toute question, support technique ou partenariat.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "support",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-5 py-10 md:py-16">
        <SectionHeader
          eyebrow="Assistance & Partenariats"
          title="Contactez-nous"
          description="Une question sur notre studio IA, un problème technique ou une demande de partenariat commercial ? Notre équipe vous répond sous 24h."
        />

        <div className="mt-10 grid gap-10 md:grid-cols-12">
          {/* Info Side */}
          <div className="space-y-6 md:col-span-5">
            <div className="rounded-2xl border border-white/10 bg-surface/60 p-6 space-y-6">
              <h3 className="font-semibold text-white">Nos coordonnées</h3>

              <div className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-neon/30 bg-neon/10 text-neon">
                  <Mail className="size-5" />
                </div>
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Email Direct
                  </div>
                  <a
                    href="mailto:hello@beatstudio.ai"
                    className="text-sm font-medium text-white hover:text-neon transition-colors"
                  >
                    hello@beatstudio.ai
                  </a>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Pour le support et les informations générales
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-400">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Communauté Discord
                  </div>
                  <a
                    href="https://discord.gg"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-white hover:text-purple-300 transition-colors"
                  >
                    discord.gg/beatstudio
                  </a>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Échangez directement avec les créateurs et développeurs
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-300">
                  <Clock className="size-5" />
                </div>
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Temps de réponse
                  </div>
                  <div className="text-sm font-medium text-white">Sous 24 heures ouvrées</div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Du Lundi au Vendredi, 9h - 19h (CET)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-300">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Siège social
                  </div>
                  <div className="text-sm font-medium text-white">Paris, France</div>
                  <p className="mt-0.5 text-xs text-zinc-500">75011 Paris, France</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="md:col-span-7">
            <div className="rounded-2xl border border-white/10 bg-surface p-6 md:p-8">
              {submitted ? (
                <div className="py-12 text-center">
                  <div className="mx-auto grid size-14 place-items-center rounded-full bg-neon/15 text-neon border border-neon/30">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">
                    Message envoyé avec succès !
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
                    Merci d'avoir contacté BeatStudio AI. Un membre de notre équipe reviendra vers
                    vous à l'adresse <strong className="text-white">{form.email}</strong> dans les
                    plus brefs délais.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: "", email: "", subject: "support", message: "" });
                    }}
                    className="mt-6 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                  >
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Envoyez-nous un message</h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-zinc-400 mb-1.5">
                        Votre nom *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Alex Martin"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-background px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-neon focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-zinc-400 mb-1.5">
                        Adresse Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="alex@exemple.fr"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-background px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-neon focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-zinc-400 mb-1.5">
                      Sujet de votre demande
                    </label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-background px-3.5 py-2.5 text-sm text-white focus:border-neon focus:outline-none"
                    >
                      <option value="support">Support technique / Bug</option>
                      <option value="billing">Facturation & Abonnements</option>
                      <option value="copyright">Droits d'auteur & Licences</option>
                      <option value="partnership">Partenariat & Presse</option>
                      <option value="other">Autre demande</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-zinc-400 mb-1.5">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Décrivez votre demande en détail..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-background px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-neon focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-neon px-5 py-3 text-sm font-semibold text-background transition-transform active:scale-[0.99] hover:brightness-110 disabled:opacity-50"
                  >
                    {loading ? (
                      <span>Envoi en cours...</span>
                    ) : (
                      <>
                        <Send className="size-4" />
                        <span>Envoyer le message</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
