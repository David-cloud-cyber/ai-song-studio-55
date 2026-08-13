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
import { useState } from "react";
import { toast } from "sonner";
import { soon } from "@/lib/toast";

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
              {profile?.handle ?? "@studio"} · {profile?.plan === "pro" ? "Studio Pro" : "Studio Free"}
            </div>
          </div>
          <button
            onClick={() => soon("Édition profil bientôt disponible")}
            className="rounded-full bg-white/5 px-3 py-1.5 text-xs"
          >
            Éditer
          </button>
        </div>
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
            onClick={() => soon()}
          />
          <ActionRow
            icon={<Globe className="size-4" />}
            label="Langue"
            hint="Français"
            onClick={() => soon()}
          />
        </Group>
      </section>

      <section className="px-5 pt-6">
        <button
          onClick={signOut}
          disabled={signingOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-surface py-3.5 text-sm font-medium text-zinc-300 disabled:opacity-60"
        >
          <LogOut className="size-4" /> {signingOut ? "Déconnexion…" : "Se déconnecter"}
        </button>
        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          Loopster · v0.1 · phase 1
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
