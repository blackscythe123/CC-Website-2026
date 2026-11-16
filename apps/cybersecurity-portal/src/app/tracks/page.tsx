import Link from "next/link";
import type { Metadata } from "next";
import portalConfig from "../../../portal.config.json";
import { getTracks } from "@/lib/tracks";

export const metadata: Metadata = {
  title: `Tracks | ${portalConfig.name}`,
  description: `Learning tracks from the ${portalConfig.name}: ordered topics with articles, videos and practice.`,
};

export default function TracksPage() {
  const tracks = getTracks();
  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6 py-12 space-y-8">
      <header className="border-b border-black pb-6 space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-neutral-500">{portalConfig.name}</p>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-black">Learning tracks</h1>
        <p className="text-neutral-600">Step-by-step paths through topics, with articles, videos and practice problems.</p>
      </header>
      {tracks.length === 0 ? (
        <p className="text-neutral-600">No tracks have been published yet.</p>
      ) : (
        <ul className="space-y-4">
          {tracks.map(({ slug, track }) => (
            <li key={slug} className="border border-black p-5 hover:bg-neutral-50 transition">
              <Link href={`/tracks/${slug}`} className="block space-y-1">
                <h2 className="text-xl font-extrabold text-black underline underline-offset-4">{track.title}</h2>
                {track.summary ? <p className="text-neutral-600">{track.summary}</p> : null}
                <p className="font-mono text-xs text-neutral-500">
                  {track.topics.length} topic{track.topics.length === 1 ? "" : "s"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
