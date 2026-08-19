import { useEffect, useRef, useState } from "react";
import { hasMarketingConsent, trackEvent } from "@/lib/analytics";

const pixelId = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim();

export function MetaPixel() {
  const [consent, setConsent] = useState(hasMarketingConsent());
  const initialized = useRef(false);

  useEffect(() => {
    const onConsent = () => setConsent(hasMarketingConsent());
    window.addEventListener("loopster:marketing-consent", onConsent);
    return () => window.removeEventListener("loopster:marketing-consent", onConsent);
  }, []);

  useEffect(() => {
    if (!pixelId || !consent || initialized.current) return;
    initialized.current = true;

    window.fbq =
      window.fbq ??
      ((...args: unknown[]) => {
        (window.fbq as unknown as { queue?: unknown[] }).queue ??= [];
        (window.fbq as unknown as { queue: unknown[] }).queue.push(args);
      });
    window.fbq("init", pixelId);

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.onload = () => trackEvent("page_view");
    document.head.appendChild(script);
  }, [consent]);

  return null;
}
