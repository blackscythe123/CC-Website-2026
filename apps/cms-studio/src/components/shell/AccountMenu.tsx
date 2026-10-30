"use client";

import { useRouter } from "next/navigation";
import { CircleAlert, Clock, LogOut, SquareCheck } from "lucide-react";
import { Avatar, Menu } from "@/components/ui";
import ThemeSwitch from "@/components/theme/ThemeSwitch";
import type { UserProfile } from "@/lib/hooks/useStudioSession";
import type { InboxItem } from "@/lib/hooks/useReviewQueue";
import type { UserRoleInfo } from "@/lib/roles";

export function roleLabel(roleInfo: UserRoleInfo | null) {
  switch (roleInfo?.role) {
    case "superadmin":
      return "Superadmin";
    case "vertical_head":
      return "Vertical head";
    case "deputy":
      return "Deputy";
    default:
      return roleInfo?.verticals.length ? "Member" : "No role yet";
  }
}

const INBOX_TEXT: Record<InboxItem["type"], { label: string; icon: typeof Clock }> = {
  needs_approval: { label: "Waiting for your review", icon: SquareCheck },
  changes_requested: { label: "Changes requested", icon: CircleAlert },
  submitted: { label: "In review", icon: Clock },
};

/**
 * Account button: opens a menu with the inbox (same notifications the old bell showed),
 * the theme switch and sign out.
 */
export default function AccountMenu({
  user,
  roleInfo,
  inbox,
  compact = false,
  align = "start",
  placement = "below",
}: {
  user: UserProfile;
  roleInfo: UserRoleInfo | null;
  inbox: InboxItem[];
  compact?: boolean;
  align?: "start" | "end";
  placement?: "below" | "above";
}) {
  const router = useRouter();

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    window.location.href = "/";
  };

  const items = [
    ...inbox.slice(0, 8).map((n) => ({
      id: `inbox-${n.type}-${n.number}`,
      label: `#${n.number} ${n.title}`,
      icon: INBOX_TEXT[n.type].icon,
      hint: INBOX_TEXT[n.type].label,
      onSelect: () => router.push(n.type === "changes_requested" ? `/admin?revise=${n.number}` : "/admin/reviews"),
    })),
    { id: "signout", label: "Sign out", icon: LogOut, onSelect: signOut },
  ];

  const header = (
    <div className="mb-1 border-b border-border px-2.5 pb-2.5 pt-1.5">
      <div className="truncate text-sm font-semibold">{user.name || user.login}</div>
      <div className="truncate text-xs text-muted">
        @{user.login} · {roleLabel(roleInfo)}
      </div>
      <ThemeSwitch className="mt-2.5" />
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Inbox {inbox.length ? `(${inbox.length})` : ""}
      </div>
      {inbox.length === 0 ? <div className="mt-1 text-xs text-muted">Nothing new.</div> : null}
    </div>
  );

  return (
    <div className={placement === "above" ? "[&_[role=menu]]:bottom-full [&_[role=menu]]:top-auto [&_[role=menu]]:mb-1.5" : ""}>
      <Menu
        align={align}
        header={header}
        items={items}
        trigger={(p) => (
          <button
            {...p}
            type="button"
            aria-label={`Account and inbox${inbox.length ? `, ${inbox.length} notifications` : ""}`}
            className={`relative flex min-w-0 items-center gap-2.5 rounded-lg text-left transition hover:bg-surface-2 ${compact ? "p-1" : "w-full p-1.5"}`}
          >
            <Avatar src={user.avatar_url} login={user.login} size={compact ? 30 : 32} />
            {!compact ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">@{user.login}</span>
                <span className="block truncate text-xs text-muted">{roleLabel(roleInfo)}</span>
              </span>
            ) : null}
            {inbox.length > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-accent">
                {inbox.length}
              </span>
            ) : null}
          </button>
        )}
      />
    </div>
  );
}
