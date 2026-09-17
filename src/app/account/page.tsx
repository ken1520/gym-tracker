import { Card, ConnectionError, PageHeader } from "@/components/ui";
import { PasswordForm } from "@/components/password-form";
import { requireViewer } from "@/server/auth/dal";

export default async function AccountPage() {
  const viewer = await requireViewer();
  if (viewer.status === "unavailable") {
    return (
      <>
        <PageHeader title="Account" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  const { user } = viewer;

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Account" description="Your sign-in details" />

      <div className="mb-6">
        <Card>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500 dark:text-neutral-400">Name</dt>
              <dd className="font-medium">{user.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500 dark:text-neutral-400">Email</dt>
              <dd className="truncate font-medium">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500 dark:text-neutral-400">Role</dt>
              <dd className="font-medium">{user.role}</dd>
            </div>
          </dl>
          {/* Name, email and role are changed by an admin on /users. Letting
              someone edit their own role here would make the role meaningless */}
          <p className="mt-3 border-t border-neutral-200 pt-2 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            Ask an admin to change your name, email or role.
          </p>
        </Card>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Change password
      </h2>
      <PasswordForm />
    </div>
  );
}
