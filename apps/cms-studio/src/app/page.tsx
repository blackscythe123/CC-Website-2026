import Link from "next/link";
import { ArrowRight, GitPullRequest, PenLine, Rocket, SquareCheck, Users } from "lucide-react";
import { buttonClasses } from "@/components/ui";
import { SignInHero } from "@/components/illustrations";
import ThemeSwitch from "@/components/theme/ThemeSwitch";
import { ALL_VERTICALS } from "@/lib/verticals";

const STEPS = [
  { icon: PenLine, title: "Write", body: "Draft in the editor. It autosaves on your device and can sync to GitHub." },
  { icon: GitPullRequest, title: "Submit", body: "Submitting opens a pull request on a draft branch." },
  { icon: Rocket, title: "Go live", body: "Once a reviewer approves it, the post is merged and published." },
];

const LINKS = [
  { href: "/admin", icon: PenLine, title: "Write", body: "Start or continue an article" },
  { href: "/admin/reviews", icon: SquareCheck, title: "Reviews", body: "Approve posts or see feedback on yours" },
  { href: "/admin/roles", icon: Users, title: "People", body: "Roles, applications and joining a vertical" },
];

export default function CmsStudioHome() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="" aria-hidden width={32} height={32} className="rounded-lg" />
          <span className="leading-tight">
            <span className="block text-[15px] font-bold">Studio</span>
            <span className="block text-xs text-muted">SSN Coding Club</span>
          </span>
        </div>
        <ThemeSwitch className="w-28" />
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-12">
        <section className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Write for the club. Get reviewed. Go live.</h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
              Studio is where members of the {ALL_VERTICALS.length} verticals write articles, and where deputies and heads review them before they reach
              codingclub.tech.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/admin" className={buttonClasses({ variant: "primary", size: "lg" })}>
                Open Studio
                <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
              </Link>
              <Link href="/admin/reviews" className={buttonClasses({ size: "lg" })}>
                Review posts
              </Link>
            </div>
          </div>
          <SignInHero className="mx-auto h-auto w-full max-w-sm" />
        </section>

        <section aria-labelledby="how-title" className="mt-16">
          <h2 id="how-title" className="text-sm font-bold uppercase tracking-wide text-muted">
            How publishing works
          </h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="rounded-xl border border-border bg-bg p-5 shadow-card">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-xs font-semibold text-muted">Step {i + 1}</span>
                </div>
                <h3 className="mt-3 font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="Shortcuts" className="mt-10 grid gap-3 sm:grid-cols-3">
          {LINKS.map(({ href, icon: Icon, title, body }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-3 rounded-xl border border-border bg-bg p-5 shadow-card transition hover:border-border-strong"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted group-hover:text-accent" aria-hidden />
              <span>
                <span className="block font-bold">{title}</span>
                <span className="mt-0.5 block text-sm text-muted">{body}</span>
              </span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
