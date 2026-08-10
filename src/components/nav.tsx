import Link from "next/link";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/workouts", label: "History" },
  { href: "/exercises", label: "Exercises" },
] as const;

export function Nav() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <nav className="mx-auto flex max-w-3xl items-center gap-1 px-4 py-3">
        <Link href="/" className="mr-auto text-base font-semibold tracking-tight">
          Gym Tracker
        </Link>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-50"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
