"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 4000;

const STYLES: Record<ToastKind, { icon: typeof Info; iconClass: string }> = {
  success: { icon: CircleCheck, iconClass: "text-success" },
  error: { icon: CircleAlert, iconClass: "text-danger" },
  info: { icon: Info, iconClass: "text-info" },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (toast.kind === "error") return;
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const { icon: Icon, iconClass } = STYLES[toast.kind];
  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-border bg-bg px-3.5 py-3 text-sm text-text shadow-float sm:w-96"
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} aria-hidden />
      <p className="min-w-0 flex-1 break-words leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-m-1 rounded-md p-1 text-muted transition hover:bg-surface-2 hover:text-text"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    counter.current += 1;
    const toast = { id: `t${counter.current}`, kind, message };
    setToasts((list) => [...list, toast].slice(-MAX_VISIBLE));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[70] flex flex-col items-stretch gap-2 md:inset-x-auto md:bottom-5 md:left-[calc(var(--sidebar-w,0px)+20px)] md:items-start"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
