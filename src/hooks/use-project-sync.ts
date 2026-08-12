import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { syncProject } from "@/lib/suno.functions";

/**
 * Interroge Suno toutes les 6s tant que le projet est en cours de rendu
 * (ou qu'une séparation de pistes est en cours), puis rafraîchit le cache.
 */
export function useProjectSync(projectId: string | undefined, active: boolean) {
  const sync = useServerFn(syncProject);
  const queryClient = useQueryClient();
  const busy = useRef(false);

  useEffect(() => {
    if (!projectId || !active) return;
    let cancelled = false;

    const tick = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const res = await sync({ data: { projectId } });
        if (!cancelled && res?.changed) {
          queryClient.invalidateQueries({ queryKey: ["project", projectId] });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
      } catch {
        /* on retente au prochain tick */
      } finally {
        busy.current = false;
      }
    };

    void tick();
    const id = setInterval(tick, 6000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [projectId, active, sync, queryClient]);
}
