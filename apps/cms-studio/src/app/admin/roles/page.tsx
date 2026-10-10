"use client";

import { useState, useEffect } from "react";
import StudioNav from "@/components/StudioNav";
import { UserRoleInfo, ClubRoles } from "@/lib/roles";
import {
  Shield,
  UserCheck,
  UserPlus,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileCode,
} from "lucide-react";

const ALL_VERTICALS = [
  { slug: "ai-ml", name: "🤖 AI & Machine Learning" },
  { slug: "web-dev", name: "🌐 Web Development" },
  { slug: "cybersecurity", name: "🛡️ Cybersecurity & CTF" },
  { slug: "cloud-devops", name: "☁️ Cloud & DevOps" },
  { slug: "competitive-programming", name: "🏆 Competitive Programming" },
  { slug: "mobile-dev", name: "📱 Mobile Development" },
  { slug: "ui-ux", name: "🎨 UI / UX Design" },
  { slug: "blockchain", name: "⛓️ Blockchain & Web3" },
  { slug: "iot-embedded", name: "⚡ IoT & Embedded Systems" },
  { slug: "game-dev", name: "🎮 Game Dev & XR" },
];

export default function RolesManagementPage() {
  const [user, setUser] = useState<{ login: string; name: string; avatar_url: string } | null>(
    null
  );
  const [roleInfo, setRoleInfo] = useState<UserRoleInfo | null>(null);
  const [roles, setRoles] = useState<ClubRoles | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [targetUsername, setTargetUsername] = useState("");
  const [targetRole, setTargetRole] = useState("vertical_head");
  const [targetVertical, setTargetVertical] = useState("ai-ml");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorFeedback, setErrorFeedback] = useState("");

  const fetchRoles = () => {
    fetch("/api/roles")
      .then((res) => res.json())
      .then((data) => {
        if (data.roles) {
          setRoles(data.roles);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
          setRoleInfo(data.roleInfo);
          if (data.roleInfo.role === "superadmin") {
            fetchRoles();
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

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
          vertical: targetRole === "vertical_head" ? targetVertical : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setFeedback(data.message || "Role updated successfully!");
      setRoles(data.roles);
      setTargetUsername("");
    } catch (err: unknown) {
      setErrorFeedback(err instanceof Error ? err.message : "Error saving role");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (
    targetUser: string,
    role: string,
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  if (roleInfo?.role !== "superadmin") {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <StudioNav user={user} roleInfo={roleInfo} />
        <div className="mx-auto max-w-lg px-4 py-20 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <Shield className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Access Restricted</h2>
          <p className="text-sm text-gray-500">
            Only designated Club Superadmins have authorization to access role assignment and
            governance controls.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans">
      <StudioNav user={user} roleInfo={roleInfo} />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-10">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
              👑 Superadmin Control
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <FileCode className="h-3.5 w-3.5" />
              <span>Synced with .github/CODEOWNERS &amp; roles.json</span>
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Club Role &amp; Hierarchy Management
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Designate Superadmins, Core Admins, and Vertical Heads. Updating assignments
            automatically updates Git-backed code owners and PR approval rules.
          </p>
        </div>

        {/* Feedback alerts */}
        {feedback && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {errorFeedback && (
          <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm font-medium text-red-800">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{errorFeedback}</span>
          </div>
        )}

        {/* Add Role Form Card */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">Assign Member Permissions</h2>
          </div>

          <form onSubmit={handleAssignRole} className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                GitHub Username
              </label>
              <div className="flex rounded-xl border border-gray-200 shadow-xs focus-within:border-purple-600">
                <span className="inline-flex items-center px-3 text-sm text-gray-400 bg-gray-50 rounded-l-xl border-r border-gray-200">
                  @
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. sarah-j"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  className="w-full rounded-r-xl p-2.5 text-sm text-gray-800 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Role Tier
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm font-medium text-gray-800 shadow-xs focus:border-purple-600 focus:outline-hidden"
              >
                <option value="vertical_head">Vertical Head</option>
                <option value="core_admin">Core Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>

            {targetRole === "vertical_head" && (
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

            <div className="sm:col-span-4 flex justify-end pt-2">
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

        {/* Current Hierarchy Cards */}
        <section className="space-y-6">
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
            Current Hierarchy &amp; Jurisdictions
          </h2>

          {/* Superadmins & Core Admins Grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                  👑 Superadmins
                </span>
                <span className="text-xs text-purple-600 font-semibold">Full Authority</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {roles?.superadmins.map((u) => (
                  <span
                    key={u}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-purple-900 shadow-xs border border-purple-200"
                  >
                    @{u}
                    {roles.superadmins.length > 1 && (
                      <button
                        onClick={() => handleRemoveRole(u, "superadmin")}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  🏛️ Core Admins
                </span>
                <span className="text-xs text-blue-600 font-semibold">Announcements</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {roles?.core_admins.map((u) => (
                  <span
                    key={u}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-900 shadow-xs border border-blue-200"
                  >
                    @{u}
                    <button
                      onClick={() => handleRemoveRole(u, "core_admin")}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Vertical Heads Table */}
          <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-xs">
            <div className="border-b border-gray-100 p-6">
              <h3 className="font-bold text-gray-900">Vertical Heads &amp; Review Jurisdictions</h3>
              <p className="text-xs text-gray-500 mt-1">
                Each designated Vertical Head has mandatory approval authority over PRs in their vertical.
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {ALL_VERTICALS.map((v) => {
                const heads = roles?.vertical_heads[v.slug] || [];
                return (
                  <div
                    key={v.slug}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-gray-50/50 transition"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{v.name}</div>
                      <div className="text-xs text-gray-400 font-mono">
                        content/verticals/{v.slug}/**
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {heads.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">No head assigned (Superadmin fallback)</span>
                      ) : (
                        heads.map((h) => (
                          <span
                            key={h}
                            className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800"
                          >
                            @{h}
                            <button
                              onClick={() => handleRemoveRole(h, "vertical_head", v.slug)}
                              className="text-gray-400 hover:text-red-600"
                              title="Remove as vertical head"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
