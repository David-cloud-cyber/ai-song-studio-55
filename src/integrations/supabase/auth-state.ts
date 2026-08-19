import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./client";

export type AuthSnapshot = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let snapshot: AuthSnapshot = { session: null, user: null, loading: true };
let restorePromise: Promise<Session | null> | null = null;
let unsubscribe: (() => void) | null = null;
const listeners = new Set<() => void>();

function emit(next: AuthSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function ensureAuthRestored() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (restorePromise) return restorePromise;

  restorePromise = supabase.auth
    .getSession()
    .then(({ data }) => {
      emit({ session: data.session ?? null, user: data.session?.user ?? null, loading: false });
      return data.session ?? null;
    })
    .catch((error) => {
      emit({ session: null, user: null, loading: false });
      throw error;
    });

  if (!unsubscribe) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      emit({ session, user: session?.user ?? null, loading: false });
    });
    unsubscribe = () => data.subscription.unsubscribe();
  }
  return restorePromise;
}

export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  void ensureAuthRestored().catch(() => undefined);
  return () => listeners.delete(listener);
}

export function getAuthSnapshot() {
  return snapshot;
}
