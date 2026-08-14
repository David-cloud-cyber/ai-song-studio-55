import { useEffect } from "react";

export function AuthRouteAlias() {
  useEffect(() => {
    const suffix = `${window.location.search}${window.location.hash}`;
    window.location.replace(`/auth${suffix}`);
  }, []);

  return (
    <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
      Ouverture de ton espace…
    </div>
  );
}
