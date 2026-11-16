import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import TrackView from "@coding-club/content-render/track-view";
import { ArrowLeft } from "lucide-react";
import portalConfig from "../../../../portal.config.json";
import { getPlacedPosts, getTrack, getTracks } from "@/lib/tracks";

export const dynamicParams = false;

export function generateStaticParams() {
  return getTracks().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const loaded = getTrack(slug);
  if (!loaded) return { title: "Track not found" };
  return { title: `${loaded.track.title} | ${portalConfig.name}`, description: loaded.track.summary };
}

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loaded = getTrack(slug);
  if (!loaded) notFound();
  const { track } = loaded;
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-12 space-y-8">
      <Link
        href="/tracks"
        className="font-mono text-xs uppercase tracking-wider inline-flex items-center gap-1.5 text-neutral-500 hover:text-black hover:underline transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>All tracks</span>
      </Link>
      <header className="border-b border-black pb-6 space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-neutral-500">{portalConfig.name} · Learning track</p>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-black leading-tight">{track.title}</h1>
        {track.summary ? <p className="text-lg text-neutral-700">{track.summary}</p> : null}
      </header>
      <TrackView track={track} vertical={portalConfig.verticalSlug} slug={slug} placed={getPlacedPosts(loaded)} />
    </article>
  );
}
