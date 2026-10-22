import { CloudCheck, Loader2, MonitorCheck, RotateCcw } from "lucide-react";
import { saveStatusText, type SaveState } from "@/lib/saveStatus";

/** "Saved on this device · 2:31 PM" / "Synced to GitHub · …" — always visible, compact on phones. */
export default function SaveStatusChip({ state }: { state: SaveState }) {
  const full = saveStatusText(state);
  const Icon =
    state.kind === "saving" ? Loader2 : state.kind === "synced" ? CloudCheck : state.kind === "restored" ? RotateCcw : MonitorCheck;
  const tone = state.kind === "idle" ? "text-subtle" : state.kind === "saving" ? "text-muted" : "text-success";

  return (
    <span role="status" aria-live="polite" title={full} className="inline-flex h-8 min-w-0 max-w-full items-center gap-1.5 align-middle text-[13px] text-muted">
      <Icon className={`h-4 w-4 shrink-0 ${tone} ${state.kind === "saving" ? "animate-spin" : ""}`} aria-hidden />
      <span className="hidden truncate sm:inline">{full}</span>
      <span className="truncate sm:hidden">{saveStatusText(state, true)}</span>
    </span>
  );
}
