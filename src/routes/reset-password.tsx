import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Loader2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe · Loopster" },
      { name: "description", content: "Choisissez un nouveau mot de passe pour votre compte." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase auto-sets session from the recovery hash on load.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Mot de passe mis à jour");
      navigate({ to: "/library" });
    } catch {
      toast.error("Oups, petit contretemps", {
        description: "On réessaie dans un instant ?",
      });
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
          {ready
            ? "Choisissez un mot de passe robuste (min 8 caractères)."
            : "Vérification du lien de récupération…"}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-background/40 px-3 py-2.5">
            <Lock className="size-4 text-zinc-500" />
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              disabled={!ready}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-zinc-600 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !ready}
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
