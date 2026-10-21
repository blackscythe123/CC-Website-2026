"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, ExternalLink, LogOut, Mail, RefreshCw, Send, ShieldAlert } from "lucide-react";
import type { UserProfile } from "@/lib/hooks/useStudioSession";
import { ALL_VERTICALS } from "@/lib/verticals";
import { Button, Field, Select, Spinner, Textarea, buttonClasses } from "@/components/ui";
import { SignInHero } from "@/components/illustrations";
import ThemeSwitch from "@/components/theme/ThemeSwitch";

function BrandMark({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/mark.png" alt="" aria-hidden width={size} height={size} className="rounded-xl" />
  );
}

function ScreenFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex justify-end p-4">
        <ThemeSwitch className="w-28" />
      </div>
      <div className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center">{children}</div>
    </div>
  );
}

export function StudioLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg text-muted">
      <div className="flex flex-col items-center gap-4">
        <BrandMark size={44} />
        <Spinner label="Loading Studio…" />
      </div>
    </div>
  );
}

export function SignInScreen() {
  return (
    <ScreenFrame>
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg p-8 shadow-card">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="text-sm font-semibold text-muted">SSN Coding Club</p>
            <h1 className="text-xl font-extrabold tracking-tight">Studio</h1>
          </div>
        </div>
        <SignInHero className="mx-auto my-8 h-32 w-auto" />
        <h2 className="text-lg font-bold tracking-tight">Write, review and publish club articles</h2>
        <p className="mt-1.5 text-sm text-muted">
          Sign in with the GitHub account that has access to the club repository. Your drafts open as pull requests for review.
        </p>
        <a href="/api/auth" className={`${buttonClasses({ variant: "primary", size: "lg", block: true })} mt-6`}>
          Sign in with GitHub
        </a>
      </div>
    </ScreenFrame>
  );
}

export function PendingInviteScreen({ user, inviteUrl }: { user: UserProfile; inviteUrl: string }) {
  return (
    <ScreenFrame>
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg p-8 shadow-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-bg text-warning">
          <Mail className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-5 text-xl font-extrabold tracking-tight">Accept your repository invite</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          You&apos;re signed in as <strong className="text-text">@{user.login}</strong>. You&apos;ve been invited to{" "}
          <strong className="text-text">blackscythe123/CC-Website-2026</strong> but haven&apos;t accepted yet. Accept it on GitHub, then come back.
        </p>
        <div className="mt-6 space-y-2">
          <a href={inviteUrl} target="_blank" rel="noreferrer" className={buttonClasses({ variant: "primary", size: "lg", block: true })}>
            Accept invitation on GitHub
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
          <Button variant="secondary" size="lg" block icon={RefreshCw} onClick={() => window.location.reload()}>
            I&apos;ve accepted — check again
          </Button>
        </div>
        <a href="/api/auth/logout" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-text">
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </a>
      </div>
    </ScreenFrame>
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
    <ScreenFrame>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-bg p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
            <ShieldAlert className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Request access to Studio</h1>
            <p className="text-sm text-muted">
              Signed in as <strong className="text-text">@{user.login}</strong>
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Studio is for club members. Pick your vertical and the role you&apos;re applying for — once a head or superadmin approves it,
          you&apos;ll get access to the club repository automatically.
        </p>

        {requestSuccess ? (
          <div className="mt-6 rounded-xl border border-border bg-success-bg p-4 text-sm text-success">
            <div className="flex items-center gap-2 font-bold">
              <CircleCheck className="h-5 w-5 shrink-0" aria-hidden />
              Application submitted
            </div>
            <p className="mt-1.5 leading-relaxed">{requestSuccess}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="secondary" icon={RefreshCw} onClick={() => window.location.reload()}>
                Check approval status
              </Button>
              <a href="/api/auth/logout" className={buttonClasses({ variant: "ghost" })}>
                Sign out
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAccessRequestSubmit} className="mt-6 space-y-4">
            {requestError ? (
              <div role="alert" className="flex items-start gap-2 rounded-lg bg-danger-bg p-3 text-sm text-danger">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{requestError}</span>
              </div>
            ) : null}

            <Field label="Vertical" htmlFor="req-vertical">
              <Select id="req-vertical" value={requestVertical} onChange={(e) => setRequestVertical(e.target.value)}>
                {ALL_VERTICALS.map((v) => (
                  <option key={v.slug} value={v.slug}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Role" htmlFor="req-role">
              <Select id="req-role" value={requestRole} onChange={(e) => setRequestRole(e.target.value as "member" | "deputy")}>
                <option value="member">Member — write articles for the vertical</option>
                <option value="deputy">Deputy — also review and approve articles</option>
              </Select>
            </Field>

            <Field label="Note" htmlFor="req-note" hint="Optional — department, year, what you'd like to write about">
              <Textarea
                id="req-note"
                rows={3}
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="e.g. 2nd year IT, interested in web dev and microservices"
              />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <a href="/api/auth/logout" className={buttonClasses({ variant: "ghost" })}>
                Sign out
              </a>
              <Button type="submit" variant="primary" icon={Send} loading={requestSubmitting}>
                {requestSubmitting ? "Submitting…" : "Send request"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </ScreenFrame>
  );
}
