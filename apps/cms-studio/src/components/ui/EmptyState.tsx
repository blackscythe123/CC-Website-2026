import type { ComponentType, ReactNode } from "react";

export default function EmptyState({
  illustration: Illustration,
  title,
  body,
  action,
}: {
  illustration: ComponentType<{ className?: string }>;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border-strong px-6 py-12 text-center">
      <Illustration className="h-28 w-auto" />
      <h3 className="mt-4 text-base font-bold text-text">{title}</h3>
      {body ? <p className="mt-1.5 max-w-sm text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
