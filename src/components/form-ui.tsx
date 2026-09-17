// Shared by the auth and account forms, which are all the same shape: a stack
// of labelled text inputs with an inline error under each one.
// Not a "use client" entry — it is only imported from client components, so it
// joins their bundle
import { useId, type ReactNode } from "react";

export const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100";

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: (props: { id: string; describedBy?: string }) => ReactNode;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  // The error replaces the hint rather than stacking under it, so the one thing
  // that needs acting on is the only thing announced
  const message = error ?? hint;

  return (
    <div>
      <label htmlFor={`${id}-${name}`} className="mb-1 block text-xs font-medium">
        {label}
      </label>
      {children({ id: `${id}-${name}`, describedBy: message ? messageId : undefined })}
      {message ? (
        <p
          id={messageId}
          className={
            error
              ? "mt-1 text-xs text-red-600 dark:text-red-400"
              : "mt-1 text-xs text-neutral-500 dark:text-neutral-400"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  pending,
  label,
  pendingLabel,
  full = false,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
  full?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${full ? "w-full " : ""}rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-300`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

// Every form in the app renders its non-field error the same way
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-3 text-sm text-red-600 dark:text-red-400">{message}</p>;
}
