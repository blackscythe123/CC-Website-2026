"use client";

export default function EventsSection() {
  const events = [
    {
      title: "Hands-on LLM Inference & Agentic Workflows",
      vertical: "AI-ML",
      date: "Oct 24, 2026",
      type: "Workshop",
      location: "CSE Seminar Hall & Online",
      desc: "Deep-dive into local LLMs with Ollama, tool calling, and building multi-agent coding workflows.",
      status: "Upcoming",
    },
    {
      title: "Architecting Scalable Next.js 16 Monorepos",
      vertical: "Web Dev",
      date: "Nov 02, 2026",
      type: "Tech Talk",
      location: "Mini Auditorium",
      desc: "Inside our club CMS monorepo: Turbopack, Tailwind v4, Decap CMS, and Git editorial pipelines.",
      status: "Upcoming",
    },
    {
      title: "Binary Exploitation & CTF Fundamentals",
      vertical: "Cybersecurity",
      date: "Nov 15, 2026",
      type: "Hands-on CTF",
      location: "Lab 3 & Online",
      desc: "Buffer overflows, format strings, and solving real-world reverse engineering challenges.",
      status: "Upcoming",
    },
    {
      title: "Containerizing & Deploying with Kubernetes",
      vertical: "Cloud & DevOps",
      date: "Nov 28, 2026",
      type: "Bootcamp",
      location: "Online Discord",
      desc: "Step-by-step CI/CD pipeline building, Docker multi-stage builds, and Helm chart deployments.",
      status: "Upcoming",
    },
  ];

  return (
    <section id="events" className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-16 scroll-mt-16">
      <div className="rounded-3xl border border-[#E5E0D5] bg-[#FFFDF8] p-5 sm:p-8 md:p-10 shadow-lg relative overflow-hidden">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-8 border-b border-[#E8E1D2]">
          <div>
            <div className="font-mono text-xs sm:text-sm text-stone-600 flex items-center gap-1.5">
              <span>ssn@codingclub:~$</span>
              <span className="text-[#F43F5E] font-semibold">events</span>
            </div>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
              // EVENTS &amp; WORKSHOPS
            </h2>
            <div className="mt-1 font-handwriting text-xl text-stone-600 font-bold">
              Hands-on sessions led by vertical heads.
            </div>
          </div>

          <div className="text-left md:text-right font-mono text-xs">
            <span className="inline-block px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-md">
              [ 4 scheduled ]
            </span>
            <div className="text-stone-500 mt-1">Open to all students &amp; developers</div>
          </div>
        </div>

        {/* Polaroid / Bulletin Board Grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((ev, idx) => (
            <div
              key={ev.title}
              className={`relative rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between ${
                idx % 2 === 0 ? "rotate-[-0.5deg]" : "rotate-[0.5deg]"
              }`}
            >
              {/* Scotch Tape on top */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-4 bg-white/80 border border-stone-400/20 shadow-2xs backdrop-blur-2xs rounded-xs pointer-events-none rotate-[-1deg]" />

              <div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="rounded bg-rose-50 px-2 py-0.5 font-bold text-rose-600 border border-rose-100">
                    {ev.vertical}
                  </span>
                  <span className="text-stone-400">{ev.type}</span>
                </div>

                <h3 className="mt-3 text-base font-bold text-stone-900 tracking-tight leading-snug">
                  {ev.title}
                </h3>

                <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                  {ev.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-stone-100 font-mono text-[11px] space-y-1 text-stone-500">
                <div className="flex items-center justify-between">
                  <span>Date:</span>
                  <span className="font-semibold text-stone-800">{ev.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Venue:</span>
                  <span className="text-stone-700 truncate max-w-[140px]">{ev.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
