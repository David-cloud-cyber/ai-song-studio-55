import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./use-session";
import { FREE_DAILY_CREDITS, isPaidPlan } from "@/lib/plans";

export type Profile = {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  initials: string | null;
  color: string | null;
  language: string | null;
  preferred_style: string | null;
  preferred_mood: string | null;
  preferred_voice: string | null;
  credits: number;
  plan: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  subscription_source: string;
};

export function useProfile() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const profile = data as Profile;
      return {
        ...profile,
        credits: isPaidPlan(profile)
          ? profile.credits
          : Math.min(profile.credits, FREE_DAILY_CREDITS),
      };
    },
  });
}
