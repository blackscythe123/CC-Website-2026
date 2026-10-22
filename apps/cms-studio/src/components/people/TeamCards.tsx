"use client";

import { Crown, X } from "lucide-react";
import type { ClubRoles, UserRoleInfo, UserRoleType } from "@/lib/roles";
import { ALL_VERTICALS } from "@/lib/verticals";
import { canRemoveRole } from "@/lib/governance";
import { Avatar, Card, VerticalIcon } from "@/components/ui";
import { ROLE_LABEL, actorRoleIn } from "./shared";

export interface RemoveTarget {
  username: string;
  role: UserRoleType;
  vertical?: string;
}

function PersonChip({ login, removable, onRemove, roleLabel }: { login: string; removable: boolean; onRemove: () => void; roleLabel: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-bg py-0.5 pl-0.5 pr-1 text-[13px]">
      <Avatar login={login} size={22} />
      <span className="truncate pr-1">@{login}</span>
      {removable ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove @${login} as ${roleLabel}`}
          title={`Remove as ${roleLabel}`}
          className="rounded-full p-0.5 text-muted transition hover:bg-danger-bg hover:text-danger"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </span>
  );
}

function Row({ label, people, role, vertical, actorRole, superadminCount, onRemove }: {
  label: string;
  people: string[];
  role: UserRoleType;
  vertical?: string;
  actorRole: UserRoleType | null;
  superadminCount: number;
  onRemove: (t: RemoveTarget) => void;
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[6.5rem_1fr] sm:items-start">
      <span className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {people.length === 0 ? (
          <span className="pt-0.5 text-[13px] text-subtle">None yet</span>
        ) : (
          people.map((p) => (
            <PersonChip
              key={p}
              login={p}
              roleLabel={ROLE_LABEL[role]}
              removable={canRemoveRole(actorRole, role, superadminCount)}
              onRemove={() => onRemove({ username: p, role, vertical })}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function SuperadminsCard({ roles, roleInfo, onRemove }: { roles: ClubRoles; roleInfo: UserRoleInfo | null; onRemove: (t: RemoveTarget) => void }) {
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Crown className="h-4 w-4 text-warning" aria-hidden />
        <h3 className="text-[15px] font-bold">Superadmins</h3>
        <span className="text-[13px] text-muted">· all verticals</span>
      </div>
      <Row
        label="Superadmins"
        people={roles.superadmins}
        role="superadmin"
        actorRole={roleInfo?.role === "superadmin" ? "superadmin" : null}
        superadminCount={roles.superadmins.length}
        onRemove={onRemove}
      />
    </Card>
  );
}

export function VerticalTeams({ roles, roleInfo, onRemove }: { roles: ClubRoles; roleInfo: UserRoleInfo | null; onRemove: (t: RemoveTarget) => void }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {ALL_VERTICALS.map((v) => {
        const heads = roles.vertical_heads[v.slug] || [];
        const deputies = roles.deputies[v.slug] || [];
        const members = roles.members[v.slug] || [];
        const actorRole = actorRoleIn(roleInfo, v.slug);
        return (
          <Card key={v.slug} className="space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-bg text-info">
                <VerticalIcon slug={v.slug} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold leading-tight">{v.name}</h3>
                <p className="text-xs text-muted">
                  {heads.length} head · {deputies.length} {deputies.length === 1 ? "deputy" : "deputies"} · {members.length}{" "}
                  {members.length === 1 ? "member" : "members"}
                </p>
              </div>
            </div>
            <Row label="Head" people={heads} role="vertical_head" vertical={v.slug} actorRole={actorRole} superadminCount={roles.superadmins.length} onRemove={onRemove} />
            <Row label="Deputies" people={deputies} role="deputy" vertical={v.slug} actorRole={actorRole} superadminCount={roles.superadmins.length} onRemove={onRemove} />
            <Row label="Members" people={members} role="member" vertical={v.slug} actorRole={actorRole} superadminCount={roles.superadmins.length} onRemove={onRemove} />
          </Card>
        );
      })}
    </div>
  );
}
