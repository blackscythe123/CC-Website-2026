import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const CONTROL =
  "w-full rounded-lg border bg-bg px-3 text-sm text-text placeholder:text-subtle transition focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 disabled:opacity-60";

function borderFor(invalid?: boolean) {
  return invalid ? "border-danger" : "border-border-strong";
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  counter,
  className = "",
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  counter?: { value: number; max: number };
  className?: string;
  children: ReactNode;
}) {
  const over = counter ? counter.value > counter.max : false;
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-text">
        {label}
      </label>
      {children}
      {error || hint || counter ? (
        <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
          <span id={`${htmlFor}-msg`} className={error ? "font-medium text-danger" : "text-muted"}>
            {error || hint}
          </span>
          {counter ? (
            <span className={`shrink-0 tabular-nums ${over ? "font-semibold text-warning" : "text-muted"}`}>
              {counter.value}/{counter.max}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { invalid, className = "", ...rest },
  ref
) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={`${CONTROL} h-9 ${borderFor(invalid)} ${className}`} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ invalid, className = "", ...rest }, ref) {
    return <textarea ref={ref} aria-invalid={invalid || undefined} className={`${CONTROL} py-2 leading-relaxed ${borderFor(invalid)} ${className}`} {...rest} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select(
  { invalid, className = "", children, ...rest },
  ref
) {
  return (
    <select ref={ref} aria-invalid={invalid || undefined} className={`${CONTROL} h-9 cursor-pointer pr-8 ${borderFor(invalid)} ${className}`} {...rest}>
      {children}
    </select>
  );
});
