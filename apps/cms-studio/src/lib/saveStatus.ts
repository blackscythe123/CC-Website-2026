export type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "local"; at: Date }
  | { kind: "synced"; at: Date }
  | { kind: "restored"; source: string };

function clock(at: Date) {
  return at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Text for the editor's save chip. `compact` is the phone variant (time only). */
export function saveStatusText(state: SaveState, compact = false): string {
  switch (state.kind) {
    case "idle":
      return compact ? "Not saved" : "Not saved yet";
    case "saving":
      return "Saving…";
    case "local":
      return compact ? clock(state.at) : `Saved on this device · ${clock(state.at)}`;
    case "synced":
      return compact ? clock(state.at) : `Synced to GitHub · ${clock(state.at)}`;
    case "restored":
      return compact ? "Restored" : `Restored from ${state.source}`;
  }
}
