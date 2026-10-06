"use client";
import { useState } from "react";

/** <details> whose open state is owned by the browser after first render (survives server refreshes). */
export function Collapsible({
  title,
  defaultOpen = false,
  className = "card",
  children,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details className={className} open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer font-semibold">{title}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
