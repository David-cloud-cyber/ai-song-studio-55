import { Globe2, ShieldCheck } from "lucide-react";

export function FreePublicationNotice({
  open,
  saving,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="free-publication-title"
        className="w-full max-w-md rounded-3xl border border-white/10 bg-surface p-6 shadow-2xl"
      >
        <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-neon/10 text-neon">
          <Globe2 className="size-6" aria-hidden="true" />
        </div>
        <h2 id="free-publication-title" className="text-xl font-semibold text-foreground">
          Une création gratuite visible par la communauté
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Avec l’offre gratuite, tes créations terminées sont publiées dans la galerie Loopster pour
          être découvertes. Évite d’ajouter des informations personnelles ou du contenu dont tu ne
          possèdes pas les droits.
        </p>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-success/20 bg-success/5 p-3 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          <span>Tu pourras supprimer ou archiver une création pour la retirer de la galerie.</span>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-medium text-muted-foreground transition hover:bg-white/5 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "J’ai compris, créer"}
          </button>
        </div>
      </div>
    </div>
  );
}
