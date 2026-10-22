"use client";

import { useState } from "react";
import { Clock, Send } from "lucide-react";
import type { RoleRequest, UserRoleInfo, UserRoleType } from "@/lib/roles";
import { ALL_VERTICALS, verticalLabel } from "@/lib/verticals";
import { assignableRoles } from "@/lib/governance";
import { Avatar, Badge, Button, Card, Dialog, EmptyState, Field, Select, Textarea, VerticalIcon } from "@/components/ui";
import { NoApplications } from "@/components/illustrations";
import { ROLE_LABEL, actorRoleIn } from "./shared";

type RequestRole = "member" | "deputy" | "vertical_head";

const STATUS_TONE = { pending: "warning", approved: "success", rejected: "danger" } as const;

export function ApplicationsList({
  requests,
  roleInfo,
  saving,
  onReview,
}: {
  requests: RoleRequest[];
  roleInfo: UserRoleInfo | null;
  saving: boolean;
  onReview: (id: string, action: "approve" | "reject", role?: RequestRole) => void;
}) {
  const [assigned, setAssigned] = useState<Record<string, RequestRole>>({});

  if (requests.length === 0) {
    return <EmptyState illustration={NoApplications} title="No applications yet" body="Requests to join a vertical or move up a role show up here." />;
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const options = assignableRoles(actorRoleIn(roleInfo, req.vertical)).filter((r): r is RequestRole => r !== "superadmin");
        const chosen = assigned[req.id] || req.requestedRole;
        const adjusted = chosen !== req.requestedRole;
        return (
          <Card key={req.id} className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <Avatar src={req.avatarUrl} login={req.username} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold">@{req.username}</span>
                {req.displayName ? <span className="text-sm text-muted">{req.displayName}</span> : null}
                <Badge tone={STATUS_TONE[req.status]}>{req.status === "pending" ? "Pending" : req.status === "approved" ? "Approved" : "Rejected"}</Badge>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                <span className="inline-flex items-center gap-1">
                  <VerticalIcon slug={req.vertical} className="h-3.5 w-3.5" />
                  {verticalLabel(req.vertical)}
                </span>
                <span>· wants {ROLE_LABEL[req.requestedRole as UserRoleType]}</span>
                <span className="inline-flex items-center gap-1">
                  · <Clock className="h-3.5 w-3.5" aria-hidden /> {new Date(req.createdAt).toLocaleDateString()}
                </span>
              </p>
              {req.note ? <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-sm">&ldquo;{req.note}&rdquo;</p> : null}
              {req.reviewedBy ? <p className="mt-1.5 text-xs text-muted">Reviewed by @{req.reviewedBy}</p> : null}
            </div>
            {req.status === "pending" && options.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 sm:max-w-[16rem] sm:justify-end">
                {options.length > 1 ? (
                  <>
                    <label htmlFor={`assign-${req.id}`} className="sr-only">
                      Approve as
                    </label>
                    <Select
                      id={`assign-${req.id}`}
                      value={chosen}
                      onChange={(e) => setAssigned((m) => ({ ...m, [req.id]: e.target.value as RequestRole }))}
                      className="h-8 w-auto text-[13px]"
                    >
                      {options.map((o) => (
                        <option key={o} value={o}>
                          {ROLE_LABEL[o]}
                        </option>
                      ))}
                    </Select>
                  </>
                ) : null}
                <Button size="sm" onClick={() => onReview(req.id, "reject")} disabled={saving}>
                  Reject
                </Button>
                <Button size="sm" variant="primary" onClick={() => onReview(req.id, "approve", chosen)} disabled={saving}>
                  {adjusted ? `Approve as ${ROLE_LABEL[chosen]}` : "Approve"}
                </Button>
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

export function ApplyDialog({
  open,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: { vertical: string; requestedRole: RequestRole; note: string }) => void;
}) {
  const [vertical, setVertical] = useState("ai-ml");
  const [role, setRole] = useState<RequestRole>("member");
  const [note, setNote] = useState("");

  return (
    <Dialog
      open={open}
      onClose={submitting ? () => {} : onClose}
      title="Apply to a vertical"
      description="A head or superadmin of the vertical reviews your application."
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" icon={Send} loading={submitting} onClick={() => onSubmit({ vertical, requestedRole: role, note: note.trim() })}>
            Send application
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Vertical" htmlFor="apply-vertical">
          <Select id="apply-vertical" value={vertical} onChange={(e) => setVertical(e.target.value)}>
            {ALL_VERTICALS.map((v) => (
              <option key={v.slug} value={v.slug}>
                {v.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Role" htmlFor="apply-role">
          <Select id="apply-role" value={role} onChange={(e) => setRole(e.target.value as RequestRole)}>
            <option value="member">Member — write articles</option>
            <option value="deputy">Deputy — also review articles</option>
            <option value="vertical_head">Vertical head — lead the vertical</option>
          </Select>
        </Field>
        <Field label="Note" htmlFor="apply-note" hint="Optional — background, interests or a portfolio link">
          <Textarea id="apply-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

export function JoinVerticalView({ myPending, onApply }: { myPending: RoleRequest[]; onApply: () => void }) {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card className="text-center">
        <NoApplications className="mx-auto h-24 w-auto" />
        <h2 className="mt-3 text-lg font-bold tracking-tight">{myPending.length ? "Your application is being reviewed" : "Join a vertical"}</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
          {myPending.length
            ? "A head or superadmin will approve it soon. You can keep writing drafts meanwhile."
            : "To submit articles, ask to join one of the club's verticals."}
        </p>
        <Button variant={myPending.length ? "secondary" : "primary"} icon={Send} onClick={onApply} className="mt-4">
          {myPending.length ? "Apply to another vertical" : "Apply to a vertical"}
        </Button>
      </Card>
      {myPending.map((req) => (
        <Card key={req.id} className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info-bg text-info">
            <VerticalIcon slug={req.vertical} />
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <div className="font-semibold">
              {verticalLabel(req.vertical)} · {ROLE_LABEL[req.requestedRole as UserRoleType]}
            </div>
            <div className="text-muted">Sent {new Date(req.createdAt).toLocaleString()}</div>
            {req.note ? <div className="mt-1 truncate text-muted">&ldquo;{req.note}&rdquo;</div> : null}
          </div>
          <Badge tone="warning">Pending</Badge>
        </Card>
      ))}
    </div>
  );
}
