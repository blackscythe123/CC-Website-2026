"use client";

import { useEffect, useMemo, useState } from "react";
import type { Track, TrackItem } from "@coding-club/content-schema/tracks";
import Comments from "./Comments";
import {
  commentTerm,
  countDone,
  parseTrackProgress,
  parseYouTubeUrl,
  placedPostProgressId,
  sectionKey,
  serializeTrackProgress,
  trackProgressKey,
  youTubeEmbedSrc,
  type CommentsConfig,
  type PlacedPost,
} from "../index";

export type { PlacedPost };

const DIFFICULTY_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" } as const;

type Row = { kind: "item"; item: TrackItem } | { kind: "post"; post: PlacedPost };

function rowId(row: Row): string {
  return row.kind === "item" ? row.item.id : placedPostProgressId(row.post.slug);
}

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // e.g. storage disabled
  }
}

/**
 * A learning track: topics → subtopics, each holding resource items (links, videos) followed by blogs
 * placed there. "Done" checkboxes are kept in this browser only. Renders unchecked on the server and
 * loads progress after mount (no hydration mismatch).
 */
export default function TrackView({
  track,
  vertical,
  slug,
  placed,
  readOnly = false,
  comments = null,
}: {
  track: Track;
  vertical: string;
  slug: string;
  /** Blogs placed in this track, keyed by sectionKey(topicId[, subtopicId]). */
  placed: Record<string, PlacedPost[]>;
  /** Preview mode (e.g. in CMS review): no checkboxes, nothing stored. */
  readOnly?: boolean;
  /** Reader comments config; adds a "Discuss" toggle to every topic and subtopic. */
  comments?: CommentsConfig | null;
}) {
  const sections = useMemo(
    () =>
      track.topics.map((topic) => {
        const own: Row[] = [
          ...(topic.items || []).map((item): Row => ({ kind: "item", item })),
          ...(placed[sectionKey(topic.id)] || []).map((post): Row => ({ kind: "post", post })),
        ];
        const subs = (topic.subtopics || []).map((sub) => ({
          sub,
          rows: [
            ...(sub.items || []).map((item): Row => ({ kind: "item", item })),
            ...(placed[sectionKey(topic.id, sub.id)] || []).map((post): Row => ({ kind: "post", post })),
          ],
        }));
        const ids = [...own, ...subs.flatMap((s) => s.rows)].map(rowId);
        return { topic, own, subs, ids };
      }),
    [track, placed]
  );
  const allIds = useMemo(() => sections.flatMap((s) => s.ids), [sections]);
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
    const load = () => setDone(parseTrackProgress(s.getItem(key)));
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key, readOnly]);

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

  const renderRow = (row: Row) => {
    const id = rowId(row);
    const checked = done.has(id);
    let titleNode: React.ReactNode;
    let plainTitle: string;
    let badge: string;
    let description: string | undefined;
    let extra: React.ReactNode = null;
    let difficulty: "easy" | "medium" | "hard" | undefined;
    if (row.kind === "post") {
      badge = "Article";
      plainTitle = row.post.title;
      description = row.post.summary || undefined;
      titleNode = <a href={row.post.href}>{row.post.title}</a>;
    } else if (row.item.type === "link") {
      const item = row.item;
      badge = "Link";
      plainTitle = item.title;
      description = item.description;
      difficulty = item.difficulty;
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
      const item = row.item;
      badge = "Video";
      plainTitle = item.title;
      description = item.description;
      const embed = parseYouTubeUrl(item.url);
      const src = embed ? youTubeEmbedSrc(embed) : "";
      const open = openVideo === id;
      titleNode = <span>{item.title}</span>;
      extra = src ? (
        <>
          <button
            type="button"
            className="cc-track__watch"
            aria-expanded={open}
            onClick={() => setOpenVideo(open ? null : id)}
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
    const inputId = `cc-track-${slug}-${id.replace(":", "-")}`;
    return (
      <li key={id} className={`cc-track__item${checked ? " is-done" : ""}`}>
        {readOnly ? null : (
          <input
            id={inputId}
            type="checkbox"
            checked={checked}
            onChange={() => toggle(id)}
            aria-label={`Done: ${plainTitle}`}
          />
        )}
        <div className="cc-track__body">
          <div className="cc-track__line">
            <span className="cc-track__title">{titleNode}</span>
            <span className="cc-track__badge">{badge}</span>
            {difficulty ? (
              <span className={`cc-track__level cc-track__level--${difficulty}`}>{DIFFICULTY_LABEL[difficulty]}</span>
            ) : null}
          </div>
          {description ? <p className="cc-track__desc">{description}</p> : null}
          {extra}
        </div>
      </li>
    );
  };

  return (
    <div className="cc-track">
      {readOnly ? null : (
        <p className="cc-track__progress" aria-live="polite">
          <strong>
            {countDone(allIds, done)} / {allIds.length}
          </strong>{" "}
          done
          {storageOk ? (
            <span className="cc-track__note"> · saved in this browser</span>
          ) : (
            <span className="cc-track__note"> · progress can&apos;t be saved in this browser</span>
          )}
        </p>
      )}
      {sections.map(({ topic, own, subs, ids }) => (
        <section key={topic.id} id={`t-${topic.id}`} className="cc-track__topic" aria-labelledby={`t-${topic.id}-h`}>
          <h2 id={`t-${topic.id}-h`}>
            {topic.title}
            {readOnly ? null : (
              <span className="cc-track__count">
                {countDone(ids, done)}/{ids.length}
              </span>
            )}
          </h2>
          {topic.description ? <p className="cc-track__desc cc-track__desc--section">{topic.description}</p> : null}
          {readOnly ? null : <Comments config={comments} term={commentTerm("topic", vertical, slug, topic.id)} mode="button" label={`Discussion: ${topic.title}`} />}
          {own.length ? <ul className="cc-track__list">{own.map(renderRow)}</ul> : null}
          {subs.map(({ sub, rows }) => (
            <div key={sub.id} id={`t-${sub.id}`} className="cc-track__sub">
              <h3>{sub.title}</h3>
              {sub.description ? <p className="cc-track__desc cc-track__desc--section">{sub.description}</p> : null}
              {readOnly ? null : <Comments config={comments} term={commentTerm("topic", vertical, slug, sub.id)} mode="button" label={`Discussion: ${sub.title}`} />}
              {rows.length ? (
                <ul className="cc-track__list">{rows.map(renderRow)}</ul>
              ) : (
                <p className="cc-track__empty">Nothing here yet.</p>
              )}
            </div>
          ))}
          {!own.length && !subs.length ? <p className="cc-track__empty">Nothing here yet.</p> : null}
        </section>
      ))}
    </div>
  );
}
