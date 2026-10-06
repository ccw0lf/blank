"use client";
import { createContext, forwardRef, useTransition } from "react";

export const PendingContext = createContext(false);

/**
 * A <form> for useActionState actions that does NOT clear the user's input
 * when the action returns (React 19 auto-resets forms passed to `action`).
 * Keeps typed text and chosen files on validation errors.
 */
export const ActionForm = forwardRef<
  HTMLFormElement,
  Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & { action: (fd: FormData) => void }
>(function ActionForm({ action, children, ...rest }, ref) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      ref={ref}
      {...rest}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
    </form>
  );
});
