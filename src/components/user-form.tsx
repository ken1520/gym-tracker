"use client";

import { useActionState, useState } from "react";

import { FormError } from "@/components/form-ui";
import { UserFields } from "@/components/user-fields";
import { useActionToast } from "@/components/use-action-toast";
import { createUserAction } from "@/server/actions/users";
import { initialActionState } from "@/server/actions/state";

export function UserForm() {
  const [state, action, pending] = useActionState(createUserAction, initialActionState);

  // A key bump remounts the fields, which is what clears them — the same trick
  // the exercise form uses, and the only way to reset uncontrolled inputs
  const [resetKey, setResetKey] = useState(0);
  useActionToast(state, () => setResetKey((current) => current + 1));

  return (
    <form
      action={action}
      className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <UserFields
        key={resetKey}
        fieldErrors={state.fieldErrors}
        pending={pending}
        submitLabel="Add account"
        pendingLabel="Adding…"
      />
      <FormError message={state.status === "error" ? state.message : undefined} />
    </form>
  );
}
