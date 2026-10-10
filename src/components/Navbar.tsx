import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/90 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-mono text-lg font-bold text-white shadow-sm">
              &lt;/&gt;
            </span>
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Coding Club
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
            <Link href="/" className="transition-colors hover:text-blue-600 dark:hover:text-blue-400">
              Home
            </Link>
            <Link href="/blog" className="transition-colors hover:text-blue-600 dark:hover:text-blue-400">
              Blog
            </Link>
            <Link href="/events" className="transition-colors hover:text-blue-600 dark:hover:text-blue-400">
              Events
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span>Open CMS Studio</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
