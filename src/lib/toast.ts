import { toast } from "sonner";

export const soon = (label = "Bientôt disponible") =>
  toast(label, {
    description: "Cette action arrivera avec la prochaine mise à jour.",
  });
