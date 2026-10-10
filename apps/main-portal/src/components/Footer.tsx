import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-800 bg-[#121214] text-zinc-400 font-mono text-xs py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-zinc-800/80">
          {/* Left: Terminal status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
            </div>
            <div className="text-zinc-300">
              <span className="text-[#F43F5E]">ssn@codingclub</span>
              <span className="text-zinc-500">:</span>
              <span className="text-emerald-400">~/portal</span>
              <span className="text-zinc-500 ml-2"># 10 engineering verticals</span>
            </div>
          </div>

          {/* Center Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-zinc-400">
            <Link href="/" className="hover:text-white transition">01. home</Link>
            <Link href="/#verticals" className="hover:text-white transition">02. verticals</Link>
            <Link href="/blog" className="hover:text-white transition">03. blogs</Link>
            <Link href="/#projects" className="hover:text-white transition">04. projects</Link>
            <a
              href="https://ssn-coding-club-cms.vercel.app/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F43F5E] hover:underline"
            >
              CMS Studio (/admin) ↗
            </a>
          </div>

          {/* Right: GitHub repo */}
          <div className="text-xs">
            <a
              href="https://github.com/blackscythe123/CC-Website-2026"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline decoration-zinc-700 underline-offset-4 transition"
            >
              github.com/blackscythe123/CC-Website-2026 ↗
            </a>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
          <div>
            &copy; {new Date().getFullYear()} SSN Coding Club (CC). Crafted for curious minds who build._
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Decap CMS Git-backed Editorial Pipeline (main branch)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
