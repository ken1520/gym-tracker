"use client";

import { useRouter } from "next/navigation";

import { useToast } from "@/components/toast";
import { logoutAction } from "@/server/actions/auth";

// Signing out is a mutation, so it goes through a form rather than a link — a
// GET that destroys a session can be fired by any image tag on any page
export function LogoutButton() {
  const router = useRouter();
  const { showToast } = useToast();

  return (
    <form
      action={async () => {
        const result = await logoutAction();
        if (result.message) showToast(result.message);
        // refresh() clears the cached server render that still shows the nav
        // for the account that just left
        router.push(result.redirectTo ?? "/login");
        router.refresh();
      }}
    >
      <button
        type="submit"
        className="rounded-md px-3 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
      >
        Sign out
      </button>
    </form>
  );
}
