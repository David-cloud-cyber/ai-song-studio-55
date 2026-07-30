import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { Send, Users, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

type CollabMsg = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type Sender = {
  id: string;
  display_name: string | null;
  initials: string | null;
  color: string | null;
};

export const Route = createFileRoute("/_authenticated/collab")({
  head: () => ({
    meta: [
      { title: "Collab · BeatStudio AI" },
      {
        name: "description",
        content: "Salon collaboratif temps réel avec chat live et présence d'équipe.",
      },
    ],
  }),
  component: CollabPage,
});

function CollabPage() {
  const { user } = useSession();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["collab-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collab_messages")
        .select("id,user_id,content,created_at")
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data as CollabMsg[];
    },
  });

  // Get unique sender ids to fetch profiles
  const senderIds = [...new Set(messages.map((m) => m.user_id))];
  const { data: senders = {} } = useQuery({
    queryKey: ["collab-senders", senderIds.join(",")],
    enabled: senderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,initials,color")
        .in("id", senderIds);
      if (error) throw error;
      const map: Record<string, Sender> = {};
      (data as Sender[]).forEach((s) => (map[s.id] = s));
      return map;
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("collab-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "collab_messages" },
        (payload) => {
          const msg = payload.new as CollabMsg;
          queryClient.setQueryData<CollabMsg[]>(["collab-messages"], (old) => {
            if (!old) return [msg];
            if (old.some((m) => m.id === msg.id)) return old;
            return [...old, msg];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !user || sending) return;
    setSending(true);
    const content = input;
    setInput("");
    const { error } = await supabase.from("collab_messages").insert({ user_id: user.id, content });
    if (error) setInput(content);
    setSending(false);
  };

  return (
    <PageTransition>
      <section className="px-5 pt-8">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-neon/70">
          Salon global · temps réel
        </div>
        <div className="flex items-center gap-3 rounded-3xl border border-neon/20 bg-gradient-to-br from-neon/10 via-surface to-surface p-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-neon/15 text-neon">
            <Radio className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">Session ouverte</h1>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              Discutez avec la communauté BeatStudio en direct
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 pt-6">
        <SectionHeader
          eyebrow="Chat"
          title="Live"
          action={
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-neon">
              <span className="size-1.5 animate-pulse rounded-full bg-neon" />
              Live
            </span>
          }
        />
        <div className="flex h-[520px] flex-col overflow-hidden rounded-2xl border border-white/5 bg-surface">
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-zinc-500">
                Soyez la première voix du salon.
              </div>
            ) : (
              messages.map((m) => {
                const sender = senders[m.user_id];
                const isOwn = m.user_id === user?.id;
                const author = sender?.display_name ?? "Membre";
                const initials =
                  sender?.initials ??
                  author
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                const color = sender?.color ?? "from-cyan-400 to-fuchsia-600";
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex items-start gap-2.5",
                      isOwn ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <div
                      className={`grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br ${color} text-[9px] font-semibold text-background`}
                    >
                      {initials}
                    </div>
                    <div className={cn("max-w-[75%]", isOwn && "text-right")}>
                      <div className={cn("flex items-baseline gap-2", isOwn && "flex-row-reverse")}>
                        <span className="text-xs font-semibold">{isOwn ? "Vous" : author}</span>
                        <span className="font-mono text-[9px] text-zinc-500">
                          {new Date(m.created_at).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "mt-1 inline-block rounded-2xl px-3 py-2 text-sm",
                          isOwn
                            ? "bg-neon text-background"
                            : "bg-background/60 text-foreground ring-1 ring-white/5",
                        )}
                      >
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-white/5 p-2.5">
            <Users className="ml-1 size-4 shrink-0 text-neon/70" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={profile ? "Écrivez un message…" : "Chargement…"}
              disabled={!profile || sending}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-neon text-background disabled:opacity-40"
            >
              <Send className="size-4" strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
