import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white py-12 dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 font-mono text-sm font-bold text-white">
              &lt;/&gt;
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Coding Club CMS
            </span>
            <span className="text-sm text-gray-500">
              — Git-backed publishing powered by Decap CMS &amp; Next.js
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/" className="hover:text-gray-900 dark:hover:text-white">
              Home
            </Link>
            <Link href="/blog" className="hover:text-gray-900 dark:hover:text-white">
              Blog
            </Link>
            <Link href="/events" className="hover:text-gray-900 dark:hover:text-white">
              Events
            </Link>
            <Link href="/admin" className="hover:text-blue-600 font-medium">
              Admin Login
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-400 dark:border-gray-900">
          Non-technical members write and publish articles directly to GitHub without databases.
        </div>
      </div>
    </footer>
  );
}
