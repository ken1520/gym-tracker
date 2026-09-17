"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { DeleteButton } from "@/components/delete-button";
import { Field, FormError, SubmitButton, inputClass } from "@/components/form-ui";
import { UserFields } from "@/components/user-fields";
import { useActionToast } from "@/components/use-action-toast";
import { MIN_PASSWORD_LENGTH } from "@/domain/auth-schemas";
import {
  deleteUserAction,
  setUserPasswordAction,
  updateUserAction,
} from "@/server/actions/users";
import { initialActionState } from "@/server/actions/state";
import type { User } from "@/domain/types";

type Mode = "view" | "edit" | "password";

const SECONDARY_BUTTON =
  "rounded-md px-2 py-1 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-neutral-100";

export function UserRow({ user, isSelf }: { user: User; isSelf: boolean }) {
  const [mode, setMode] = useState<Mode>("view");

  const [editState, editAction, editPending] = useActionState(
    updateUserAction,
    initialActionState,
  );
  const [pwState, pwAction, pwPending] = useActionState(
    setUserPasswordAction,
    initialActionState,
  );

  const router = useRouter();

  useActionToast(editState, () => {
    setMode("view");
    // A role change rewrites this account's own cookie, so the nav behind the
    // page is stale until the server render is refetched
    if (isSelf) router.refresh();
  });

  // Resetting your own password ends your session, so the action hands back a
  // destination the way the workout form's do
  useActionToast(pwState, () => {
    setMode("view");
    if (pwState.redirectTo) {
      router.push(pwState.redirectTo);
      router.refresh();
    }
  });

  if (mode === "view") {
    return (
      <li className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {user.name}
            {isSelf ? (
              <span className="ml-2 text-xs font-normal text-neutral-400">you</span>
            ) : null}
          </p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {user.email} · {user.role}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setMode("edit")} className={SECONDARY_BUTTON}>
            Edit
          </button>
          <button type="button" onClick={() => setMode("password")} className={SECONDARY_BUTTON}>
            Password
          </button>
          {/* Deleting yourself is rejected server-side too; hiding it here just
              keeps the button from looking available */}
          {isSelf ? null : (
            <DeleteButton
              id={user.id}
              action={deleteUserAction}
              label="Remove"
              confirm={`Remove ${user.name} and every workout they logged? This cannot be undone.`}
            />
          )}
        </div>
      </li>
    );
  }

  if (mode === "password") {
    return (
      <li className="py-3 first:pt-0 last:pb-0">
        <form action={pwAction}>
          <input type="hidden" name="id" value={user.id} />
          <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
            Set a new password for {user.name}. This signs them out everywhere.
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field
                label="New password"
                name="password"
                error={pwState.fieldErrors?.password}
              >
                {({ id, describedBy }) => (
                  <input
                    id={id}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    aria-describedby={describedBy}
                    className={inputClass}
                  />
                )}
              </Field>
            </div>
            <SubmitButton pending={pwPending} label="Set" pendingLabel="Setting…" />
            <button
              type="button"
              onClick={() => setMode("view")}
              className="shrink-0 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              Cancel
            </button>
          </div>
          <FormError message={pwState.status === "error" ? pwState.message : undefined} />
        </form>
      </li>
    );
  }

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <form action={editAction}>
        <input type="hidden" name="id" value={user.id} />
        <UserFields
          user={user}
          fieldErrors={editState.fieldErrors}
          pending={editPending}
          submitLabel="Save"
          pendingLabel="Saving…"
          onCancel={() => setMode("view")}
        />
        <FormError message={editState.status === "error" ? editState.message : undefined} />
      </form>
    </li>
  );
}
