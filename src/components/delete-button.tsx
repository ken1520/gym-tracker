"use client";

import { useToast } from "@/components/toast";
import type { ActionState } from "@/server/actions/state";

// A delete has no form to render errors into, so the toast is its only feedback.
// The action arrives as a prop, which keeps this usable from Server Components
export function DeleteButton({
  id,
  action,
  label,
}: {
  id: string;
  action: (formData: FormData) => Promise<ActionState>;
  label: string;
}) {
  const { showToast } = useToast();

  return (
    <form
      action={async (formData) => {
        const result = await action(formData);
        if (result.message) {
          showToast(result.message, result.status === "error" ? "error" : "success");
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md px-2 py-1 text-sm text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
      >
        {label}
      </button>
    </form>
  );
}
