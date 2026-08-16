import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { recoverStaleGenerations } from "@/lib/suno.functions";
import { useSession } from "@/hooks/use-session";

/** Nettoie discrètement les traitements abandonnés à l'ouverture du studio. */
export function useGenerationRecovery() {
  const { user } = useSession();
  const recover = useServerFn(recoverStaleGenerations);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void recover({ data: {} })
      .then((result) => {
        if (cancelled || !result?.recovered) return;
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["projects"] }),
          queryClient.invalidateQueries({ queryKey: ["studio-projects"] }),
          queryClient.invalidateQueries({ queryKey: ["profile"] }),
        ]);
      })
      .catch(() => {
        // La prochaine ouverture du studio retentera sans interrompre l'expérience.
      });
    return () => {
      cancelled = true;
    };
  }, [recover, queryClient, user]);
}
