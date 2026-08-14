import { Link } from "@tanstack/react-router";
import { ChevronRight, UsersRound } from "lucide-react";

export function CollabCard() {
  return (
    <Link
      to="/collab"
      className="flex w-full items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-4 text-left transition-colors hover:border-border hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary/15 text-secondary">
        <UsersRound className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Travailler à plusieurs</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          Invite un créateur sur ton prochain morceau
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
