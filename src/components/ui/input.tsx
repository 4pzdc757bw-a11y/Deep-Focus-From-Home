import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-yellow bg-paper px-3 text-base text-ink placeholder:text-muted/70 outline-none focus:border-gold focus:ring-2 focus:ring-gold/30",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border border-yellow bg-paper px-3 py-2 text-base text-ink placeholder:text-muted/70 outline-none focus:border-gold focus:ring-2 focus:ring-gold/30",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
        {label}
      </span>
      {children}
      {hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </label>
  );
}
