"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { standaloneCSS } from "./projectsStandaloneCSS";
import Projects from "./Projects";
import { sampleProjects, type Project } from "../data/projects";
export default function ProjectsIsolated({projects=sampleProjects,heading}:{projects?:Project[];heading?:string}={}) {
  const host = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const shadow = host.current.shadowRoot ?? host.current.attachShadow({ mode: "open" });
    setRoot(shadow);
  }, []);
  return <div ref={host} style={{ display: "block", width: "100%", minHeight: "calc(100dvh - var(--site-nav-height, 66px))" }}>
    {root && createPortal(<><style>{standaloneCSS + `.paper-stage{position:relative}`}</style><Projects projects={projects} heading={heading} /></>, root)}
  </div>;
}
