import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, Lock, Mail, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { LoopsterLogo } from "@/components/branding/LoopsterLogo";
import { supabase } from "@/integrations/supabase/client";
import { getMarketingAttribution, trackEvent } from "@/lib/analytics";
import { buildAuthReturnUrl, getSafeAuthDestination } from "@/lib/auth-redirect";
import { createFapshiCheckout } from "@/lib/payment.functions";
import { cycleLabel, formatXaf, getPriceXaf, getPricingPlan } from "@/lib/pricing";
import { seoHead } from "@/lib/seo";

const searchSchema = z.object({
  redirect: z.string().optional(),
  plan: z.enum(["free", "pro", "premier"]).optional(),
  cycle: z.enum(["monthly", "yearly"]).optional(),
  autopay: z.enum(["1"]).optional(),
  paymentRequestId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () =>
    seoHead({
      title: "Connexion à Loopster",
      description: "Connecte-toi à ton studio musical Loopster ou crée ton espace gratuitement.",
      path: "/auth",
      noIndex: true,
    }),
  component: AuthPage,
});

function readAuthCallbackError() {
  if (typeof window === "undefined") return null;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const raw =
    `${query.get("error") ?? ""} ${query.get("error_description") ?? ""} ${hash.get("error") ?? ""} ${hash.get("error_description") ?? ""}`.toLowerCase();
  if (!raw.trim()) return null;
  if (raw.includes("access_denied") || raw.includes("cancel"))
    return {
      title: "Connexion interrompue",
      description: "Pas de souci, tu peux réessayer ou continuer avec ton email.",
    };
  if (raw.includes("provider") || raw.includes("not enabled") || raw.includes("not configured"))
    return {
      title: "Google fait une petite pause",
      description: "Tu peux continuer avec ton email, sans perdre ton choix.",
    };
  return {
    title: "Connexion impossible",
    description: "Vérifie tes informations et réessaie dans un instant.",
  };
}

function clearAuthCallbackError() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  ["error", "error_code", "error_description"].forEach((key) => url.searchParams.delete(key));
  if (url.hash.includes("error=")) url.hash = "";
  window.history.replaceState({}, document.title, url.toString());
}

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const routedRef = useRef(false);
  const startCheckout = useServerFn(createFapshiCheckout);
  const destination = getSafeAuthDestination(search.redirect);
  const selectedPlan =
    search.plan === "pro" || search.plan === "premier" ? getPricingPlan(search.plan) : null;
  const selectedCycle = search.cycle ?? "monthly";

  const goAfterAuth = useCallback(async () => {
    if (routedRef.current) return;
    routedRef.current = true;
    if (selectedPlan && search.autopay === "1") {
      setBusy(true);
      try {
        const result = await startCheckout({
          data: {
            plan: selectedPlan.id as "pro" | "premier",
            cycle: selectedCycle,
            requestId: search.paymentRequestId ?? crypto.randomUUID(),
            utmSource: getMarketingAttribution().utmSource as string | undefined,
            utmMedium: getMarketingAttribution().utmMedium as string | undefined,
            utmCampaign: getMarketingAttribution().utmCampaign as string | undefined,
            utmContent: getMarketingAttribution().utmContent as string | undefined,
            utmTerm: getMarketingAttribution().utmTerm as string | undefined,
            fbclid: getMarketingAttribution().fbclid as string | undefined,
          },
        });
        window.location.assign(result.link);
      } catch (error) {
        routedRef.current = false;
        setBusy(false);
        toast.error("Le paiement fait une petite pause", {
          description:
            error instanceof Error ? error.message : "Tu peux réessayer dans un instant.",
        });
      }
      return;
    }
    if (selectedPlan) {
      navigate({
        to: "/credits",
        search: {
          plan: selectedPlan.id as "pro" | "premier",
          cycle: selectedCycle,
          paymentRequestId: search.paymentRequestId,
        },
      });
    } else {
      navigate({ to: destination as "/library" });
    }
  }, [
    destination,
    navigate,
    search.autopay,
    search.paymentRequestId,
    selectedCycle,
    selectedPlan,
    startCheckout,
  ]);

  useEffect(() => {
    const callbackError = readAuthCallbackError();
    if (callbackError) {
      toast.error(callbackError.title, { description: callbackError.description });
      clearAuthCallbackError();
    }
    let cancelled = false;
    const handleSession = (
      session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"],
    ) => {
      if (cancelled || !session) return;
      window.setTimeout(() => {
        if (!cancelled) void goAfterAuth();
      }, 0);
    };
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) =>
      handleSession(session),
    );
    supabase.auth.getSession().then(({ data }) => handleSession(data.session));
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [goAfterAuth]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    trackEvent("signup_started", { mode });
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: buildAuthReturnUrl(window.location.origin, destination, {
            path: "/reset-password",
          }),
        });
        if (error) throw error;
        toast.success("Lien envoyé", { description: "Vérifie ta boîte mail pour continuer." });
        setMode("signin");
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: buildAuthReturnUrl(window.location.origin, destination, {
              plan: search.plan,
              cycle: search.cycle,
              autopay: search.autopay === "1",
              paymentRequestId: search.paymentRequestId,
            }),
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        trackEvent("signup_completed", { plan: search.plan });
        if (data.session) {
          toast.success("Bienvenue dans Loopster", { description: "Ton espace est prêt." });
          await goAfterAuth();
        } else
          toast.success("Compte créé", {
            description: "Vérifie ta boîte mail pour confirmer ton adresse.",
          });
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await goAfterAuth();
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("invalid login") || message.includes("invalid credentials"))
        toast.error("Vérifie tes identifiants", {
          description: "Vérifie ton email et ton mot de passe, puis réessaie.",
        });
      else if (message.includes("confirm") || message.includes("verified"))
        toast.error("Adresse à confirmer", {
          description: "Un lien de confirmation t’attend dans ta boîte mail.",
        });
      else if (message.includes("already registered") || message.includes("already exists"))
        toast.error("Cette adresse est déjà utilisée", {
          description: "Essaie de te connecter ou récupère ton mot de passe.",
        });
      else if (message.includes("rate limit") || message.includes("too many"))
        toast.error("On ralentit juste un peu", {
          description: "Attends un moment puis réessaie.",
        });
      else
        toast.error("Petit contretemps", {
          description: "On réessaie ? Tes informations sont toujours là.",
        });
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildAuthReturnUrl(window.location.origin, destination, {
            plan: search.plan,
            cycle: search.cycle,
            autopay: search.autopay === "1",
            paymentRequestId: search.paymentRequestId,
          }),
        },
      });
      if (error) {
        const message = error.message.toLowerCase();
        const unavailable =
          message.includes("provider") ||
          message.includes("unsupported") ||
          message.includes("not enabled") ||
          message.includes("not configured");
        toast.error(unavailable ? "Google fait une petite pause" : "Connexion interrompue", {
          description: unavailable
            ? "Tu peux continuer avec ton email, sans perdre ton choix."
            : "Tu peux retenter quand tu veux.",
        });
      }
    } catch {
      toast.error("Connexion interrompue", { description: "Tu peux retenter quand tu veux." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center">
          <LoopsterLogo className="h-9" imageClassName="h-9 w-auto" />
        </Link>
        <div className="rounded-3xl border border-border bg-surface p-5 sm:p-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
            {mode === "signup" ? "Inscription" : mode === "forgot" ? "Récupération" : "Connexion"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {mode === "signup"
              ? "Crée ton espace"
              : mode === "forgot"
                ? "Retrouve ton accès"
                : "Ravi de te revoir"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {mode === "signup"
              ? "80 crédits offerts chaque jour pour commencer."
              : mode === "forgot"
                ? "Un lien simple sera envoyé à ton adresse."
                : "Reprends ta prochaine création là où tu l’as laissée."}
          </p>
          {selectedPlan && (
            <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    Ton choix est gardé
                  </p>
                  <p className="mt-1 font-semibold">Loopster {selectedPlan.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedPlan.creationsLabel}
                  </p>
                </div>
                <div className="text-right text-sm font-semibold">
                  {formatXaf(getPriceXaf(selectedPlan, selectedCycle))}
                  <span className="block text-xs font-normal text-muted-foreground">
                    / {cycleLabel(selectedCycle)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <Field
                icon={<Sparkles className="size-4" />}
                type="text"
                placeholder="Nom d’artiste"
                value={displayName}
                onChange={setDisplayName}
                autoComplete="name"
                required
              />
            )}
            <Field
              icon={<Mail className="size-4" />}
              type="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            {mode !== "forgot" && (
              <Field
                icon={<Lock className="size-4" />}
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={setPassword}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={mode === "signup" ? 8 : undefined}
                required
              />
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {mode === "signup"
                ? "Créer mon compte"
                : mode === "forgot"
                  ? "Envoyer le lien"
                  : "Se connecter"}
            </button>
          </form>
          {mode !== "forgot" && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border-subtle" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  ou
                </span>
                <div className="h-px flex-1 bg-border-subtle" />
              </div>
              <button
                type="button"
                onClick={google}
                disabled={busy}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-subtle py-3 text-sm font-medium hover:bg-surface-elevated disabled:opacity-50"
              >
                <GoogleIcon />
                Continuer avec Google
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Si Google n’est pas disponible, continue simplement avec ton email.
              </p>
            </>
          )}
          <div className="mt-6 space-y-2 text-center text-xs text-muted-foreground">
            {mode === "signin" && (
              <>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="hover:text-primary"
                >
                  Mot de passe oublié ?
                </button>
                <div>
                  Pas encore de compte ?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="font-semibold text-primary"
                  >
                    S’inscrire
                  </button>
                </div>
              </>
            )}
            {mode === "signup" && (
              <div>
                Déjà inscrit ?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-semibold text-primary"
                >
                  Se connecter
                </button>
              </div>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="hover:text-primary"
              >
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
  autoComplete,
}: {
  icon: ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2.5 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
      <span className="text-muted-foreground">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
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
