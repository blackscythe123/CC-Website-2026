"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleCheck, ExternalLink, Info, TriangleAlert, UserCheck } from "lucide-react";
import type { ClubRoles, UserRoleInfo, UserRoleType } from "@/lib/roles";
import { ALL_VERTICALS } from "@/lib/verticals";
import { assignableRoles } from "@/lib/governance";
import { Avatar, Button, Card, Field, Input, Select, Spinner } from "@/components/ui";
import { ROLE_LABEL, actorRoleIn, currentAssignment } from "./shared";

export interface CandidateUser {
  login: string;
  name?: string;
  avatar_url?: string;
  status?: string;
}

interface VerifiedUser {
  login: string;
  name: string;
  avatar_url: string;
  bio?: string;
}

export default function AssignRoleCard({
  roleInfo,
  roles,
  candidates,
  saving,
  onAssign,
}: {
  roleInfo: UserRoleInfo | null;
  roles: ClubRoles | null;
  candidates: CandidateUser[];
  saving: boolean;
  onAssign: (input: { username: string; role: UserRoleType; vertical?: string }) => Promise<boolean>;
}) {
  const isSuperadmin = roleInfo?.role === "superadmin";
  const verticals = useMemo(
    () => (isSuperadmin ? ALL_VERTICALS : ALL_VERTICALS.filter((v) => assignableRoles(actorRoleIn(roleInfo, v.slug)).length > 0)),
    [isSuperadmin, roleInfo]
  );

  const [username, setUsername] = useState("");
  const [vertical, setVertical] = useState(verticals[0]?.slug || "");
  const roleOptions = useMemo(() => {
    const options = isSuperadmin ? assignableRoles("superadmin") : assignableRoles(actorRoleIn(roleInfo, vertical));
    return [...options].reverse();
  }, [isSuperadmin, roleInfo, vertical]);
  const [role, setRole] = useState<UserRoleType>(roleOptions[0] || "member");
  useEffect(() => {
    if (!roleOptions.includes(role)) setRole(roleOptions[0] || "member");
  }, [roleOptions, role]);

  // Debounced GitHub lookup (400 ms), as before.
  const [query, setQuery] = useState("");
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState<VerifiedUser | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setQuery(username.trim().replace(/^@/, "")), 400);
    return () => clearTimeout(t);
  }, [username]);
  useEffect(() => {
    if (query.length < 2) {
      setVerified(null);
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    fetch(`/api/roles/check-user?username=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setVerified(d.exists && d.user ? d.user : null))
      .catch(() => !cancelled && setVerified(null))
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, [query]);

  const existing = query ? currentAssignment(roles, query) : null;
  const currentHead = role === "vertical_head" ? roles?.vertical_heads?.[vertical]?.[0] : undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const done = await onAssign({ username: username.trim().replace(/^@/, ""), role, vertical: role === "superadmin" ? undefined : vertical });
    if (done) {
      setUsername("");
      setVerified(null);
    }
  };

  if (verticals.length === 0 && !isSuperadmin) return null;

  return (
    <Card>
      <h2 className="text-base font-bold tracking-tight">Add or change a role</h2>
      <p className="mt-1 text-sm text-muted">
        {isSuperadmin
          ? "You can assign any role. Each vertical has exactly one head."
          : "You can assign roles below your own in your verticals."}
      </p>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <Field label="GitHub username" htmlFor="assign-user">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">@</span>
              <Input
                id="assign-user"
                required
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="pl-7 pr-8"
              />
              {checking ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                  <Spinner size={14} />
                </span>
              ) : null}
            </div>
          </Field>
          <Field label="Role" htmlFor="assign-role">
            <Select id="assign-role" value={role} onChange={(e) => setRole(e.target.value as UserRoleType)}>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
          {role !== "superadmin" ? (
            <Field label="Vertical" htmlFor="assign-vertical">
              <Select id="assign-vertical" value={vertical} onChange={(e) => setVertical(e.target.value)}>
                {verticals.map((v) => (
                  <option key={v.slug} value={v.slug}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </div>

        {candidates.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted">Known contributors — click to pick</p>
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto p-0.5">
              {candidates.map((c) => {
                const selected = username.trim().replace(/^@/, "").toLowerCase() === c.login.toLowerCase();
                return (
                  <button
                    key={c.login}
                    type="button"
                    onClick={() => setUsername(c.login)}
                    aria-pressed={selected}
                    title={c.status}
                    className={`inline-flex max-w-full items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs transition ${
                      selected ? "border-accent bg-accent-soft font-semibold text-accent-strong" : "border-border bg-bg text-text hover:border-border-strong"
                    }`}
                  >
                    <Avatar src={c.avatar_url} login={c.login} size={20} />
                    <span className="truncate">@{c.login}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {query.length >= 2 && !checking ? (
          <div className="space-y-2">
            {verified ? (
              <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
                <Avatar src={verified.avatar_url} login={verified.login} size={36} />
                <div className="min-w-0 text-sm">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className="font-semibold">{verified.name}</span>
                    <a href={`https://github.com/${verified.login}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                      @{verified.login}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                      <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                      GitHub account found
                    </span>
                  </div>
                  {verified.bio ? <p className="mt-0.5 line-clamp-2 text-muted">{verified.bio}</p> : null}
                </div>
              </div>
            ) : (
              <p className="flex items-start gap-2 rounded-lg bg-warning-bg p-3 text-sm text-warning">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                No GitHub user called @{query}. Check the spelling.
              </p>
            )}
            <p className={`flex items-start gap-2 rounded-lg p-3 text-sm ${existing ? "bg-info-bg text-info" : "bg-success-bg text-success"}`}>
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {existing ? <>@{query} is currently: {existing}. Saving changes their role.</> : <>@{query} has no role yet.</>}
            </p>
          </div>
        ) : null}

        {currentHead ? (
          <p className="flex items-start gap-2 rounded-lg bg-warning-bg p-3 text-sm text-warning">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            @{currentHead} is the head of this vertical. A vertical has one head, so assigning someone else replaces them.
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" variant="primary" icon={UserCheck} loading={saving} disabled={!username.trim()}>
            Save role
          </Button>
        </div>
      </form>
    </Card>
  );
}
