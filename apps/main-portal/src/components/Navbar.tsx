import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-mono text-base font-bold text-white shadow-xs">
              &lt;/&gt;
            </span>
            <div>
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                Coding Club
              </span>
              <span className="hidden sm:inline-block ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                10 Verticals
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
            <Link href="/" className="hover:text-blue-600 transition">
              Home
            </Link>
            <Link href="/#verticals" className="hover:text-blue-600 transition">
              Verticals
            </Link>
            <Link href="/blog" className="hover:text-blue-600 transition">
              Blog Feed
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/blackscythe123/CC-Website-2026"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400"
          >
            GitHub
          </a>
          <a
            href="https://ssn-coding-club-cms.vercel.app/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <span>CMS Studio</span>
            <span className="font-mono opacity-70">/admin</span>
          </a>
        </div>
      </div>
    </header>
  );
}
