import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { canManageExercises, canManageUsers } from "@/domain/roles";
import type { SessionUser } from "@/domain/types";

const LINK_CLASS =
  "rounded-md px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-50";

// Built per render rather than a module constant, because which links exist
// depends on the role. Hiding a link is tidiness, not access control — the
// action and the route behind it do the real check
function linksFor(user: SessionUser) {
  const links = [
    { href: "/workouts", label: "History" },
    { href: "/exercises", label: "Exercises" },
  ];

  if (canManageUsers(user.role)) links.push({ href: "/users", label: "People" });
  return links;
}

export function Nav({ user }: { user: SessionUser | null }) {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <nav className="mx-auto flex max-w-3xl items-center gap-1 px-4 py-3">
        <Link
          href={user ? "/" : "/login"}
          className="mr-auto text-base font-semibold tracking-tight"
        >
          Gym Tracker
        </Link>

        {user ? (
          <>
            {linksFor(user).map((link) => (
              <Link key={link.href} href={link.href} className={LINK_CLASS}>
                {link.label}
              </Link>
            ))}
            <Link
              href="/account"
              className={`${LINK_CLASS} font-medium`}
              title={`${user.email}${canManageExercises(user.role) ? " · admin" : ""}`}
            >
              {user.name}
            </Link>
            <LogoutButton />
          </>
        ) : null}
      </nav>
    </header>
  );
}
