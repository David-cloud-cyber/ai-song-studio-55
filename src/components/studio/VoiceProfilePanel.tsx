import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Mic2, Trash2, Upload, Waves } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  prepareVoiceValidation,
  createVoiceProfileOperation,
} from "@/lib/advanced-music.functions";
import { cn } from "@/lib/utils";

export function VoiceProfilePanel({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const prepare = useServerFn(prepareVoiceValidation);
  const create = useServerFn(createVoiceProfileOperation);
  const [name, setName] = useState("Ma voix");
  const [source, setSource] = useState<File | null>(null);
  const [verification, setVerification] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: profiles = [] } = useQuery({
    queryKey: ["voice-profiles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_profiles")
        .select(
          "id,name,status,validation_task_id,validation_phrase,source_asset_path,verify_asset_path,provider_voice_id,error_message",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upload = async (file: File, prefix: string) => {
    if (!file.type.startsWith("audio/") || file.size > 50 * 1024 * 1024) {
      throw new Error("Choisis un fichier audio de moins de 50 Mo.");
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "audio";
    const path = `${userId}/${prefix}-${crypto.randomUUID()}.${extension}`;
    const uploaded = await supabase.storage.from("voice-sources").upload(path, file, {
      contentType: file.type || "audio/mpeg",
      cacheControl: "3600",
      upsert: false,
    });
    if (uploaded.error) throw uploaded.error;
    const signed = await supabase.storage.from("voice-sources").createSignedUrl(path, 3600);
    if (signed.error || !signed.data?.signedUrl)
      throw new Error("Le fichier n’a pas pu être préparé.");
    return { path, url: signed.data.signedUrl };
  };

  const start = async () => {
    if (!source || !name.trim()) return;
    setBusy(true);
    try {
      const uploaded = await upload(source, "source");
      await prepare({
        data: {
          name: name.trim(),
          voiceUrl: uploaded.url,
          sourceAssetPath: uploaded.path,
          vocalStartS: 0,
          vocalEndS: 10,
          language: "fr",
          consent: true,
          requestId: crypto.randomUUID(),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["voice-profiles", userId] });
      setSource(null);
      toast.success("La première étape est prête", {
        description: "Une phrase courte apparaît bientôt. Lis-la en chantant pour continuer.",
      });
    } catch (error) {
      toast.error("Impossible de préparer ta voix", {
        description: error instanceof Error ? error.message : "Réessaie dans un instant.",
      });
    } finally {
      setBusy(false);
    }
  };

  const finish = async (profile: (typeof profiles)[number]) => {
    if (!verification || !profile.validation_task_id || !profile.source_asset_path) return;
    setBusy(true);
    try {
      const uploaded = await upload(verification, "verification");
      await create({
        data: {
          voiceProfileId: profile.id,
          validationTaskId: profile.validation_task_id,
          uploadUrl: uploaded.url,
          sourceAssetPath: profile.source_asset_path,
          verifyAssetPath: uploaded.path,
          name: profile.name,
          consent: true,
          requestId: crypto.randomUUID(),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["voice-profiles", userId] });
      setVerification(null);
      toast.success("Ta voix est en préparation");
    } catch (error) {
      toast.error("Impossible de créer la voix", {
        description: error instanceof Error ? error.message : "Réessaie dans un instant.",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase
      .from("voice_profiles")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) toast.error("Impossible de supprimer cette voix");
    else {
      await queryClient.invalidateQueries({ queryKey: ["voice-profiles", userId] });
      toast.success("Voix supprimée");
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-surface p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-neon/10 text-neon">
          <Mic2 className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Ta voix personnelle</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Utilise uniquement ta propre voix. L’enregistrement est supprimé après la création.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[0.7fr_1fr_auto] sm:items-end">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Nom
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-11 rounded-xl border border-white/10 bg-background px-3 text-sm text-foreground outline-none focus:border-neon"
          />
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/15 px-3 text-xs text-muted-foreground hover:border-neon/40">
          <Upload className="size-4 text-neon" />
          {source ? <span className="truncate">{source.name}</span> : "Importer un extrait vocal"}
          <input
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={(event) => setSource(event.target.files?.[0] ?? null)}
          />
        </label>
        <button
          type="button"
          onClick={start}
          disabled={busy || !source}
          className="min-h-11 rounded-xl bg-neon px-4 text-xs font-semibold text-background disabled:opacity-50"
        >
          {busy ? "Préparation…" : "Commencer"}
        </button>
      </div>
      <div className="space-y-2">
        {profiles.map((profile) => (
          <div key={profile.id} className="rounded-xl border border-white/10 bg-background/40 p-3">
            <div className="flex items-center gap-2">
              <Waves className="size-4 text-neon" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{profile.name}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-1 font-mono text-[10px] uppercase",
                  profile.status === "ready"
                    ? "bg-success/10 text-success"
                    : "bg-warning/10 text-warning",
                )}
              >
                {profile.status === "ready"
                  ? "Prête"
                  : profile.status === "awaiting_recording"
                    ? "À enregistrer"
                    : "En cours"}
              </span>
              <button
                type="button"
                onClick={() => remove(profile.id)}
                className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger"
                aria-label={`Supprimer ${profile.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            {profile.status === "awaiting_recording" && profile.validation_phrase && (
              <div className="mt-3 space-y-2">
                <p className="rounded-lg border border-neon/20 bg-neon/5 p-3 text-sm leading-6 text-foreground">
                  « {profile.validation_phrase} »
                </p>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/15 px-3 text-xs text-muted-foreground">
                  <Upload className="size-4 text-neon" />
                  {verification ? (
                    <span className="truncate">{verification.name}</span>
                  ) : (
                    "Importer ton enregistrement"
                  )}
                  <input
                    type="file"
                    accept="audio/*"
                    className="sr-only"
                    onChange={(event) => setVerification(event.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => finish(profile)}
                  disabled={busy || !verification}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neon/30 bg-neon/10 px-3 text-xs font-semibold text-neon disabled:opacity-50"
                >
                  <Check className="size-4" />
                  Créer ma voix
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
