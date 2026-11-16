"use client";

import { useEffect, useMemo, useState } from "react";
import type { Track, TrackItem } from "@coding-club/content-schema/tracks";
import {
  countDone,
  parseTrackProgress,
  parseYouTubeUrl,
  serializeTrackProgress,
  trackProgressKey,
  youTubeEmbedSrc,
} from "../index";

export interface TrackPostInfo {
  title: string;
  summary?: string;
  href: string;
}

const DIFFICULTY_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" } as const;

function itemsOf(group: { items?: TrackItem[]; subtopics?: { items: TrackItem[] }[] }): TrackItem[] {
  return [...(group.items || []), ...(group.subtopics || []).flatMap((s) => s.items)];
}

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // e.g. storage disabled
  }
}

/**
 * A learning track: topics → subtopics → items, with "done" checkboxes kept in this browser only.
 * Renders unchecked on the server and loads progress after mount (no hydration mismatch).
 */
export default function TrackView({
  track,
  vertical,
  slug,
  posts,
  readOnly = false,
}: {
  track: Track;
  vertical: string;
  slug: string;
  /** Published posts this track may reference, keyed by slug. Missing ones show "No longer available". */
  posts: Record<string, TrackPostInfo>;
  /** Preview mode (e.g. in CMS review): no checkboxes, nothing stored. */
  readOnly?: boolean;
}) {
  const allIds = useMemo(() => itemsOf({ subtopics: track.topics.map((t) => ({ items: itemsOf(t) })) }).map((i) => i.id), [track]);
  const key = trackProgressKey(vertical, slug);
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [storageOk, setStorageOk] = useState(true);
  const [openVideo, setOpenVideo] = useState<string | null>(null);

  useEffect(() => {
    if (readOnly) return;
    const s = storage();
    if (!s) {
      setStorageOk(false);
      return;
    }
    const load = () => setDone(parseTrackProgress(s.getItem(key), allIds));
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key, allIds, readOnly]);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        storage()?.setItem(key, serializeTrackProgress(next));
      } catch {
        setStorageOk(false);
      }
      return next;
    });
  };

  const renderItem = (item: TrackItem) => {
    const checked = done.has(item.id);
    let titleNode: React.ReactNode;
    let plainTitle = "";
    let badge = "";
    let extra: React.ReactNode = null;
    if (item.type === "post") {
      const post = posts[item.slug];
      badge = "Article";
      plainTitle = post ? post.title : "Unavailable article";
      titleNode = post ? (
        <a href={post.href}>{post.title}</a>
      ) : (
        <span className="cc-track__gone">No longer available</span>
      );
    } else if (item.type === "link") {
      badge = "Link";
      plainTitle = item.title;
      titleNode = (
        <a href={item.url} target="_blank" rel="noopener noreferrer nofollow">
          {item.title}
          <span className="cc-track__ext" aria-hidden="true">
            ↗
          </span>
          <span className="cc-track__sr"> (opens in a new tab)</span>
        </a>
      );
    } else {
      badge = "Video";
      const embed = parseYouTubeUrl(item.url);
      const src = embed ? youTubeEmbedSrc(embed) : "";
      const open = openVideo === item.id;
      plainTitle = item.title;
      titleNode = <span>{item.title}</span>;
      extra = src ? (
        <>
          <button
            type="button"
            className="cc-track__watch"
            aria-expanded={open}
            onClick={() => setOpenVideo(open ? null : item.id)}
          >
            {open ? "Hide video" : "Watch"}
          </button>
          {open ? (
            <div className="cc-embed cc-track__video">
              <iframe
                src={src}
                title={item.title}
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ) : null}
        </>
      ) : null;
    }
    const inputId = `cc-track-${slug}-${item.id}`;
    return (
      <li key={item.id} className={`cc-track__item${checked ? " is-done" : ""}`}>
        {readOnly ? null : (
          <input id={inputId} type="checkbox" checked={checked} onChange={() => toggle(item.id)} aria-label={`Done: ${plainTitle}`} />
        )}
        <div className="cc-track__body">
          <div className="cc-track__line">
            <span className="cc-track__title">{titleNode}</span>
            <span className="cc-track__badge">{badge}</span>
            {item.type === "link" && item.difficulty ? (
              <span className={`cc-track__level cc-track__level--${item.difficulty}`}>{DIFFICULTY_LABEL[item.difficulty]}</span>
            ) : null}
          </div>
          {extra}
        </div>
      </li>
    );
  };

  const total = allIds.length;
  return (
    <div className="cc-track">
      {readOnly ? null : (
        <p className="cc-track__progress" aria-live="polite">
          <strong>
            {countDone(allIds, done)} / {total}
          </strong>{" "}
          done
          {storageOk ? (
            <span className="cc-track__note"> · saved in this browser</span>
          ) : (
            <span className="cc-track__note"> · progress can&apos;t be saved in this browser</span>
          )}
        </p>
      )}
      {track.topics.map((topic, ti) => {
        const ids = itemsOf(topic).map((i) => i.id);
        return (
          <section key={ti} className="cc-track__topic" aria-labelledby={`cc-topic-${slug}-${ti}`}>
            <h2 id={`cc-topic-${slug}-${ti}`}>
              {topic.title}
              {readOnly ? null : (
                <span className="cc-track__count">
                  {countDone(ids, done)}/{ids.length}
                </span>
              )}
            </h2>
            {topic.items?.length ? <ul className="cc-track__list">{topic.items.map(renderItem)}</ul> : null}
            {(topic.subtopics || []).map((sub, si) => (
              <div key={si} className="cc-track__sub">
                <h3>{sub.title}</h3>
                <ul className="cc-track__list">{sub.items.map(renderItem)}</ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
