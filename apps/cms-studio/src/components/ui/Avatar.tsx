"use client";

import { useEffect, useRef, useState } from "react";

const FALLBACK_COLORS = ["#2563EB", "#7C3AED", "#BE123C", "#C2410C", "#047857", "#0E7490", "#4F46E5"];

function colorFor(login: string) {
  return FALLBACK_COLORS[[...login].reduce((n, c) => n + c.charCodeAt(0), 0) % FALLBACK_COLORS.length];
}

/** User avatar with an initials fallback (white text on a ≥4.5:1 background). */
export default function Avatar({ src, login, size = 28, className = "" }: { src?: string; login: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const style = { width: size, height: size };

  // The image can fail before hydration attaches onError; check once mounted.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imgRef}
        src={src}
        alt=""
        aria-hidden
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-full border border-border object-cover ${className}`}
        style={style}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ ...style, background: colorFor(login), fontSize: Math.max(9, size * 0.38) }}
    >
      {login.replace(/^mock-/, "").slice(0, 2).toUpperCase()}
    </span>
  );
}
