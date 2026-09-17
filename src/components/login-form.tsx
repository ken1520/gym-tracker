"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Field, FormError, SubmitButton, inputClass } from "@/components/form-ui";
import { useToast } from "@/components/toast";
import { loginAction } from "@/server/actions/auth";
import { initialActionState } from "@/server/actions/state";

// `next` is the path the proxy bounced them off. Only a same-site path is
// honoured — an absolute URL here would make the login page an open redirect
function safeNext(next: string | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialActionState);
  const router = useRouter();
  const { showToast } = useToast();

  // Not useActionToast: this navigates somewhere the action cannot know about,
  // and the server render behind it has to be refetched under the new session.
  // replace() rather than push() keeps /login out of the back stack
  useEffect(() => {
    if (state.status !== "success" || !state.redirectTo) return;
    showToast(state.message ?? "Signed in");
    router.replace(safeNext(next) ?? state.redirectTo);
    router.refresh();
    // The state object is the trigger; the rest are stable enough per render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <Field label="Email" name="email" error={state.fieldErrors?.email}>
        {({ id, describedBy }) => (
          <input
            id={id}
            name="email"
            type="email"
            autoComplete="username"
            required
            aria-invalid={Boolean(state.fieldErrors?.email)}
            aria-describedby={describedBy}
            className={inputClass}
            placeholder="you@example.com"
          />
        )}
      </Field>

      <Field label="Password" name="password" error={state.fieldErrors?.password}>
        {({ id, describedBy }) => (
          <input
            id={id}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(state.fieldErrors?.password)}
            aria-describedby={describedBy}
            className={inputClass}
          />
        )}
      </Field>

      <SubmitButton pending={pending} label="Sign in" pendingLabel="Signing in…" full />
      <FormError message={state.status === "error" ? state.message : undefined} />
    </form>
  );
}
