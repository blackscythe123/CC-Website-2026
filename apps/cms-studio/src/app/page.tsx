import Link from "next/link";
import { Edit3, CheckSquare, Shield, ArrowRight } from "lucide-react";

export default function CmsStudioHome() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-gray-900 font-sans">
      <div className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-8 sm:p-10 shadow-sm space-y-8">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 font-mono text-xl font-bold text-white shadow-md">
            &lt;/&gt;
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              SSN Coding Club CMS Studio
            </h1>
            <p className="text-sm text-gray-500">
              Next-generation Medium-style editor backed by Git branches &amp; PR reviews.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Zero-Database Governance Pipeline
            </span>
            <span className="text-xs text-blue-700 font-medium">10 Autonomous Verticals</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white p-3.5 shadow-xs border border-blue-100">
              <span className="block text-[10px] font-bold text-gray-400 uppercase">Stage 1</span>
              <span className="mt-0.5 block text-sm font-bold text-gray-800">Medium Canvas</span>
              <span className="mt-1 block text-xs text-gray-500">Draft created</span>
            </div>
            <div className="rounded-xl bg-white p-3.5 shadow-xs border border-blue-100">
              <span className="block text-[10px] font-bold text-amber-600 uppercase">Stage 2</span>
              <span className="mt-0.5 block text-sm font-bold text-amber-900">PR Opened</span>
              <span className="mt-1 block text-xs text-gray-500">Requires review</span>
            </div>
            <div className="rounded-xl bg-white p-3.5 shadow-xs border border-blue-100">
              <span className="block text-[10px] font-bold text-emerald-600 uppercase">Stage 3</span>
              <span className="mt-0.5 block text-sm font-bold text-emerald-900">Live on Main</span>
              <span className="mt-1 block text-xs text-gray-500">Approved &amp; Merged</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/admin"
            className="flex flex-col justify-between rounded-2xl border border-gray-200 p-4 hover:border-blue-400 hover:shadow-sm transition"
          >
            <div>
              <Edit3 className="h-5 w-5 text-blue-600" />
              <h3 className="mt-2 text-sm font-bold text-gray-900">Canvas Editor</h3>
              <p className="mt-1 text-xs text-gray-500">Write with slash commands &amp; images</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600">
              <span>Open</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          <Link
            href="/admin/reviews"
            className="flex flex-col justify-between rounded-2xl border border-gray-200 p-4 hover:border-blue-400 hover:shadow-sm transition"
          >
            <div>
              <CheckSquare className="h-5 w-5 text-emerald-600" />
              <h3 className="mt-2 text-sm font-bold text-gray-900">Reviews &amp; PRs</h3>
              <p className="mt-1 text-xs text-gray-500">Inspect &amp; approve pending drafts</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <span>Inspect</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          <Link
            href="/admin/roles"
            className="flex flex-col justify-between rounded-2xl border border-gray-200 p-4 hover:border-purple-400 hover:shadow-sm transition"
          >
            <div>
              <Shield className="h-5 w-5 text-purple-600" />
              <h3 className="mt-2 text-sm font-bold text-gray-900">Superadmin Roles</h3>
              <p className="mt-1 text-xs text-gray-500">Manage team roles &amp; CODEOWNERS</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-purple-600">
              <span>Manage</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        </div>

        <div className="pt-2 text-center">
          <Link
            href="/admin"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition"
          >
            <span>Launch CMS Studio</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
