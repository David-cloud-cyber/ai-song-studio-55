import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Loader2, ArrowRight } from "lucide-react";
import { getSafeAuthDestination } from "@/lib/auth-redirect";
import { seoHead } from "@/lib/seo";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: searchSchema,
  head: () =>
    seoHead({
      title: "Nouveau mot de passe | Loopster",
      description: "Mets à jour ton mot de passe Loopster en toute sécurité.",
      path: "/reset-password",
      noIndex: true,
    }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const readyRef = useRef(false);
  const destination = getSafeAuthDestination(search.redirect);

  useEffect(() => {
    let active = true;
    const markReady = () => {
      if (!active) return;
      readyRef.current = true;
      setStatus("ready");
      setErrorMessage("");
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") markReady();
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setStatus("invalid");
        setErrorMessage("Ce lien de récupération n’est plus disponible. Demande un nouveau lien.");
        return;
      }
      if (data.session) markReady();
    });

    const timeout = window.setTimeout(() => {
      if (active && !readyRef.current) {
        setStatus("invalid");
        setErrorMessage("Ce lien a peut-être expiré. Demande un nouveau lien pour continuer.");
      }
    }, 4500);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      if (password !== confirmation) {
        throw new Error("Passwords do not match");
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Mot de passe mis à jour");
      navigate({ to: destination as "/library", replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      toast.error(
        message.includes("match")
          ? "Les mots de passe ne correspondent pas"
          : "Mise à jour impossible",
        {
          description: message.includes("match")
            ? "Vérifie les deux champs puis réessaie."
            : "Le lien est peut-être expiré. Demande un nouveau lien et réessaie.",
        },
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(34,211,238,0.14),transparent_75%)]" />
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-surface/80 p-6 backdrop-blur-xl">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-neon/70">
          Sécurité
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Nouveau mot de passe</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {status === "ready"
            ? "Choisissez un mot de passe robuste (min 8 caractères)."
            : status === "invalid"
              ? errorMessage
              : "Vérification du lien de récupération…"}
        </p>

        {status === "invalid" && (
          <Link
            to="/auth"
            className="mt-5 flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium hover:bg-white/[0.06]"
          >
            Demander un nouveau lien
          </Link>
        )}

        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-background/40 px-3 py-2.5">
            <Lock className="size-4 text-zinc-500" />
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
              disabled={status !== "ready"}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-zinc-600 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-background/40 px-3 py-2.5">
            <Lock className="size-4 text-zinc-500" />
            <input
              type="password"
              placeholder="Confirmer le mot de passe"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
              disabled={status !== "ready"}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-zinc-600 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={busy || status !== "ready"}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neon py-3 text-sm font-semibold text-background disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            Mettre à jour
          </button>
        </form>
      </div>
    </div>
  );
}
