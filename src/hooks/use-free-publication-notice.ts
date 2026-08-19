import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { isPaidPlan } from "@/lib/plans";
import {
  acknowledgeFreePublicationNotice,
  FREE_PUBLICATION_NOTICE_VERSION,
} from "@/lib/publication.functions";
import type { Profile } from "@/hooks/use-profile";

export function useFreePublicationNotice(profile: Profile | null | undefined) {
  const queryClient = useQueryClient();
  const acknowledge = useServerFn(acknowledgeFreePublicationNotice);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const needsNotice = Boolean(
    profile && !isPaidPlan(profile) && !profile.free_publication_notice_seen_at,
  );

  const request = useCallback(
    (action: () => void) => {
      if (!needsNotice) {
        action();
        return;
      }
      setPendingAction(() => action);
      setOpen(true);
    },
    [needsNotice],
  );

  const confirm = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await acknowledge({ data: { version: FREE_PUBLICATION_NOTICE_VERSION } });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setOpen(false);
      const action = pendingAction;
      setPendingAction(null);
      action?.();
    } catch (error) {
      toast.error("Le message n’a pas pu être enregistré", {
        description: error instanceof Error ? error.message : "Réessaie dans un instant.",
      });
    } finally {
      setSaving(false);
    }
  }, [acknowledge, pendingAction, queryClient, saving]);

  const cancel = useCallback(() => {
    if (saving) return;
    setOpen(false);
    setPendingAction(null);
  }, [saving]);

  return { open, saving, request, confirm, cancel };
}
