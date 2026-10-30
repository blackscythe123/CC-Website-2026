"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { standaloneCSS } from "./blogsStandaloneCSS";
import NewspaperBlogs from "./NewspaperBlogs";
import { blogs, type Blog } from "../data/blogs";
export default function BlogsIsolated({items=blogs,title}:{items?:Blog[];title?:string}={}) {
  const host = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const shadow = host.current.shadowRoot ?? host.current.attachShadow({ mode: "open" });
    setRoot(shadow);
  }, []);
  return <div ref={host} style={{ display: "block", width: "100%", minHeight: "calc(100dvh - var(--site-nav-height, 66px))" }}>
    {root && createPortal(<><style>{standaloneCSS}</style><NewspaperBlogs blogs={items} title={title} /></>, root)}
  </div>;
}
