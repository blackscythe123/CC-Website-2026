import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortalPosts, getPortalPost } from "@/lib/posts";
import portalConfig from "../../../../portal.config.json";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const posts = getPortalPosts();
  return posts.map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPortalPost(slug);
  if (!post) return { title: "Post Not Found" };
  return {
    title: `${post.title} | ${portalConfig.name}`,
    description: post.summary,
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPortalPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-12 space-y-10">
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-wider inline-flex items-center gap-1.5 text-neutral-500 hover:text-black hover:underline transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to {portalConfig.name}</span>
      </Link>

      <header className="border-b border-black pb-8 space-y-4">
        <div className="font-mono text-xs text-neutral-500 flex items-center gap-2">
          <span>{post.date}</span>
          <span>•</span>
          <span>By {post.author}</span>
          <span>•</span>
          <span className="uppercase font-bold text-black">{portalConfig.name}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-black leading-tight">
          {post.title}
        </h1>

        {post.summary && (
          <p className="text-lg text-neutral-700 leading-relaxed font-sans">
            {post.summary}
          </p>
        )}
      </header>

      {post.coverImage && (
        <div className="border border-black overflow-hidden">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full object-cover max-h-[440px]"
          />
        </div>
      )}

      {/* Monochrome Article Content */}
      <div
        className="space-y-6 text-base sm:text-lg leading-relaxed text-neutral-800
        [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-black [&_h2]:tracking-tight [&_h2]:border-b [&_h2]:border-black/20 [&_h2]:pb-2
        [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-black
        [&_p]:my-4 [&_p]:leading-relaxed
        [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_li]:my-1.5
        [&_code]:bg-neutral-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_code]:text-black [&_code]:border [&_code]:border-neutral-200
        [&_pre]:overflow-x-auto [&_pre]:bg-black [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-white [&_pre]:my-6
        [&_blockquote]:border-l-4 [&_blockquote]:border-black [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-6 [&_blockquote]:italic [&_blockquote]:text-neutral-700
        [&_img]:my-8 [&_img]:w-full [&_img]:border [&_img]:border-black
        [&_a]:underline [&_a]:text-black [&_a]:font-semibold"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      <footer className="border-t border-black pt-6 font-mono text-xs flex justify-between items-center text-neutral-500">
        <div>
          Published via Coding Club Editorial Workflow
        </div>
        <Link href="/" className="text-black font-bold hover:underline">
          &larr; Back to Index
        </Link>
      </footer>
    </article>
  );
}
