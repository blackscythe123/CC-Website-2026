export default function Spinner({ size = 16, label }: { size?: number; label?: string }) {
  return (
    <span role={label ? "status" : undefined} className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent opacity-80"
        style={{ width: size, height: size }}
      />
      {label ? <span className="text-sm text-muted">{label}</span> : null}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`block animate-pulse rounded-md bg-surface-2 ${className}`} />;
}
