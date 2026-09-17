import { PageHeader } from "@/components/ui";
import { LoginForm } from "@/components/login-form";

// The proxy already sends a signed-in visitor away from here, so this page only
// ever renders for someone who is not
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <div className="mx-auto max-w-sm">
      <PageHeader title="Sign in" description="Your workouts live under your account" />
      <LoginForm next={next} />
      <p className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
        Accounts are created by an admin. Ask yours if you need one.
      </p>
    </div>
  );
}
