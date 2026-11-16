"use client";

import { useEffect, useRef, useState } from "react";
import type { CommentsConfig } from "../index";

// Reader comments stored in this repo's GitHub Discussions, through the giscus widget iframe.
// We embed the iframe ourselves instead of giscus' client.js, so no third-party script runs on the
// portal origin and several widgets (one per topic) can live on one page. This mirrors what client.js
// does: carry the sign-in session from the ?giscus= return parameter into localStorage, build the
// widget URL, and resize the iframe from its postMessage events.

const GISCUS_ORIGIN = "https://giscus.app";
const SESSION_KEY = "giscus-session";
const OPEN_EVENT = "cc-comments:open";

function readSession(): string {
  try {
    const url = new URL(window.location.href);
    const fresh = url.searchParams.get("giscus");
    if (fresh) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
      url.searchParams.delete("giscus");
      window.history.replaceState(window.history.state, document.title, url.toString());
      return fresh;
    }
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? String(JSON.parse(saved)) : "";
  } catch {
    return "";
  }
}

/** Widget URL for a term. Exported for tests. */
export function giscusWidgetUrl(config: CommentsConfig, term: string, pageUrl: string, session: string): string {
  const page = new URL(pageUrl);
  page.searchParams.delete("giscus");
  page.hash = "";
  const params = new URLSearchParams({
    origin: page.toString(),
    session,
    theme: "light",
    reactionsEnabled: "1",
    emitMetadata: "0",
    inputPosition: "bottom",
    repo: config.repo,
    repoId: config.repoId,
    category: config.category,
    categoryId: config.categoryId,
    strict: "1",
    description: "",
    backLink: page.toString(),
    term,
  });
  return `${GISCUS_ORIGIN}/en/widget?${params.toString()}`;
}

function Frame({ config, term, title }: { config: CommentsConfig; term: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [height, setHeight] = useState(180);

  useEffect(() => {
    setSrc(giscusWidgetUrl(config, term, window.location.href, readSession()));
  }, [config, term]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== GISCUS_ORIGIN || event.source !== ref.current?.contentWindow) return;
      const data = (event.data as { giscus?: Record<string, unknown> })?.giscus;
      if (!data || typeof data !== "object") return;
      if (typeof data.resizeHeight === "number" && data.resizeHeight > 0) setHeight(Math.min(Math.ceil(data.resizeHeight), 20000));
      if (data.signOut) {
        try {
          localStorage.removeItem(SESSION_KEY);
        } catch {
          // storage unavailable
        }
        setSrc(giscusWidgetUrl(config, term, window.location.href, ""));
      }
      const error = typeof data.error === "string" ? data.error : "";
      if (/Bad credentials|Invalid state value|State has expired/.test(error)) {
        try {
          localStorage.removeItem(SESSION_KEY);
        } catch {
          // storage unavailable
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [config, term]);

  if (!src) return null;
  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      className="cc-comments__frame"
      style={{ height }}
      loading="lazy"
      allow="clipboard-write"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

/**
 * Comments for one page or section.
 * - mode "inline": loads when scrolled near (blog and track pages).
 * - mode "button": a "Discuss" toggle; opening one closes any other on the page (topic sections).
 * Render nothing when `config` is null (comments off or not configured).
 */
export default function Comments({
  config,
  term,
  mode = "inline",
  label = "Comments",
}: {
  config: CommentsConfig | null;
  term: string | null;
  mode?: "inline" | "button";
  label?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (mode !== "inline" || !config || !term) return;
    const node = box.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [mode, config, term]);

  useEffect(() => {
    if (mode !== "button") return;
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== term) setOpen(false);
    };
    window.addEventListener(OPEN_EVENT, onOther);
    return () => window.removeEventListener(OPEN_EVENT, onOther);
  }, [mode, term]);

  if (!config || !term) return null;

  if (mode === "button") {
    return (
      <div className="cc-comments cc-comments--section">
        <button
          type="button"
          className="cc-comments__toggle"
          aria-expanded={open}
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next) window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: term }));
          }}
        >
          {open ? "Hide discussion" : "Discuss"}
        </button>
        {open ? <Frame config={config} term={term} title={label} /> : null}
      </div>
    );
  }

  return (
    <section ref={box} className="cc-comments" aria-label={label}>
      <h2 className="cc-comments__heading">{label}</h2>
      <p className="cc-comments__note">Sign in with GitHub to join the discussion. Comments are stored in GitHub Discussions.</p>
      {visible ? <Frame config={config} term={term} title={label} /> : <div className="cc-comments__placeholder" />}
    </section>
  );
}
