import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-profile";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import {
  Bell,
  CreditCard,
  Globe,
  LogOut,
  Palette,
  Shield,
  User2,
  ChevronRight,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { VoiceProfilePanel } from "@/components/studio/VoiceProfilePanel";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Compte · Loopster" },
      { name: "description", content: "Préférences, notifications et paramètres du studio." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const [notif, setNotif] = useState(true);
  const [collab, setCollab] = useState(true);
  const [autoplay, setAutoplay] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [handleDraft, setHandleDraft] = useState("");
  const [preferencesReady, setPreferencesReady] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setPreferencesReady(false);
    setNameDraft(profile.display_name ?? "");
    setHandleDraft(profile.handle ?? "");
    const preferences = profile.preferences as Partial<{
      notif: boolean;
      collab: boolean;
      autoplay: boolean;
    }>;
    try {
      if (typeof preferences.notif === "boolean") setNotif(preferences.notif);
      if (typeof preferences.collab === "boolean") setCollab(preferences.collab);
      if (typeof preferences.autoplay === "boolean") setAutoplay(preferences.autoplay);
    } catch {
      // Les préférences restent optionnelles si le profil est ancien.
    }
    setPreferencesReady(true);
  }, [profile]);

  useEffect(() => {
    if (!profile || !preferencesReady) return;
    void supabase
      .from("profiles")
      .update({ preferences: { ...(profile.preferences ?? {}), notif, collab, autoplay } })
      .then(() => undefined);
  }, [autoplay, collab, notif, preferencesReady, profile]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch {
      toast.error("Déconnexion interrompue", {
        description: "On garde ta session ouverte pour le moment.",
      });
      setSigningOut(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    const displayName = nameDraft.trim().replace(/\s+/g, " ");
    const handle = handleDraft.trim().replace(/^@+/, "").toLowerCase();
    if (displayName.length < 2 || displayName.length > 60) {
      toast.error("Ton nom doit contenir entre 2 et 60 caractères.");
      return;
    }
    if (handle && !/^[a-z0-9_-]{2,30}$/.test(handle)) {
      toast.error("Ton identifiant doit contenir 2 à 30 lettres, chiffres, tirets ou underscores.");
      return;
    }
    setSavingProfile(true);
    try {
      const initials = displayName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName, handle: handle || null, initials })
        .eq("id", profile.id);
      if (error) {
        if (error.code === "23505") throw new Error("Cet identifiant est déjà pris.");
        throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditingProfile(false);
      toast.success("Profil mis à jour ✨");
    } catch (error) {
      toast.error("Impossible de mettre à jour ton profil", {
        description: error instanceof Error ? error.message : "Réessaie dans un instant.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const displayName = profile?.display_name ?? "Créateur";
  const initials = profile?.initials ?? "??";
  const color = profile?.color ?? "from-cyan-400 to-fuchsia-600";
  const credits = profile?.credits ?? 0;

  return (
    <PageTransition>
      <section className="px-5 pt-8">
        <SectionHeader eyebrow="Compte" title="Paramètres" />
        <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-surface p-4">
          <div
            className={`grid size-14 place-items-center rounded-full bg-gradient-to-br ${color} text-lg font-semibold text-background`}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold">{displayName}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              {profile?.handle ? `@${profile.handle.replace(/^@+/, "")}` : "@studio"} ·{" "}
              {profile?.plan === "pro"
                ? "Studio Pro"
                : profile?.plan === "premier"
                  ? "Studio Premier"
                  : "Studio Free"}
            </div>
          </div>
          <button
            onClick={() => {
              setNameDraft(profile?.display_name ?? "");
              setHandleDraft(profile?.handle ?? "");
              setEditingProfile((value) => !value);
            }}
            className="rounded-full bg-white/5 px-3 py-1.5 text-xs"
          >
            {editingProfile ? "Fermer" : "Éditer"}
          </button>
        </div>
        {editingProfile && (
          <div className="mt-3 grid gap-3 rounded-2xl border border-neon/20 bg-neon/5 p-4 sm:grid-cols-[1fr_0.8fr_auto] sm:items-end">
            <label className="grid gap-1.5 text-xs text-zinc-400">
              Nom affiché
              <input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                autoComplete="name"
                className="min-h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground outline-none focus:border-neon"
              />
            </label>
            <label className="grid gap-1.5 text-xs text-zinc-400">
              Identifiant
              <input
                value={handleDraft}
                onChange={(event) => setHandleDraft(event.target.value)}
                autoComplete="username"
                placeholder="mon-nom"
                className="min-h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground outline-none focus:border-neon"
              />
            </label>
            <button
              type="button"
              onClick={saveProfile}
              disabled={savingProfile}
              className="min-h-11 rounded-xl bg-neon px-4 text-sm font-semibold text-background disabled:opacity-50"
            >
              {savingProfile ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        )}
      </section>

      <section className="px-5 pt-6">
        <Group title="Préférences">
          <Row icon={<Bell className="size-4" />} label="Notifications push">
            <Switch checked={notif} onCheckedChange={setNotif} />
          </Row>
          <Row icon={<User2 className="size-4" />} label="Invitations collab">
            <Switch checked={collab} onCheckedChange={setCollab} />
          </Row>
          <Row icon={<Palette className="size-4" />} label="Lecture auto des projets">
            <Switch checked={autoplay} onCheckedChange={setAutoplay} />
          </Row>
        </Group>
      </section>

      <section className="px-5 pt-6">
        <Group title="Studio">
          <LinkRow
            to="/credits"
            icon={<CreditCard className="size-4" />}
            label="Crédits & facturation"
            hint={`${credits} CR`}
          />
          <ActionRow
            icon={<Shield className="size-4" />}
            label="Confidentialité"
            onClick={() => navigate({ to: "/privacy" })}
          />
          <ActionRow
            icon={<Globe className="size-4" />}
            label="Langue"
            hint="Français"
            onClick={() => toast("Loopster est pour l'instant en français.")}
          />
        </Group>
      </section>

      {profile?.id && (
        <section className="px-5 pt-6">
          <VoiceProfilePanel userId={profile.id} />
        </section>
      )}

      <section className="px-5 pt-6">
        <button
          onClick={signOut}
          disabled={signingOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-surface py-3.5 text-sm font-medium text-zinc-300 disabled:opacity-60"
        >
          <LogOut className="size-4" /> {signingOut ? "Déconnexion…" : "Se déconnecter"}
        </button>
        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          Loopster · ton studio musical
        </p>
      </section>
    </PageTransition>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-neon/70">
        {title}
      </h3>
      <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/5 bg-surface">
        {children}
      </div>
    </div>
  );
}
function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="text-zinc-400">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}
function ActionRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 p-4 text-left hover:bg-white/[0.02]"
    >
      <span className="text-zinc-400">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {hint && <span className="font-mono text-[11px] uppercase text-zinc-500">{hint}</span>}
      <ChevronRight className="size-4 text-zinc-500" />
    </button>
  );
}
function LinkRow({
  to,
  icon,
  label,
  hint,
}: {
  to: "/credits";
  icon: React.ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <Link to={to} className="flex w-full items-center gap-3 p-4 hover:bg-white/[0.02]">
      <span className="text-zinc-400">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {hint && <span className="font-mono text-[11px] uppercase text-neon">{hint}</span>}
      <ChevronRight className="size-4 text-zinc-500" />
    </Link>
  );
}
