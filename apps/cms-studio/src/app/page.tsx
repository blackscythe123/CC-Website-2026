import Link from "next/link";

export default function CmsStudioHome() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-gray-900">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 font-mono text-xl font-bold text-white shadow">
            CMS
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Apex Club Centralized CMS Studio
            </h1>
            <p className="text-sm text-gray-500">
              Decentralized publishing across 10 verticals with GitHub Approval Workflow
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-indigo-50/70 p-5 border border-indigo-100">
          <h2 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider">
            Role-Based Editorial Approval Pipeline
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-white p-3 shadow-xs border border-indigo-100">
              <span className="block text-xs font-bold text-gray-400">STAGE 1</span>
              <span className="mt-1 block text-sm font-semibold text-gray-800">Draft</span>
              <span className="mt-1 block text-xs text-gray-500">Member creates branch</span>
            </div>
            <div className="rounded-lg bg-white p-3 shadow-xs border border-indigo-100">
              <span className="block text-xs font-bold text-indigo-500">STAGE 2</span>
              <span className="mt-1 block text-sm font-semibold text-indigo-900">In Review</span>
              <span className="mt-1 block text-xs text-gray-500">Vertical Head inspects</span>
            </div>
            <div className="rounded-lg bg-white p-3 shadow-xs border border-indigo-100">
              <span className="block text-xs font-bold text-emerald-600">STAGE 3</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">Publish</span>
              <span className="mt-1 block text-xs text-gray-500">Merged & Vercel builds</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/admin"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <span>Launch Editorial Studio</span>
            <span className="rounded bg-indigo-500/40 px-2 py-0.5 text-xs font-mono">/admin</span>
          </Link>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-400 text-center">
          Powered by Decap CMS Editorial Workflow &amp; Next.js GitHub OAuth Handshake
        </div>
      </div>
    </div>
  );
}
