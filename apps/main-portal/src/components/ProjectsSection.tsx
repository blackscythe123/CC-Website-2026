"use client";

export default function ProjectsSection() {
  const projects = [
    {
      title: "CC-Website-2026",
      desc: "Central multi-vertical portal & Git-backed headless CMS monorepo powered by Next.js 16, Turbopack, and Decap CMS.",
      stack: ["Next.js", "Tailwind v4", "Decap CMS", "TypeScript"],
      github: "https://github.com/blackscythe123/CC-Website-2026",
      badge: "Flagship",
    },
    {
      title: "AlgoVisualizer",
      desc: "Interactive graph and dynamic programming visualization engine built to prepare students for competitive programming.",
      stack: ["React", "Canvas API", "Algorithms", "Vite"],
      github: "https://github.com/blackscythe123",
      badge: "Open Source",
    },
    {
      title: "SmartCampus-IoT",
      desc: "Distributed campus sensor telemetry platform collecting real-time air quality, classroom occupancy, and solar power metrics.",
      stack: ["ESP32", "MQTT", "Go", "InfluxDB"],
      github: "https://github.com/blackscythe123",
      badge: "Hardware",
    },
    {
      title: "PixelForge Game Engine",
      desc: "Lightweight 2D tile-based game engine written in Rust with WebAssembly export, custom physics, and particle shaders.",
      stack: ["Rust", "Wasm", "WebGL", "Tiled"],
      github: "https://github.com/blackscythe123",
      badge: "Game Dev",
    },
  ];

  return (
    <section id="projects" className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-16 scroll-mt-16">
      <div className="rounded-3xl border border-[#E5E0D5] bg-[#FFFDF8] p-5 sm:p-8 md:p-10 shadow-lg relative overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-8 border-b border-[#E8E1D2]">
          <div>
            <div className="font-mono text-xs sm:text-sm text-stone-600 flex items-center gap-1.5">
              <span>ssn@codingclub:~$</span>
              <span className="text-[#F43F5E] font-semibold">projects</span>
            </div>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
              // OPEN SOURCE &amp; REPOSITORIES
            </h2>
            <div className="mt-1 font-handwriting text-xl text-stone-600 font-bold">
              Built by club members, open for everyone.
            </div>
          </div>

          <div className="text-left md:text-right font-mono text-xs">
            <span className="inline-block px-3 py-1 bg-stone-100 border border-stone-200 text-stone-700 font-bold rounded-md">
              [ git clone friendly ]
            </span>
            <div className="text-stone-500 mt-1">Check out our club repositories</div>
          </div>
        </div>

        {/* Project Terminal Window Cards */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {projects.map((proj) => (
            <div
              key={proj.title}
              className="rounded-2xl border border-stone-800/80 bg-[#16161A] text-stone-200 p-5 sm:p-6 shadow-md hover:border-zinc-600 transition flex flex-col justify-between"
            >
              <div>
                {/* Window Top Bar with Mac Dots */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                    <span className="font-mono text-[11px] text-zinc-500 ml-2">repo: {proj.title}</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                    {proj.badge}
                  </span>
                </div>

                <h3 className="mt-4 font-mono text-lg font-bold text-white tracking-tight">
                  &gt; {proj.title}_
                </h3>

                <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
                  {proj.desc}
                </p>

                {/* Tech Tags */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {proj.stack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded bg-zinc-800/80 border border-zinc-700 px-2 py-0.5 font-mono text-[11px] text-zinc-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* GitHub Link CTA */}
              <div className="mt-6 pt-3 border-t border-zinc-800 flex items-center justify-between font-mono text-xs">
                <span className="text-zinc-500">git branch: main</span>
                <a
                  href={proj.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#F43F5E] hover:text-white transition font-bold"
                >
                  <span>view repository</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
