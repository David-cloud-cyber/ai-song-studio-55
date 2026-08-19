import { useSyncExternalStore } from "react";
import {
  ensureAuthRestored,
  getAuthSnapshot,
  subscribeAuth,
} from "@/integrations/supabase/auth-state";

export function useSession() {
  return useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthSnapshot);
}

export { ensureAuthRestored };
