"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Send } from "lucide-react";
import type { ClubRoles, RoleRequest, UserRoleType } from "@/lib/roles";
import { verticalLabel } from "@/lib/verticals";
import { useStudio } from "@/components/shell/StudioContext";
import { useToast } from "@/components/toast/ToastProvider";
import { Button, ConfirmDialog, Skeleton, TabPanel, Tabs } from "@/components/ui";
import AssignRoleCard, { type CandidateUser } from "@/components/people/AssignRoleCard";
import { SuperadminsCard, VerticalTeams, type RemoveTarget } from "@/components/people/TeamCards";
import { ApplicationsList, ApplyDialog, JoinVerticalView } from "@/components/people/Applications";
import { ROLE_LABEL } from "@/components/people/shared";

export default function PeoplePage() {
  const { user, roleInfo } = useStudio();
  const toast = useToast();
  const canManage = roleInfo?.role === "superadmin" || roleInfo?.role === "vertical_head" || roleInfo?.role === "deputy";

  const [roles, setRoles] = useState<ClubRoles | null>(null);
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"team" | "applications">("team");
  const [removing, setRemoving] = useState<RemoveTarget | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    const jobs: Promise<void>[] = [
      fetch("/api/roles/requests")
        .then((r) => r.json())
        .then((d) => setRequests(d.requests || []))
        .catch(() => {}),
    ];
    if (canManage) {
      jobs.push(
        fetch("/api/roles")
          .then((r) => r.json())
          .then((d) => {
            if (d.roles) setRoles(d.roles);
            if (d.candidates) setCandidates(d.candidates);
          })
          .catch(() => {})
      );
    }
    await Promise.all(jobs);
    setLoading(false);
  }, [canManage]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const postRole = async (body: object) => {
    const res = await fetch("/api/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Couldn't update the role");
    if (data.roles) setRoles(data.roles);
    return data;
  };

  const assign = async ({ username, role, vertical }: { username: string; role: UserRoleType; vertical?: string }) => {
    setSaving(true);
    try {
      const data = await postRole({ action: "assign", targetUsername: username, role, vertical });
      toast.success(data.message || `@${username} is now ${ROLE_LABEL[role]}`);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update the role");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setSaving(true);
    try {
      const data = await postRole({ action: "remove", targetUsername: removing.username, role: removing.role, vertical: removing.vertical });
      toast.success(data.message || `Removed @${removing.username}`);
      setRemoving(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove the role");
    } finally {
      setSaving(false);
    }
  };

  const review = async (requestId: string, action: "approve" | "reject", assignedRole?: "member" | "deputy" | "vertical_head") => {
    setSaving(true);
    try {
      const res = await fetch("/api/roles/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action, assignedRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Couldn't ${action} the application`);
      toast.success(data.message || `Application ${action === "approve" ? "approved" : "rejected"}`);
      if (data.roles) setRoles(data.roles);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Couldn't ${action} the application`);
    } finally {
      setSaving(false);
    }
  };

  const apply = async (input: { vertical: string; requestedRole: string; note: string }) => {
    setApplying(true);
    try {
      const res = await fetch("/api/roles/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't send your application");
      toast.success(data.message || "Application sent");
      setApplyOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send your application");
    } finally {
      setApplying(false);
    }
  };

  const myPending = requests.filter((r) => r.status === "pending" && r.username.toLowerCase() === user.login.toLowerCase());
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  if (!canManage) {
    return (
      <div className="px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="sr-only">Join a vertical</h1>
        {loading ? <Skeleton className="mx-auto h-64 max-w-xl" /> : <JoinVerticalView myPending={myPending} onApply={() => setApplyOpen(true)} />}
        <ApplyDialog open={applyOpen} submitting={applying} onClose={() => setApplyOpen(false)} onSubmit={apply} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="hidden text-2xl font-extrabold tracking-tight md:block">People</h1>
          <p className="mt-1 text-sm text-muted">Roles go Member → Deputy → Vertical head → Superadmin. Changes are saved to the repository.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={Send} onClick={() => setApplyOpen(true)}>
            Apply
          </Button>
          <Button size="sm" icon={RefreshCw} loading={refreshing} onClick={refresh}>
            Refresh
          </Button>
        </div>
      </header>

      <div className="mt-5">
        <Tabs
          ariaLabel="People"
          idPrefix="people"
          value={tab}
          onChange={(id) => setTab(id as "team" | "applications")}
          tabs={[
            { id: "team", label: "Team" },
            { id: "applications", label: "Applications", count: pendingCount },
          ]}
        />
        <TabPanel id={tab} idPrefix="people">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : tab === "team" ? (
            <div className="space-y-4">
              <AssignRoleCard roleInfo={roleInfo} roles={roles} candidates={candidates} saving={saving} onAssign={assign} />
              {roles ? (
                <>
                  <SuperadminsCard roles={roles} roleInfo={roleInfo} onRemove={setRemoving} />
                  <VerticalTeams roles={roles} roleInfo={roleInfo} onRemove={setRemoving} />
                </>
              ) : null}
            </div>
          ) : (
            <ApplicationsList requests={requests} roleInfo={roleInfo} saving={saving} onReview={review} />
          )}
        </TabPanel>
      </div>

      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this role?"
        loading={saving}
        confirmLabel="Remove"
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
        message={
          removing ? (
            <p>
              <strong className="text-text">@{removing.username}</strong> will no longer be {ROLE_LABEL[removing.role].toLowerCase()}
              {removing.vertical ? ` of ${verticalLabel(removing.vertical)}` : ""}. This updates roles.json and CODEOWNERS in the repository.
            </p>
          ) : null
        }
      />
      <ApplyDialog open={applyOpen} submitting={applying} onClose={() => setApplyOpen(false)} onSubmit={apply} />
    </div>
  );
}
