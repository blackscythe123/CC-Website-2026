"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { standaloneCSS } from "./projectsStandaloneCSS";
import Projects from "./Projects";
import { sampleProjects } from "../data/projects";
export default function ProjectsIsolated() {
  const host = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const shadow = host.current.shadowRoot ?? host.current.attachShadow({ mode: "open" });
    setRoot(shadow);
  }, []);
  return <div ref={host} style={{ display: "block", width: "100%", minHeight: "calc(100dvh - var(--site-nav-height, 66px))" }}>
    {root && createPortal(<><style>{standaloneCSS + `.paper-stage{position:relative}`}</style><Projects projects={sampleProjects} /></>, root)}
  </div>;
}
