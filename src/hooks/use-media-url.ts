import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Resolves a private generated-media path to a short-lived URL for the owner. */
export function useMediaUrl(source: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    if (!source) return;
    if (source.startsWith("http")) {
      setUrl(source);
      return;
    }

    supabase.storage
      .from("generated-media-private")
      .createSignedUrl(source, 3600)
      .then(({ data, error }) => {
        if (active && !error) setUrl(data.signedUrl);
      });

    return () => {
      active = false;
    };
  }, [source]);

  return url;
}
