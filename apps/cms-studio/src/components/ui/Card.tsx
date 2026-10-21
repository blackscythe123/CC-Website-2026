import type { HTMLAttributes } from "react";

export default function Card({
  padded = true,
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div className={`rounded-xl border border-border bg-bg shadow-card ${padded ? "p-4 sm:p-5" : ""} ${className}`} {...rest}>
      {children}
    </div>
  );
}
