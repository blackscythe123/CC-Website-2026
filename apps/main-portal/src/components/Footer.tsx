import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white py-12 dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 font-mono text-xs font-bold text-white">
              &lt;/&gt;
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Coding Club (CC)
            </span>
            <span className="text-sm text-gray-500">
              — 10 Specialized Verticals, 1 Monorepo Architecture
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-500">
            <Link href="/" className="hover:text-gray-900">Home</Link>
            <Link href="/blog" className="hover:text-gray-900">Articles</Link>
            <Link href="/#verticals" className="hover:text-gray-900">Verticals</Link>
            <a href="/admin" className="font-semibold text-blue-600 hover:underline">
              CMS Studio
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          Decap CMS Git Workflow: Draft ➔ Vertical Head Review ➔ Merged to main ➔ Vercel Auto-deploy.
        </div>
      </div>
    </footer>
  );
}
