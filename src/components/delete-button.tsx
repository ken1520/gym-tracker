"use client";

import { useState } from "react";

import { useToast } from "@/components/toast";
import type { ActionState } from "@/server/actions/state";

// A delete has no form to render errors into, so the toast is its only feedback.
// The action arrives as a prop, which keeps this usable from Server Components
export function DeleteButton({
  id,
  action,
  label,
  confirm,
}: {
  id: string;
  action: (formData: FormData) => Promise<ActionState>;
  label: string;
  // Present only for deletes that take more with them than the row itself.
  // Two clicks inline rather than window.confirm, which blocks the page and
  // cannot be styled or dismissed by keyboard the way the rest of the UI can
  confirm?: string;
}) {
  const { showToast } = useToast();
  const [armed, setArmed] = useState(false);

  return (
    <form
      // Arming happens here rather than by flipping the button between
      // type="button" and type="submit". React flushes a state update from a
      // discrete event synchronously, so the button would already read
      // type="submit" by the time the browser resolved the click's default
      // action — and the first click would delete instead of arming
      action={async (formData) => {
        if (confirm !== undefined && !armed) {
          setArmed(true);
          return;
        }

        const result = await action(formData);
        setArmed(false);
        if (result.message) {
          showToast(result.message, result.status === "error" ? "error" : "success");
        }
      }}
      className="flex items-center gap-1"
    >
      <input type="hidden" name="id" value={id} />

      {armed ? (
        <span className="max-w-60 text-xs text-neutral-500 dark:text-neutral-400">{confirm}</span>
      ) : null}

      <button
        type="submit"
        className="rounded-md px-2 py-1 text-sm text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
      >
        {armed ? "Confirm" : label}
      </button>

      {armed ? (
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="rounded-md px-2 py-1 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900"
        >
          Cancel
        </button>
      ) : null}
    </form>
  );
}
