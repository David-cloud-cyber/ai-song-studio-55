import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Resolves a private generated-media path to a short-lived URL for the owner. */
type MediaUrlOptions = {
  download?: string | boolean;
};

export function useMediaUrl(source: string | null | undefined, options: MediaUrlOptions = {}) {
  const [url, setUrl] = useState<string | null>(null);
  const download = options.download;

  useEffect(() => {
    let active = true;
    setUrl(null);
    if (!source) return;
    if (source.startsWith("http")) {
      // Public/provider URLs cannot be re-signed client-side. For Supabase
      // storage URLs, however, the download query parameter still makes the
      // response an attachment with a predictable filename.
      if (download !== undefined) {
        try {
          const resolved = new URL(source);
          if (resolved.pathname.includes("/storage/v1/object/")) {
            resolved.searchParams.set("download", download === true ? "" : String(download));
            setUrl(resolved.toString());
            return;
          }
        } catch {
          // Fall back to the original URL below.
        }
      }
      setUrl(source);
      return;
    }

    supabase.storage
      .from("generated-media-private")
      .createSignedUrl(source, 3600, download === undefined ? undefined : { download })
      .then(({ data, error }) => {
        if (active && !error) setUrl(data.signedUrl);
      });

    return () => {
      active = false;
    };
  }, [download, source]);

  return url;
}

/** Resolves an asset as a browser attachment instead of an inline media URL. */
export function useMediaDownloadUrl(source: string | null | undefined, downloadName: string) {
  return useMediaUrl(source, { download: downloadName });
}
