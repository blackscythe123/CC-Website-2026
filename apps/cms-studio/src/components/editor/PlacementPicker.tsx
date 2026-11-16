"use client";

import { useEffect, useState } from "react";
import { CircleAlert } from "lucide-react";
import type { Placement } from "@coding-club/content-schema/tracks";
import { readApiJson } from "@/lib/hooks/apiClient";
import { Field, Select } from "@/components/ui";

export interface TrackOutline {
  slug: string;
  title: string;
  topics: { id: string; title: string; subtopics: { id: string; title: string }[] }[];
}

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; tracks: TrackOutline[] };

/** Does this placement exist in the loaded tracks? */
export function placementExists(placement: Placement, tracks: TrackOutline[]): boolean {
  const track = tracks.find((t) => t.slug === placement.track);
  const topic = track?.topics.find((t) => t.id === placement.topic);
  if (!topic) return false;
  return !placement.subtopic || topic.subtopics.some((s) => s.id === placement.subtopic);
}

/**
 * "Where does this go?" — a normal blog, or a place in one of the vertical's learning tracks
 * (Track › Topic › optional Subtopic). Options come from the tracks on main.
 */
export default function PlacementPicker({
  vertical,
  value,
  onChange,
}: {
  vertical: string;
  value: Placement | null;
  onChange: (next: Placement | null) => void;
}) {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    setLoad({ state: "loading" });
    fetch(`/api/tracks?vertical=${encodeURIComponent(vertical)}`)
      .then(readApiJson)
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) setLoad({ state: "error", message: data.error || "Couldn't load the tracks." });
        else setLoad({ state: "ready", tracks: Array.isArray(data.tracks) ? data.tracks : [] });
      })
      .catch(() => !cancelled && setLoad({ state: "error", message: "Couldn't load the tracks." }));
    return () => {
      cancelled = true;
    };
  }, [vertical]);

  if (load.state === "loading") {
    return <p className="text-[13px] text-muted">Loading this vertical&apos;s learning tracks…</p>;
  }
  if (load.state === "error") {
    return (
      <p className="flex items-start gap-2 text-[13px] text-danger">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {load.message}
        {value ? " Your current placement is kept." : ""}
      </p>
    );
  }
  const { tracks } = load;
  if (tracks.length === 0 && !value) {
    return (
      <p className="text-[13px] text-muted">
        This vertical has no learning tracks yet, so the blog is published as a normal blog.
      </p>
    );
  }

  const track = value ? tracks.find((t) => t.slug === value.track) : undefined;
  const topic = value && track ? track.topics.find((t) => t.id === value.topic) : undefined;
  const missing = value ? !placementExists(value, tracks) : false;

  return (
    <div className="space-y-3">
      {missing ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-warning-bg p-3 text-[13px] text-warning">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          This blog was placed in a topic that no longer exists. Pick another place, or choose &ldquo;Normal blog only&rdquo;.
        </p>
      ) : null}
      <Field label="Learning track" htmlFor="placement-track" hint="Readers see the blog in this track as well as in the blog list">
        <Select
          id="placement-track"
          value={track ? track.slug : ""}
          onChange={(e) => {
            const next = tracks.find((t) => t.slug === e.target.value);
            onChange(next && next.topics[0] ? { track: next.slug, topic: next.topics[0].id } : null);
          }}
        >
          <option value="">Normal blog only</option>
          {tracks.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.title}
            </option>
          ))}
        </Select>
      </Field>
      {track ? (
        <Field label="Topic" htmlFor="placement-topic">
          <Select
            id="placement-topic"
            value={topic ? topic.id : ""}
            onChange={(e) => onChange({ track: track.slug, topic: e.target.value })}
          >
            {!topic ? <option value="">Choose a topic…</option> : null}
            {track.topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {track && topic && topic.subtopics.length > 0 ? (
        <Field label="Subtopic" htmlFor="placement-subtopic" hint="Optional — leave it directly under the topic if none fits">
          <Select
            id="placement-subtopic"
            value={value?.subtopic && topic.subtopics.some((s) => s.id === value.subtopic) ? value.subtopic : ""}
            onChange={(e) =>
              onChange(e.target.value ? { track: track.slug, topic: topic.id, subtopic: e.target.value } : { track: track.slug, topic: topic.id })
            }
          >
            <option value="">Directly under &ldquo;{topic.title}&rdquo;</option>
            {topic.subtopics.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
    </div>
  );
}
