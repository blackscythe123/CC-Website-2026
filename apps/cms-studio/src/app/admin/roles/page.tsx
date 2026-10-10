"use client";

import { useState, useEffect } from "react";
import StudioNav from "@/components/StudioNav";
import { ClubRoles, UserRoleInfo, RoleRequest } from "@/lib/roles";
import {
  Crown,
  Shield,
  Trash2,
  AlertCircle,
  CheckCircle,
  FileCode,
  UserCheck,
  AlertTriangle,
  Loader2,
  Users,
  Send,
  X,
  Clock,
  Check,
} from "lucide-react";

interface VerifiedGitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  bio?: string;
}

interface CandidateUser {
  login: string;
  name?: string;
  avatar_url?: string;
  status?: string;
}

const ALL_VERTICALS = [
  { slug: "ai-ml", name: "🤖 AI / ML" },
  { slug: "ar-vr-game-dev", name: "🎮 AR, VR & Game Dev" },
  { slug: "competitive-programming", name: "🏆 Competitive Programming" },
  { slug: "cybersecurity", name: "🛡️ Cyber Security" },
  { slug: "ssnhacks", name: "⚡ SSN Hacks" },
  { slug: "design-ui-ux", name: "🎨 Design & UI/UX" },
  { slug: "full-stack", name: "🌐 Full Stack" },
  { slug: "open-source", name: "💻 Open Source (OSS)" },
];

export default function AdminRolesPage() {
  const [user, setUser] = useState<{ login: string; name: string; avatar_url: string } | null>(
    null
  );
  const [roleInfo, setRoleInfo] = useState<UserRoleInfo | null>(null);
  const [roles, setRoles] = useState<ClubRoles | null>(null);
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"hierarchy" | "requests">("hierarchy");

  // Assignment Form State
  const [targetUsername, setTargetUsername] = useState("");
  const [targetRole, setTargetRole] = useState<"superadmin" | "vertical_head" | "deputy" | "member">(
    "vertical_head"
  );
  const [targetVertical, setTargetVertical] = useState("ai-ml");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorFeedback, setErrorFeedback] = useState("");

  // Debounced User Verification State
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [checkingUser, setCheckingUser] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<VerifiedGitHubUser | null>(null);
  const [existingAssignment, setExistingAssignment] = useState<string | null>(null);

  // New Request Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyVertical, setApplyVertical] = useState("ai-ml");
  const [applyRole, setApplyRole] = useState<"member" | "deputy" | "vertical_head">("member");
  const [applyNote, setApplyNote] = useState("");
  const [submittingApply, setSubmittingApply] = useState(false);

  const fetchRolesData = () => {
    fetch("/api/roles")
      .then((res) => res.json())
      .then((data) => {
        if (data.roles) setRoles(data.roles);
        if (data.candidates) setCandidates(data.candidates);
      })
      .catch(() => {});

    fetch("/api/roles/requests")
      .then((res) => res.json())
      .then((data) => {
        if (data.requests) setRequests(data.requests);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
          setRoleInfo(data.roleInfo);
          fetchRolesData();
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Keystroke Debounce (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(targetUsername.trim().replace(/^@/, ""));
    }, 400);

    return () => clearTimeout(timer);
  }, [targetUsername]);

  // When debounced query changes, check user existence & current role
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setVerifiedUser(null);
      setExistingAssignment(null);
      setCheckingUser(false);
      return;
    }

    const normalized = debouncedQuery.toLowerCase();
    let currentRoleText: string | null = null;

    if (roles?.superadmins?.some((u) => u.toLowerCase() === normalized)) {
      currentRoleText = "Super Admin (Global Authority)";
    } else {
      for (const [v, heads] of Object.entries(roles?.vertical_heads || {})) {
        if (heads.some((u) => u.toLowerCase() === normalized)) {
          const vertName = ALL_VERTICALS.find((item) => item.slug === v)?.name || v;
          currentRoleText = `Vertical Head for ${vertName}`;
          break;
        }
      }
      if (!currentRoleText) {
        for (const [v, deps] of Object.entries(roles?.deputies || {})) {
          if (deps.some((u) => u.toLowerCase() === normalized)) {
            const vertName = ALL_VERTICALS.find((item) => item.slug === v)?.name || v;
            currentRoleText = `Deputy for ${vertName}`;
            break;
          }
        }
      }
      if (!currentRoleText) {
        for (const [v, mems] of Object.entries(roles?.members || {})) {
          if (mems.some((u) => u.toLowerCase() === normalized)) {
            const vertName = ALL_VERTICALS.find((item) => item.slug === v)?.name || v;
            currentRoleText = `Member in ${vertName}`;
            break;
          }
        }
      }
    }
    setExistingAssignment(currentRoleText);

    // Query server for GitHub profile verification
    setCheckingUser(true);
    fetch(`/api/roles/check-user?username=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.exists && data.user) {
          setVerifiedUser(data.user);
        } else {
          setVerifiedUser(null);
        }
      })
      .catch(() => setVerifiedUser(null))
      .finally(() => setCheckingUser(false));
  }, [debouncedQuery, roles]);

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername.trim()) return;

    setSaving(true);
    setFeedback("");
    setErrorFeedback("");

    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          targetUsername: targetUsername.trim(),
          role: targetRole,
          vertical: targetRole === "superadmin" ? undefined : targetVertical,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update role assignment");
      }

      setFeedback(data.message || "Role assigned successfully!");
      setRoles(data.roles);
      setTargetUsername("");
      setVerifiedUser(null);
    } catch (err: unknown) {
      setErrorFeedback(err instanceof Error ? err.message : "Error saving role");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (
    targetUser: string,
    role: "superadmin" | "vertical_head" | "deputy" | "member",
    vertical?: string
  ) => {
    setSaving(true);
    setFeedback("");
    setErrorFeedback("");

    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          targetUsername: targetUser,
          role,
          vertical,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove role");
      }

      setFeedback(data.message || "Role removed successfully!");
      setRoles(data.roles);
    } catch (err: unknown) {
      setErrorFeedback(err instanceof Error ? err.message : "Error removing role");
    } finally {
      setSaving(false);
    }
  };

  const handleReviewRequest = async (requestId: string, action: "approve" | "reject") => {
    setSaving(true);
    setFeedback("");
    setErrorFeedback("");

    try {
      const res = await fetch("/api/roles/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} request`);
      }

      setFeedback(data.message || `Request ${action}d successfully.`);
      if (data.roles) setRoles(data.roles);
      fetchRolesData();
    } catch (err: unknown) {
      setErrorFeedback(err instanceof Error ? err.message : "Error reviewing request");
    } finally {
      setSaving(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingApply(true);
    setFeedback("");
    setErrorFeedback("");

    try {
      const res = await fetch("/api/roles/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical: applyVertical,
          requestedRole: applyRole,
          note: applyNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      setFeedback(data.message || "Request submitted successfully!");
      setShowApplyModal(false);
      setApplyNote("");
      fetchRolesData();
    } catch (err: unknown) {
      setErrorFeedback(err instanceof Error ? err.message : "Error submitting request");
    } finally {
      setSubmittingApply(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  const isSuperadmin = roleInfo?.role === "superadmin";
  const isVerticalHead = roleInfo?.role === "vertical_head";
  const isDeputy = roleInfo?.role === "deputy";
  const canManage = isSuperadmin || isVerticalHead || isDeputy;

  const myPendingRequests = requests.filter(
    (r) => r.status === "pending" && r.username.toLowerCase() === user?.login.toLowerCase()
  );

  if (!canManage) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <StudioNav user={user} roleInfo={roleInfo} />
        <div className="mx-auto max-w-lg px-4 py-12 space-y-6">
          {feedback && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs font-semibold text-emerald-800 flex items-center justify-between">
              <span>{feedback}</span>
              <button onClick={() => setFeedback("")} className="text-emerald-600 hover:text-emerald-900">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {errorFeedback && (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-xs font-semibold text-red-800 flex items-center justify-between">
              <span>{errorFeedback}</span>
              <button onClick={() => setErrorFeedback("")} className="text-red-600 hover:text-red-900">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {myPendingRequests.length > 0 ? (
            <div className="rounded-3xl border border-purple-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Application Pending Review</h2>
                  <p className="text-xs text-gray-500">Your join request is awaiting approval by a Vertical Head or Super Admin.</p>
                </div>
              </div>

              <div className="space-y-3">
                {myPendingRequests.map((req) => (
                  <div key={req.id} className="rounded-2xl border border-gray-100 bg-purple-50/40 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="rounded-md bg-purple-100 px-2 py-0.5 font-bold text-purple-800 uppercase">
                        {ALL_VERTICALS.find((v) => v.slug === req.vertical)?.name || req.vertical}
                      </span>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                        ⏳ Pending Approval
                      </span>
                    </div>
                    <div className="text-xs text-gray-700">
                      Requested Role: <strong className="capitalize">{req.requestedRole}</strong>
                    </div>
                    {req.note && (
                      <p className="text-xs text-gray-500 italic">&ldquo;{req.note}&rdquo;</p>
                    )}
                    <div className="text-[10px] text-gray-400">
                      Submitted on {new Date(req.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="text-xs text-purple-700 hover:text-purple-900 font-semibold"
                >
                  + Apply for Another Vertical
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 pt-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
                <Shield className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Join a Technical Vertical</h2>
              <p className="text-sm text-gray-500">
                You are logged in as a student member. To start drafting articles for a vertical, request to join below!
              </p>
              <button
                onClick={() => setShowApplyModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-700 transition"
              >
                <Send className="h-4 w-4" />
                <span>Apply to Join a Vertical</span>
              </button>
            </div>
          )}
        </div>

        {/* Apply Modal */}
        {showApplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">Request Vertical Membership</h3>
                <button onClick={() => setShowApplyModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Select Vertical</label>
                  <select
                    value={applyVertical}
                    onChange={(e) => setApplyVertical(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-sm"
                  >
                    {ALL_VERTICALS.map((v) => (
                      <option key={v.slug} value={v.slug}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Role Tier</label>
                  <select
                    value={applyRole}
                    onChange={(e) => setApplyRole(e.target.value as any)}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-sm"
                  >
                    <option value="member">Member</option>
                    <option value="deputy">Deputy</option>
                    <option value="vertical_head">Vertical Head</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Brief Note</label>
                  <textarea
                    rows={3}
                    placeholder="Brief background or areas of interest..."
                    value={applyNote}
                    onChange={(e) => setApplyNote(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingApply}
                    className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700"
                  >
                    {submittingApply ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentHeadForSelected = roles?.vertical_heads?.[targetVertical]?.[0];

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans">
      <StudioNav user={user} roleInfo={roleInfo} />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                👑 Club Governance
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <FileCode className="h-3.5 w-3.5" />
                <span>Synced with .github/CODEOWNERS &amp; roles.json</span>
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Role &amp; Hierarchy Management
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Four tiers: <strong>Member &rarr; Deputy &rarr; Vertical Head &rarr; Super Admin</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowApplyModal(true)}
              className="rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition"
            >
              + Submit Join Request
            </button>
            <button
              onClick={fetchRolesData}
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("hierarchy")}
            className={`pb-3 transition ${
              activeTab === "hierarchy"
                ? "border-b-2 border-purple-600 text-purple-700 font-bold"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Role Hierarchy &amp; Allocations
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-3 transition flex items-center gap-2 ${
              activeTab === "requests"
                ? "border-b-2 border-purple-600 text-purple-700 font-bold"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <span>Applications &amp; Requests</span>
            {requests.filter((r) => r.status === "pending").length > 0 && (
              <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[10px] text-white font-bold">
                {requests.filter((r) => r.status === "pending").length}
              </span>
            )}
          </button>
        </div>

        {/* Feedback Alerts */}
        {feedback && (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {errorFeedback && (
          <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm font-medium text-red-800">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{errorFeedback}</span>
          </div>
        )}

        {activeTab === "hierarchy" ? (
          <>
            {/* Promotion & Role Assignment Card (Superadmin or Vertical Head) */}
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-bold text-gray-900">Allocate or Promote Member</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Assign user to a tier. Strictly 1 Vertical Head is permitted per vertical.
                </p>
              </div>

              <form onSubmit={handleAssignRole} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                      GitHub Username
                    </label>
                    <div className="relative flex rounded-xl border border-gray-200 shadow-xs focus-within:border-purple-600 bg-white">
                      <span className="inline-flex items-center px-3 text-sm text-gray-400 bg-gray-50 rounded-l-xl border-r border-gray-200">
                        @
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Isha666 or blackscythe123"
                        value={targetUsername}
                        onChange={(e) => setTargetUsername(e.target.value)}
                        className="w-full rounded-r-xl p-2.5 text-sm text-gray-800 focus:outline-hidden"
                      />
                      {checkingUser && (
                        <span className="absolute right-3 top-3 text-gray-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </span>
                      )}
                    </div>

                    {/* Active & Candidate Users Quick-Pill Tray */}
                    {candidates.length > 0 && (
                      <div className="pt-1">
                        <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold mb-1.5">
                          <span>👥 Active / Known Contributors ({candidates.length})</span>
                          <span className="text-[10px] text-gray-400">Click to select</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 border border-gray-100 rounded-xl bg-gray-50/70">
                          {candidates.map((cand) => (
                            <button
                              key={cand.login}
                              type="button"
                              onClick={() => {
                                setTargetUsername(cand.login);
                                setDebouncedQuery(cand.login);
                              }}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition border ${
                                targetUsername.toLowerCase().replace(/^@/, "") === cand.login.toLowerCase()
                                  ? "bg-purple-100 border-purple-300 text-purple-900 font-bold"
                                  : "bg-white border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50/50"
                              }`}
                            >
                              <img
                                src={cand.avatar_url || `https://github.com/${cand.login}.png`}
                                alt={cand.login}
                                className="h-4 w-4 rounded-full border border-gray-200"
                              />
                              <span className="font-mono">@{cand.login}</span>
                              {cand.status && (
                                <span className="text-[10px] text-gray-400 font-sans">
                                  ({cand.status})
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Role Tier
                    </label>
                    <select
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value as any)}
                      className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm font-medium text-gray-800 shadow-xs focus:border-purple-600 focus:outline-hidden"
                    >
                      <option value="member">Member (Assigned Vertical)</option>
                      <option value="deputy">Deputy (Co-Lead)</option>
                      {isSuperadmin && (
                        <>
                          <option value="vertical_head">Vertical Head (Admin - Max 1)</option>
                          <option value="superadmin">Super Admin (All)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {targetRole !== "superadmin" && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Assigned Vertical
                      </label>
                      <select
                        value={targetVertical}
                        onChange={(e) => setTargetVertical(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm font-medium text-gray-800 shadow-xs focus:border-purple-600 focus:outline-hidden"
                      >
                        {ALL_VERTICALS.map((v) => (
                          <option key={v.slug} value={v.slug}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Single Vertical Head Notice */}
                {targetRole === "vertical_head" && currentHeadForSelected && (
                  <div className="flex items-center gap-2 text-amber-800 bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Single Head Limit:</strong> @{currentHeadForSelected} is currently the single Vertical Head for{" "}
                      {ALL_VERTICALS.find((v) => v.slug === targetVertical)?.name}. Assigning @{targetUsername || "a new user"} will replace them.
                    </span>
                  </div>
                )}

                {/* Debounced User Status & Existing Role Warning */}
                {debouncedQuery && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 text-xs space-y-3 shadow-2xs">
                    {/* GitHub Profile Verification Card */}
                    {checkingUser ? (
                      <div className="flex items-center gap-2 text-gray-500 py-1">
                        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                        <span>Verifying GitHub profile for @{debouncedQuery}...</span>
                      </div>
                    ) : verifiedUser ? (
                      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                        <img
                          src={verifiedUser.avatar_url}
                          alt={verifiedUser.login}
                          className="h-10 w-10 rounded-full border border-emerald-300 shadow-2xs shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm">
                              {verifiedUser.name}
                            </span>
                            <a
                              href={`https://github.com/${verifiedUser.login}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-purple-700 hover:underline text-xs"
                            >
                              @{verifiedUser.login} ↗
                            </a>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <Check className="h-3 w-3" /> Verified GitHub
                            </span>
                          </div>
                          {verifiedUser.bio && (
                            <p className="mt-1 text-[11px] text-gray-600 line-clamp-2">
                              {verifiedUser.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-800 bg-amber-50 rounded-xl p-2.5 border border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>GitHub user <strong>@{debouncedQuery}</strong> not found. Make sure the username is spelled correctly.</span>
                      </div>
                    )}

                    {/* Current Assignment Status */}
                    {existingAssignment ? (
                      <div className="flex items-center gap-2 text-amber-800 bg-amber-50 rounded-xl p-2.5 border border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>
                          <strong>Current Role:</strong> @{debouncedQuery} is already assigned as{" "}
                          <strong>{existingAssignment}</strong>. Assigning a new role will update their jurisdiction.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 rounded-xl p-2.5 border border-emerald-200">
                        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>
                          @{debouncedQuery} has no current assignment. Ready to assign!
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition disabled:opacity-50"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>{saving ? "Updating..." : "Save Role Assignment"}</span>
                  </button>
                </div>
              </form>
            </section>

            {/* Current Hierarchy Section */}
            <section className="space-y-6">
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                Current Hierarchy &amp; Jurisdictions
              </h2>

              {/* Superadmins Grid */}
              <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-bold text-purple-900">Super Admins</span>
                  </div>
                  <span className="text-xs text-purple-600 font-semibold">Controls All Verticals</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {roles?.superadmins.map((u) => (
                    <span
                      key={u}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-purple-900 shadow-xs border border-purple-200"
                    >
                      @{u}
                      {isSuperadmin && roles.superadmins.length > 1 && (
                        <button
                          onClick={() => handleRemoveRole(u, "superadmin")}
                          className="text-gray-400 hover:text-red-600"
                          title="Remove Super Admin"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Vertical Heads, Deputies & Members Table */}
              <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                <div className="border-b border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900">Vertical Personnel (Heads, Deputies &amp; Members)</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Each vertical holds 1 Head, designated Deputies, and Members.
                  </p>
                </div>

                <div className="divide-y divide-gray-100">
                  {ALL_VERTICALS.map((v) => {
                    const heads = roles?.vertical_heads?.[v.slug] || [];
                    const deputies = roles?.deputies?.[v.slug] || [];
                    const members = roles?.members?.[v.slug] || [];

                    return (
                      <div
                        key={v.slug}
                        className="flex flex-col gap-4 p-5 hover:bg-gray-50/50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{v.name}</div>
                            <div className="text-xs text-gray-400 font-mono">
                              content/verticals/{v.slug}/**
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">
                            {heads.length} Head • {deputies.length} Deputies • {members.length} Members
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 text-xs">
                          {/* Vertical Head */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase text-blue-600 w-12">
                              Head:
                            </span>
                            {heads.length === 0 ? (
                              <span className="text-xs text-gray-400 italic">None assigned</span>
                            ) : (
                              heads.map((h) => (
                                <span
                                  key={h}
                                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-800"
                                >
                                  @{h}
                                  {isSuperadmin && (
                                    <button
                                      onClick={() => handleRemoveRole(h, "vertical_head", v.slug)}
                                      className="text-gray-400 hover:text-red-600"
                                      title="Remove as head"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </span>
                              ))
                            )}
                          </div>

                          {/* Deputies */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase text-emerald-600 w-14">
                              Deputies:
                            </span>
                            {deputies.length === 0 ? (
                              <span className="text-xs text-gray-400 italic">None assigned</span>
                            ) : (
                              deputies.map((d) => (
                                <span
                                  key={d}
                                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
                                >
                                  @{d}
                                  {(isSuperadmin || isVerticalHead) && (
                                    <button
                                      onClick={() => handleRemoveRole(d, "deputy", v.slug)}
                                      className="text-gray-400 hover:text-red-600"
                                      title="Remove as deputy"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </span>
                              ))
                            )}
                          </div>

                          {/* Members */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase text-gray-500 w-14">
                              Members:
                            </span>
                            {members.length === 0 ? (
                              <span className="text-xs text-gray-400 italic">None</span>
                            ) : (
                              members.map((m) => (
                                <span
                                  key={m}
                                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-700"
                                >
                                  @{m}
                                  {(isSuperadmin || isVerticalHead || isDeputy) && (
                                    <button
                                      onClick={() => handleRemoveRole(m, "member", v.slug)}
                                      className="text-gray-400 hover:text-red-600"
                                      title="Remove member"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        ) : (
          /* Applications & Requests Tab */
          <section className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Membership &amp; Promotion Applications</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Cumulative hierarchy: Member (Deputy, Head, or Super Admin) • Deputy (Head or Super Admin) • Vertical Head (Super Admin only).
                </p>
              </div>

              {requests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400 text-sm">
                  No applications submitted yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-gray-200 p-4 hover:bg-gray-50/50 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="rounded-md bg-purple-50 px-2 py-0.5 font-bold text-purple-700 uppercase">
                            {req.vertical}
                          </span>
                          <span className="font-semibold text-gray-700">
                            Requesting: <span className="capitalize">{req.requestedRole}</span>
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="flex items-center gap-1 text-gray-500">
                            <Clock className="h-3 w-3" />
                            {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              req.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : req.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <div className="font-semibold text-gray-900 text-sm">
                          @{req.username} {req.displayName ? `(${req.displayName})` : ""}
                        </div>
                        {req.note && (
                          <p className="text-xs text-gray-500 italic">
                            &ldquo;{req.note}&rdquo;
                          </p>
                        )}
                        {req.reviewedBy && (
                          <p className="text-[10px] text-gray-400">
                            Reviewed by @{req.reviewedBy}
                          </p>
                        )}
                      </div>

                      {req.status === "pending" && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleReviewRequest(req.id, "reject")}
                            disabled={saving}
                            className="rounded-xl border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleReviewRequest(req.id, "approve")}
                            disabled={saving}
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs"
                          >
                            Approve &amp; Assign
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Apply Modal */}
        {showApplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">Request Role or Vertical</h3>
                <button onClick={() => setShowApplyModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Select Vertical</label>
                  <select
                    value={applyVertical}
                    onChange={(e) => setApplyVertical(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-sm"
                  >
                    {ALL_VERTICALS.map((v) => (
                      <option key={v.slug} value={v.slug}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Target Role</label>
                  <select
                    value={applyRole}
                    onChange={(e) => setApplyRole(e.target.value as any)}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-sm"
                  >
                    <option value="member">Member</option>
                    <option value="deputy">Deputy</option>
                    <option value="vertical_head">Vertical Head</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Brief Note</label>
                  <textarea
                    rows={3}
                    placeholder="Brief background or portfolio link..."
                    value={applyNote}
                    onChange={(e) => setApplyNote(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingApply}
                    className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700"
                  >
                    {submittingApply ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
