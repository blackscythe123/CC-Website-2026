import Link from "next/link";
import { getPortalPosts } from "@/lib/posts";
import portalConfig from "../../portal.config.json";
import { ArrowUpRight } from "lucide-react";

export default function HomePage() {
  const posts = getPortalPosts();

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 space-y-16">
      {/* Monochrome Hero */}
      <section className="border-b border-black pb-12 space-y-4">
        <div className="font-mono text-xs uppercase tracking-widest text-neutral-500">
          // Official Vertical Portal
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-black uppercase">
          {portalConfig.name}
        </h1>
        <p className="max-w-2xl text-lg text-neutral-700 font-sans leading-relaxed">
          {portalConfig.description}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2 font-mono text-xs">
          <span className="border border-black px-2.5 py-1 font-bold">
            {posts.length} Published Articles
          </span>
          <span className="border border-neutral-300 text-neutral-600 px-2.5 py-1">
            SSN Coding Club
          </span>
        </div>
      </section>

      {/* Articles Feed */}
      <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-black pb-3">
          <h2 className="font-mono text-sm font-black uppercase tracking-wider">
            // Articles &amp; Write-ups
          </h2>
          <span className="font-mono text-xs text-neutral-400">
            Source: content/verticals/{portalConfig.verticalSlug}
          </span>
        </div>

        {posts.length === 0 ? (
          <div className="border border-dashed border-neutral-300 p-12 text-center font-mono text-sm text-neutral-400">
            No articles published yet for this vertical. Write the first post in CMS Studio (/admin)!
          </div>
        ) : (
          <div className="divide-y divide-black/10">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="py-8 group transition-colors flex flex-col md:flex-row md:items-baseline md:justify-between gap-4"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="font-mono text-xs text-neutral-500 flex items-center gap-2">
                    <span>{post.date}</span>
                    <span>•</span>
                    <span>By {post.author}</span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-black group-hover:underline">
                    <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                  </h3>
                  {post.summary && (
                    <p className="text-sm text-neutral-600 leading-relaxed font-sans">
                      {post.summary}
                    </p>
                  )}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 font-mono text-[11px] text-neutral-500">
                      {post.tags.map((tag) => (
                        <span key={tag} className="border border-neutral-200 px-1.5 py-0.5">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  href={`/posts/${post.slug}`}
                  className="font-mono text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 text-black border border-black px-3 py-1.5 hover:bg-black hover:text-white transition shrink-0"
                >
                  <span>Read Post</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
