"use client";

import { useEffect } from "react";
import { LogOut, RefreshCw, TriangleAlert } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("SSN Coding Club CMS Admin Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div role="alert" className="w-full max-w-md rounded-2xl border border-border bg-bg p-8 shadow-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger-bg text-danger">
          <TriangleAlert className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-5 text-xl font-extrabold tracking-tight">Something went wrong</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Studio hit an unexpected error. Your draft is saved on this device — try again, and if it keeps happening, sign out and back in.
        </p>
        {error?.message ? (
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-danger-bg p-3 font-mono text-xs text-danger">{error.message}</pre>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="primary" icon={RefreshCw} onClick={() => reset()}>
            Try again
          </Button>
          <a href="/api/auth/logout" className={buttonClasses({ variant: "ghost" })}>
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </a>
        </div>
      </div>
    </div>
  );
}
