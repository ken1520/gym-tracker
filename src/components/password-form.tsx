"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Field, FormError, SubmitButton, inputClass } from "@/components/form-ui";
import { useToast } from "@/components/toast";
import { MIN_PASSWORD_LENGTH } from "@/domain/auth-schemas";
import { changePasswordAction } from "@/server/actions/users";
import { initialActionState } from "@/server/actions/state";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initialActionState);
  const router = useRouter();
  const { showToast } = useToast();

  // A successful change invalidates this session along with every other, so the
  // only sensible next screen is /login
  useEffect(() => {
    if (state.status !== "success") return;
    if (state.message) showToast(state.message);
    if (state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <Field
        label="Current password"
        name="currentPassword"
        error={state.fieldErrors?.currentPassword}
      >
        {({ id, describedBy }) => (
          <input
            id={id}
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            aria-describedby={describedBy}
            className={inputClass}
          />
        )}
      </Field>

      <Field
        label="New password"
        name="password"
        error={state.fieldErrors?.password}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
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

      <Field
        label="Confirm new password"
        name="confirmPassword"
        error={state.fieldErrors?.confirmPassword}
      >
        {({ id, describedBy }) => (
          <input
            id={id}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            aria-describedby={describedBy}
            className={inputClass}
          />
        )}
      </Field>

      <SubmitButton pending={pending} label="Change password" pendingLabel="Changing…" />
      <FormError message={state.status === "error" ? state.message : undefined} />
    </form>
  );
}
