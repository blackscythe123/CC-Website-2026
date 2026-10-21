"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Mail, ShieldAlert } from "lucide-react";
import type { UserProfile } from "@/lib/hooks/useStudioSession";
import { ALL_VERTICALS } from "@/lib/verticals";

export function StudioLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
        <p className="text-sm font-medium text-gray-500">Loading CMS Studio...</p>
      </div>
    </div>
  );
}

export function SignInScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 font-mono text-2xl font-bold text-white shadow-md">
          &lt;/&gt;
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">SSN Coding Club Studio</h1>
          <p className="mt-2 text-sm text-gray-500">
            Modern Medium-style writing canvas backed by GitHub.
          </p>
        </div>
        <a
          href="/api/auth"
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-black transition"
        >
          Sign in with GitHub
        </a>
      </div>
    </div>
  );
}

export function PendingInviteScreen({ user, inviteUrl }: { user: UserProfile; inviteUrl: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-lg space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-xs">
          <Mail className="h-8 w-8" />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            ⏳ Pending Invitation
          </span>
          <h1 className="mt-3 text-2xl font-extrabold text-gray-900">Accept Repository Invite</h1>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            You are signed in as <strong>@{user.login}</strong>. You have an invitation to join <strong>blackscythe123/CC-Website-2026</strong>, but you haven&apos;t accepted it yet!
          </p>
        </div>
        <div className="space-y-3">
          <a
            href={inviteUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white shadow-xs hover:bg-amber-700 transition"
          >
            <span>Accept Invitation on GitHub ↗</span>
          </a>
          <button
            onClick={() => window.location.reload()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
          >
            <span>I have accepted, check again</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function AccessRequestScreen({ user }: { user: UserProfile }) {
  const [requestVertical, setRequestVertical] = useState("full-stack");
  const [requestRole, setRequestRole] = useState<"member" | "deputy">("member");
  const [requestNote, setRequestNote] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const handleAccessRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSubmitting(true);
    setRequestError(null);
    setRequestSuccess(null);

    try {
      const res = await fetch("/api/roles/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical: requestVertical,
          requestedRole: requestRole,
          note: requestNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit role application");
      }

      setRequestSuccess(
        data.message ||
          "Your application has been submitted! Once approved by Superadmin or Vertical Head, you will receive repo push access automatically."
      );
    } catch (err: unknown) {
      setRequestError(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setRequestSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50/50 px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 text-left shadow-xl space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-100 pb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 shadow-xs shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700">
              🔒 Member Onboarding
            </span>
            <h1 className="text-xl font-extrabold text-gray-900 mt-1">Request Repository Access &amp; Role</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900 space-y-1.5">
          <p>
            Signed in as <strong>@{user.login}</strong> ({user.name || "GitHub Contributor"}).
          </p>
          <p className="text-blue-800">
            SSN Coding Club Studio is an internal tool. Submit your technical vertical request below to automatically trigger repository collaborator onboarding.
          </p>
        </div>

        {requestSuccess ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 space-y-3">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>Application Submitted Successfully!</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              {requestSuccess}
            </p>
            <div className="pt-2 flex items-center justify-between border-t border-emerald-200/60">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
              >
                Check Approval Status
              </button>
              <a
                href="/api/auth/logout"
                className="text-xs font-semibold text-emerald-800 hover:underline"
              >
                Sign Out
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAccessRequestSubmit} className="space-y-4">
            {requestError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{requestError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                Select Your Technical Vertical
              </label>
              <select
                value={requestVertical}
                onChange={(e) => setRequestVertical(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-sm text-gray-900 focus:border-purple-600 focus:bg-white focus:outline-hidden transition font-medium"
              >
                {ALL_VERTICALS.map((v) => (
                  <option key={v.slug} value={v.slug}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                Requested Role
              </label>
              <select
                value={requestRole}
                onChange={(e) => setRequestRole(e.target.value as "member" | "deputy")}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-sm text-gray-900 focus:border-purple-600 focus:bg-white focus:outline-hidden transition font-medium"
              >
                <option value="member">Member (Draft articles, collaborate in wing)</option>
                <option value="deputy">Deputy (Review &amp; approve wing articles)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                Note / Department &amp; Year
              </label>
              <textarea
                rows={2}
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="e.g. 2nd year IT, passionate about web dev &amp; microservices"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-sm text-gray-900 focus:border-purple-600 focus:bg-white focus:outline-hidden transition"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <a
                href="/api/auth/logout"
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition text-center"
              >
                Sign Out
              </a>
              <button
                type="submit"
                disabled={requestSubmitting}
                className="flex-1 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition disabled:opacity-50 text-center"
              >
                {requestSubmitting ? "Submitting Application..." : "Submit Join Request ↗"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
