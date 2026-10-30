"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import IconButton from "./IconButton";

function usePortalReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}

function useModalBehaviour(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);
}

const DIALOG_SIZES = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export function Dialog({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: keyof typeof DIALOG_SIZES;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const ready = usePortalReady();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useModalBehaviour(open, onClose);
  useFocusTrap(panelRef, open);
  if (!open || !ready) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-scrim" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-border bg-bg text-text shadow-float sm:rounded-2xl ${DIALOG_SIZES[size]}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold tracking-tight">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton icon={X} label="Close" size="sm" onClick={onClose} />
        </div>
        {children ? <div className="overflow-y-auto px-5 py-4">{children}</div> : null}
        {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

const DRAWER_WIDTHS = { md: "sm:max-w-md", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };

export function Drawer({
  open,
  onClose,
  title,
  width = "md",
  headerActions,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  width?: keyof typeof DRAWER_WIDTHS;
  headerActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const ready = usePortalReady();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalBehaviour(open, onClose);
  useFocusTrap(panelRef, open);
  if (!open || !ready) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-end sm:items-stretch">
      <div className="absolute inset-0 bg-scrim" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[94vh] w-full flex-col rounded-t-2xl border border-border bg-bg text-text shadow-float sm:h-full sm:max-h-none sm:rounded-none sm:border-y-0 sm:border-r-0 ${DRAWER_WIDTHS[width]}`}
      >
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-bold tracking-tight">
            {title}
          </h2>
          {headerActions ? <div className="hidden items-center gap-2 sm:flex">{headerActions}</div> : null}
          <IconButton icon={X} label="Close" size="sm" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer ? <div className="border-t border-border px-5 py-3.5">{footer}</div> : null}
        {headerActions ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3 sm:hidden">{headerActions}</div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
