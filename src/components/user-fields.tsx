// Shared by the create form and the inline row editor, the same arrangement
// exercise-fields.tsx uses. No "use client" directive on purpose
import { Field, SubmitButton, inputClass } from "@/components/form-ui";
import { MIN_PASSWORD_LENGTH } from "@/domain/auth-schemas";
import { ROLES } from "@/domain/roles";
import type { User } from "@/domain/types";

export function UserFields({
  user,
  fieldErrors,
  pending,
  submitLabel,
  pendingLabel,
  onCancel,
}: {
  user?: User;
  fieldErrors?: Record<string, string>;
  pending: boolean;
  submitLabel: string;
  pendingLabel: string;
  onCancel?: () => void;
}) {
  // Only the create form sets a password; an edit never touches it, so losing a
  // password and renaming someone stay separate actions
  const isNew = user === undefined;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Name" name="name" error={fieldErrors?.name}>
        {({ id, describedBy }) => (
          <input
            id={id}
            name="name"
            required
            maxLength={80}
            defaultValue={user?.name ?? ""}
            aria-invalid={Boolean(fieldErrors?.name)}
            aria-describedby={describedBy}
            className={inputClass}
            placeholder="Ken"
          />
        )}
      </Field>

      <Field label="Email" name="email" error={fieldErrors?.email}>
        {({ id, describedBy }) => (
          <input
            id={id}
            name="email"
            type="email"
            required
            defaultValue={user?.email ?? ""}
            aria-invalid={Boolean(fieldErrors?.email)}
            aria-describedby={describedBy}
            className={inputClass}
            placeholder="ken@example.com"
          />
        )}
      </Field>

      {isNew ? (
        <Field
          label="Password"
          name="password"
          error={fieldErrors?.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters. Share it with them; they can change it under their own name.`}
        >
          {({ id, describedBy }) => (
            <input
              id={id}
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              aria-invalid={Boolean(fieldErrors?.password)}
              aria-describedby={describedBy}
              className={inputClass}
            />
          )}
        </Field>
      ) : null}

      <Field
        label="Role"
        name="role"
        error={fieldErrors?.role}
        hint="Admins also manage the shared exercise library and these accounts"
      >
        {({ id, describedBy }) => (
          <select
            id={id}
            name="role"
            defaultValue={user?.role ?? "user"}
            aria-describedby={describedBy}
            className={inputClass}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className="flex items-end gap-2 sm:col-span-2">
        <SubmitButton pending={pending} label={submitLabel} pendingLabel={pendingLabel} />
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
