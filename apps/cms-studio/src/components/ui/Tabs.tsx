"use client";

import { useRef } from "react";

export interface TabItem {
  id: string;
  label: string;
  /** Shown instead of `label` on phones */
  shortLabel?: string;
  count?: number;
}

export default function Tabs({
  tabs,
  value,
  onChange,
  ariaLabel,
  idPrefix = "tab",
}: {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  idPrefix?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onChange(tabs[next].id);
      refs.current[next]?.focus();
    }
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className="-mb-px flex gap-5 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab, i) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${idPrefix}-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 py-2.5 text-sm transition ${
              selected ? "border-accent font-semibold text-text" : "border-transparent font-medium text-muted hover:text-text"
            }`}
          >
            {tab.shortLabel ? (
              <>
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </>
            ) : (
              tab.label
            )}
            {tab.count !== undefined ? (
              <span className="rounded-full bg-neutral-bg px-1.5 text-[11px] font-semibold leading-5 text-neutral">{tab.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, idPrefix = "tab", children }: { id: string; idPrefix?: string; children: React.ReactNode }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-${id}`} className="pt-4">
      {children}
    </div>
  );
}
