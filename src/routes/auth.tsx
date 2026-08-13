import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const searchSchema = z.object({
  redirect: z.string().optional(),
  plan: z.enum(["free", "pro", "premier"]).optional(),
  cycle: z.enum(["monthly", "yearly"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Connexion · Loopster" },
      {
        name: "description",
        content:
          "Connectez-vous à votre studio de création musicale IA — email, mot de passe ou Google.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  const goAfterAuth = () => {
    if (search.plan === "pro" || search.plan === "premier") {
      navigate({
        to: "/credits",
        search: { plan: search.plan, cycle: search.cycle ?? "monthly" },
      });
      return;
    }
    navigate({ to: (search.redirect as "/library") ?? "/library" });
  };

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) {
        goAfterAuth();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigate, search.plan, search.cycle, search.redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    trackEvent("signup_started", { mode });
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Email envoyé", { description: "Vérifie ta boîte mail pour continuer." });
        setMode("signin");
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        trackEvent("signup_completed", { plan: search.plan });
        if (data.session) {
          toast.success("Bienvenue dans Loopster", { description: "Ton studio est prêt." });
          goAfterAuth();
        } else {
          toast.success("Compte créé", {
            description: "Vérifie ta boîte mail pour confirmer ton adresse.",
          });
        }
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      goAfterAuth();
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("invalid login") || message.includes("invalid credentials")) {
        toast.error("Vérifie tes identifiants", {
          description: "Vérifie ton adresse email et ton mot de passe, puis réessaie.",
        });
      } else if (message.includes("confirm") || message.includes("verified")) {
        toast.error("Adresse email à confirmer", {
          description: "Un lien de confirmation t'attend dans ta boîte mail.",
        });
      } else if (message.includes("already registered") || message.includes("already exists")) {
        toast.error("Cette adresse est déjà utilisée", {
          description: "Essaie de te connecter ou récupère ton mot de passe.",
        });
      } else {
        toast.error("Oups, petit contretemps", {
          description: "On réessaie ? Tes informations sont toujours là.",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const destination = (search.redirect as "/library" | undefined) ?? "/library";
      const redirectTo = new URL("/auth", window.location.origin);
      redirectTo.searchParams.set("redirect", destination);
      if (search.plan) redirectTo.searchParams.set("plan", search.plan);
      if (search.cycle) redirectTo.searchParams.set("cycle", search.cycle);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo.toString(),
        },
      });

      if (error) {
        const message = error.message.toLowerCase();
        const googleNotReady =
          message.includes("provider") ||
          message.includes("unsupported") ||
          message.includes("not enabled") ||
          message.includes("not configured");

        toast.error(googleNotReady ? "Google fait une petite pause" : "Connexion interrompue", {
          description: googleNotReady
            ? "Tu peux continuer avec ton adresse email, sans perdre ton choix."
            : "Pas de souci, tu peux retenter quand tu veux.",
        });
      }
    } catch {
      toast.error("Connexion interrompue", {
        description: "Pas de souci, tu peux retenter quand tu veux.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(34,211,238,0.14),transparent_75%)]" />
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-neon shadow-[0_0_18px_rgba(34,211,238,0.55)]">
            <span className="size-3 rotate-45 rounded-[3px] bg-background" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Loopster</span>
        </Link>

        <div className="rounded-3xl border border-white/10 bg-surface/80 p-6 backdrop-blur-xl">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-neon/70">
            {mode === "signup" ? "Inscription" : mode === "forgot" ? "Mot de passe" : "Connexion"}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signup"
              ? "Créez votre studio"
              : mode === "forgot"
                ? "Réinitialiser"
                : "Ravi de vous revoir"}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {mode === "signup"
              ? "80 crédits offerts chaque jour."
              : mode === "forgot"
                ? "Recevez un lien par email."
                : "Reprenez votre dernière session."}
          </p>

          {search.plan && search.plan !== "free" && (
            <div className="mt-4 rounded-xl border border-neon/20 bg-neon/5 px-3 py-2 text-center text-xs text-zinc-300">
              Ton choix est gardé. Après connexion, tu verras le récapitulatif de la formule {search.plan === "pro" ? "Pro" : "Premier"}.
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <Field
                icon={<Sparkles className="size-4" />}
                type="text"
                placeholder="Nom d'artiste"
                value={displayName}
                onChange={setDisplayName}
              />
            )}
            <Field
              icon={<Mail className="size-4" />}
              type="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              required
            />
            {mode !== "forgot" && (
              <Field
                icon={<Lock className="size-4" />}
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={setPassword}
                minLength={6}
                required
              />
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-neon py-3 text-sm font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {mode === "signup"
                ? "Créer le compte"
                : mode === "forgot"
                  ? "Envoyer le lien"
                  : "Se connecter"}
            </button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/5" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  ou
                </span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
              <button
                onClick={google}
                disabled={busy}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-medium text-foreground hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon disabled:opacity-50"
              >
                <GoogleIcon />
                Continuer avec Google
              </button>
            </>
          )}

          <div className="mt-6 space-y-2 text-center text-xs text-zinc-500">
            {mode === "signin" && (
              <>
                <button onClick={() => setMode("forgot")} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon hover:text-neon">
                  Mot de passe oublié ?
                </button>
                <div>
                  Pas de compte ?{" "}
                  <button onClick={() => setMode("signup")} className="font-semibold text-neon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon">
                    S'inscrire
                  </button>
                </div>
              </>
            )}
            {mode === "signup" && (
              <div>
                Déjà inscrit ?{" "}
                <button onClick={() => setMode("signin")} className="font-semibold text-neon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon">
                  Se connecter
                </button>
              </div>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("signin")} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon hover:text-neon">
                ← Retour à la connexion
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon,
  type,
  placeholder,
  value,
  onChange,
  required,
  minLength,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-background/40 px-3 py-2.5 focus-within:border-neon/60 focus-within:ring-2 focus-within:ring-neon/20">
      <span className="text-zinc-500">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-zinc-600 focus:outline-none"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.3-1.63 3.9-5.5 3.9-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.9 0 3.16.8 3.88 1.48l2.65-2.55C16.94 3.2 14.7 2.2 12 2.2 6.9 2.2 2.8 6.35 2.8 12s4.1 9.8 9.2 9.8c5.32 0 8.83-3.74 8.83-9 0-.6-.07-1.05-.15-1.6H12z"
      />
    </svg>
  );
}
