"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface MenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
}

/**
 * Dropdown menu. `trigger` receives the props to spread onto its button.
 * Arrow keys move between items, Esc closes and returns focus to the trigger.
 */
export default function Menu({
  trigger,
  items,
  align = "start",
  header,
}: {
  trigger: (props: {
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
    "aria-controls": string;
    onClick: () => void;
    ref: React.Ref<HTMLButtonElement>;
  }) => ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  header?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    const firstEnabled = items.findIndex((i) => !i.disabled);
    itemRefs.current[firstEnabled]?.focus();
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, items]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    const pos = enabled.indexOf(current);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      itemRefs.current[enabled[(pos + 1) % enabled.length]]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      itemRefs.current[enabled[(pos - 1 + enabled.length) % enabled.length]]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative inline-flex">
      {trigger({
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": menuId,
        onClick: () => setOpen((o) => !o),
        ref: triggerRef,
      })}
      {open ? (
        <div
          id={menuId}
          role="menu"
          onKeyDown={onKeyDown}
          className={`absolute top-full z-50 mt-1.5 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-bg p-1.5 text-text shadow-float ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          {header}
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                tabIndex={-1}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition disabled:opacity-50 ${
                  item.danger ? "text-danger hover:bg-danger-bg focus:bg-danger-bg" : "hover:bg-surface-2 focus:bg-surface-2"
                } focus:outline-none`}
              >
                {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden /> : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.label}</span>
                  {item.hint ? <span className="block text-xs text-muted">{item.hint}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
