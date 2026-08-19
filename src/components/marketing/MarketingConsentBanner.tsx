import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { setMarketingConsent } from "@/lib/analytics";

const pixelConfigured = Boolean((import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim());

export function MarketingConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(pixelConfigured && !localStorage.getItem("loopster.marketing-consent"));
  }, []);

  if (!visible) return null;

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-2xl rounded-2xl border border-border bg-surface-elevated p-4 shadow-xl sm:inset-x-auto sm:right-5 sm:w-[min(38rem,calc(100vw-2rem))]">
      <p className="text-sm leading-6 text-foreground">
        Loopster utilise une mesure anonyme pour comprendre quelles créations et campagnes sont les
        plus utiles. Tu peux accepter ou refuser à tout moment.
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Link to="/cookies" className="mr-auto text-xs text-muted-foreground underline">
          En savoir plus
        </Link>
        <button
          type="button"
          onClick={() => {
            setMarketingConsent("denied");
            setVisible(false);
          }}
          className="min-h-10 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground"
        >
          Refuser
        </button>
        <button
          type="button"
          onClick={() => {
            setMarketingConsent("granted");
            setVisible(false);
          }}
          className="min-h-10 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        >
          Accepter
        </button>
      </div>
    </aside>
  );
}
