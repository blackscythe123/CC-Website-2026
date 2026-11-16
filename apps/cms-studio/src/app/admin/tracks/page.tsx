"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, GitPullRequest, ListTree, Pencil, Plus, RefreshCw } from "lucide-react";
import type { Track } from "@coding-club/content-schema/tracks";
import { useStudio } from "@/components/shell/StudioContext";
import { useToast } from "@/components/toast/ToastProvider";
import { ALL_VERTICALS, getVertical } from "@/lib/verticals";
import { readApiJson } from "@/lib/hooks/apiClient";
import { emptyTrack, toEditable } from "@/lib/trackEditor";
import { Badge, Button, buttonClasses, Card, EmptyState, Select, Skeleton } from "@/components/ui";
import { NoArticles } from "@/components/illustrations";
import TrackEditor, { type TrackEditorTarget } from "@/components/tracks/TrackEditor";

interface TrackOutline {
  slug: string;
  title: string;
  topics: { id: string; title: string; subtopics: { id: string; title: string }[] }[];
}

/**
 * Learning tracks: Vertical Heads (and Superadmins) create and edit their vertical's topic trees.
 * Every save opens or updates a pull request that a Superadmin approves.
 */
export default function TracksPage() {
  const { user, roleInfo, queue } = useStudio();
  const toast = useToast();

  const manageable = useMemo(
    () =>
      roleInfo?.role === "superadmin"
        ? ALL_VERTICALS
        : ALL_VERTICALS.filter((v) => roleInfo?.rolesByVertical?.[v.slug] === "vertical_head"),
    [roleInfo]
  );
  const [vertical, setVertical] = useState("");
  useEffect(() => {
    if (!vertical && manageable[0]) setVertical(manageable[0].slug);
  }, [manageable, vertical]);

  const [tracks, setTracks] = useState<TrackOutline[] | null>(null);
  const [editor, setEditor] = useState<TrackEditorTarget | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!vertical) return;
    setTracks(null);
    try {
      const { ok, data } = await readApiJson(await fetch(`/api/tracks?vertical=${encodeURIComponent(vertical)}`));
      if (!ok) throw new Error(data.error || "Couldn't load the tracks");
      setTracks(Array.isArray(data.tracks) ? data.tracks : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load the tracks");
      setTracks([]);
    }
  }, [vertical, toast]);
  useEffect(() => {
    void load();
  }, [load]);

  const verticalName = getVertical(vertical)?.name || vertical;
  const openPrs = queue.prs.filter((p) => p.kind === "track" && p.vertical === vertical);

  const startNew = () =>
    setEditor({ vertical, verticalName, mode: "create", slug: null, initial: emptyTrack(), placedCounts: {} });

  const startEdit = async (slug: string) => {
    setOpening(slug);
    try {
      const { ok, data } = await readApiJson(await fetch(`/api/tracks?vertical=${encodeURIComponent(vertical)}&slug=${encodeURIComponent(slug)}`));
      if (!ok) throw new Error(data.error || "Couldn't open that track");
      setEditor({ vertical, verticalName, mode: "edit", slug, initial: toEditable(data.track as Track), placedCounts: data.placedCounts || {} });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't open that track");
    } finally {
      setOpening(null);
    }
  };

  const startRevise = useCallback(
    async (prNumber: number) => {
      setOpening(`pr-${prNumber}`);
      try {
        const { ok, data } = await readApiJson(await fetch(`/api/posts/reviews?previewPullNumber=${prNumber}`));
        const a = data.article;
        if (!ok || !a) throw new Error(data.error || `Couldn't load PR #${prNumber}`);
        if (a.kind !== "track") throw new Error(`PR #${prNumber} is an article, not a track. Open it from Write instead.`);
        if (!a.track) {
          throw new Error(`PR #${prNumber}'s track file is invalid (it was changed outside the Studio). Close it and start a new proposal.`);
        }
        let placedCounts: Record<string, number> = {};
        const published = await readApiJson(await fetch(`/api/tracks?vertical=${encodeURIComponent(a.vertical)}&slug=${encodeURIComponent(a.slug)}`));
        if (published.ok) placedCounts = published.data.placedCounts || {};
        setVertical(a.vertical);
        setEditor({
          vertical: a.vertical,
          verticalName: getVertical(a.vertical)?.name || a.vertical,
          mode: published.ok ? "edit" : "create",
          slug: a.slug,
          initial: toEditable(a.track as Track),
          placedCounts,
          pullNumber: prNumber,
          headSha: a.headSha,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Couldn't load PR #${prNumber}`);
      } finally {
        setOpening(null);
      }
    },
    [toast]
  );

  // /admin/tracks?revise=<PR> opens a track proposal for revision (from Reviews).
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("revise"));
    if (n > 0) void startRevise(n);
  }, [startRevise]);

  const submit = async (slug: string, track: Track) => {
    if (!editor) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical: editor.vertical,
          slug,
          track,
          mode: editor.mode,
          pullNumber: editor.pullNumber,
          expectedHeadSha: editor.headSha,
        }),
      });
      const { ok, data } = await readApiJson(res);
      if (!ok) throw new Error(data.error || "Couldn't submit the track");
      toast.success(
        editor.pullNumber
          ? `PR #${data.pullNumber} updated. It's back in review.`
          : `Pull request #${data.pullNumber} opened. A Superadmin will review it.`
      );
      setEditor(null);
      queue.refresh();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit the track");
    } finally {
      setSubmitting(false);
    }
  };

  if (manageable.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          illustration={NoArticles}
          title="Tracks are managed by Vertical Heads"
          body="Your Vertical Head organises the learning tracks. You can still put your blog into a track from Write → Submit → “Where does this go?”."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="hidden text-2xl font-extrabold tracking-tight md:block">Learning tracks</h1>
          <p className="mt-1 text-sm text-muted">
            Topic trees for your vertical&apos;s portal. Members add their blogs from the editor; you organise topics, links and videos here.
          </p>
        </div>
        {!editor ? (
          <div className="flex gap-2">
            <Button size="sm" icon={RefreshCw} onClick={() => void load()}>
              Refresh
            </Button>
            <Button size="sm" variant="primary" icon={Plus} onClick={startNew} disabled={!vertical}>
              New track
            </Button>
          </div>
        ) : null}
      </header>

      {editor ? (
        <div className="mt-5">
          <h2 className="mb-3 text-lg font-bold">
            {editor.pullNumber ? `Revising PR #${editor.pullNumber}` : editor.mode === "edit" ? "Edit track" : "New track"} · {editor.verticalName}
          </h2>
          <TrackEditor
            key={`${editor.vertical}/${editor.slug ?? "new"}/${editor.pullNumber ?? ""}`}
            target={editor}
            login={user.login}
            submitting={submitting}
            onSubmit={submit}
            onCancel={() => setEditor(null)}
          />
        </div>
      ) : (
        <>
          {manageable.length > 1 ? (
            <div className="mt-5">
              <label htmlFor="tracks-vertical" className="sr-only">
                Vertical
              </label>
              <Select id="tracks-vertical" value={vertical} onChange={(e) => setVertical(e.target.value)} className="sm:w-64">
                {manageable.map((v) => (
                  <option key={v.slug} value={v.slug}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {openPrs.length ? (
            <section className="mt-5 space-y-2" aria-labelledby="open-track-prs">
              <h2 id="open-track-prs" className="text-[13px] font-bold uppercase tracking-wide text-muted">
                Waiting for review
              </h2>
              {openPrs.map((pr) => (
                <Card key={pr.number} className="flex flex-wrap items-center gap-3">
                  <GitPullRequest className="h-4 w-4 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-semibold">{pr.title}</span>
                  {pr.changesRequested ? <Badge tone="warning">Changes requested</Badge> : <Badge>In review</Badge>}
                  <a href={pr.htmlUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses({ size: "sm", variant: "ghost" })}>
                    GitHub <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                  {pr.author.toLowerCase() === user.login.toLowerCase() || roleInfo?.role === "superadmin" ? (
                    <Button size="sm" icon={Pencil} loading={opening === `pr-${pr.number}`} onClick={() => void startRevise(pr.number)}>
                      Revise
                    </Button>
                  ) : null}
                </Card>
              ))}
            </section>
          ) : null}

          <section className="mt-5 space-y-2" aria-labelledby="published-tracks">
            <h2 id="published-tracks" className="text-[13px] font-bold uppercase tracking-wide text-muted">
              Published in {verticalName}
            </h2>
            {tracks === null ? (
              <>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : tracks.length === 0 ? (
              <EmptyState
                illustration={NoArticles}
                title="No tracks yet"
                body="Create a track like “DSA Sheet” or “Internship Prep”: topics, subtopics, links and videos, with blogs added by their authors."
                action={
                  <Button size="sm" variant="primary" icon={Plus} onClick={startNew}>
                    New track
                  </Button>
                }
              />
            ) : (
              tracks.map((t) => (
                <Card key={t.slug} className="flex flex-wrap items-center gap-3">
                  <ListTree className="h-4 w-4 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.title}</p>
                    <p className="text-[13px] text-muted">
                      /tracks/{t.slug} · {t.topics.length} topic{t.topics.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <a
                    href={`https://${getVertical(vertical)?.domain}/tracks/${t.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses({ size: "sm", variant: "ghost" })}
                  >
                    View <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                  <Button size="sm" icon={Pencil} loading={opening === t.slug} onClick={() => void startEdit(t.slug)}>
                    Edit
                  </Button>
                </Card>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
