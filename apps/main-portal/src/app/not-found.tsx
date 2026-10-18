import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8 text-center space-y-8">
      {/* 404 Terminal Card */}
      <div className="relative rounded-3xl border border-[#E5E0D5] bg-[#FFFDF8] p-8 sm:p-14 shadow-lg overflow-hidden">
        {/* Scotch Tape */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-white/80 border border-stone-400/20 shadow-2xs backdrop-blur-2xs rounded-xs pointer-events-none rotate-[-1.5deg]" />

        <div className="font-mono text-xs text-stone-500 mb-2">
          ssn@codingclub:~$ cat /dev/null &amp;&amp; status-code
        </div>

        <h1 className="text-6xl sm:text-7xl font-black tracking-tight text-[#F43F5E]">
          404
        </h1>

        <div className="mt-2 text-2xl font-black text-stone-900 tracking-tight">
          Page or Resource Not Found
        </div>

        <p className="mt-4 text-stone-600 font-sans text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          The requested route, vertical, or technical article does not exist or may have been relocated.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 font-mono text-xs font-bold">
          <Link
            href="/"
            className="rounded-xl bg-stone-900 px-5 py-2.5 text-white shadow-xs hover:bg-stone-800 transition"
          >
            &larr; return home
          </Link>
          <Link
            href="/blog"
            className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-stone-700 hover:border-stone-900 hover:text-stone-900 transition"
          >
            browse blog feed
          </Link>
          <Link
            href="/#verticals"
            className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-[#F43F5E] hover:bg-rose-100 transition"
          >
            view 8 verticals
          </Link>
        </div>
      </div>
    </div>
  );
}
