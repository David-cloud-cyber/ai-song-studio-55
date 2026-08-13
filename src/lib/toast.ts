import { toast } from "sonner";

export const soon = (label = "Bientôt disponible") =>
  toast(label, {
    description: "On prépare ça aux petits oignons. À très vite !",
  });
