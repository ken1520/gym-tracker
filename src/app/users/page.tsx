import { notFound } from "next/navigation";

import { Card, ConnectionError, PageHeader } from "@/components/ui";
import { UserForm } from "@/components/user-form";
import { UserRow } from "@/components/user-row";
import { canManageUsers } from "@/domain/roles";
import { requireViewer } from "@/server/auth/dal";
import { listUsers } from "@/server/repositories/users";
import type { User } from "@/domain/types";

export default async function UsersPage() {
  // Outside the try below: requireViewer redirects by throwing, and a bare
  // catch would swallow it and render the page for a signed-out visitor
  const viewer = await requireViewer();
  if (viewer.status === "unavailable") {
    return (
      <>
        <PageHeader title="People" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  // 404 rather than a 403 page: forbidden() is still behind the experimental
  // authInterrupts flag, and this route is not advertised to non-admins anyway
  if (!canManageUsers(viewer.user.role)) notFound();

  let users: User[];
  try {
    users = await listUsers();
  } catch {
    return (
      <>
        <PageHeader title="People" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="People"
        description="There is no public sign-up — every account is created here"
      />

      <div className="mb-8">
        <UserForm />
      </div>

      <Card>
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {users.map((user) => (
            <UserRow key={user.id} user={user} isSelf={user.id === viewer.user.id} />
          ))}
        </ul>
      </Card>
    </>
  );
}
