"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, LogOut } from "lucide-react";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-xs">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
            Client Error Encountered
          </span>
          <h1 className="mt-3 text-2xl font-extrabold text-gray-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            The studio encountered an unexpected error while loading.
          </p>
          {error?.message && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50/70 p-3 text-xs text-red-800 text-left font-mono break-words">
              {error.message}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 pt-2">
          <a
            href="/api/auth/logout"
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </a>
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-black transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    </div>
  );
}
