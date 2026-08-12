import type { ReactNode } from "react";

import { formatPercentChange } from "@/domain/format";
import type { Trend, TrendDirection } from "@/domain/week";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      {children}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
      <p className="text-sm font-medium">{title}</p>
      {hint ? (
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{hint}</p>
      ) : null}
    </div>
  );
}

const TREND_COLOURS: Record<TrendDirection, string> = {
  up: "text-green-600 dark:text-green-500",
  down: "text-red-600 dark:text-red-500",
  flat: "text-neutral-500 dark:text-neutral-400",
};

const TREND_ARROWS: Record<TrendDirection, string> = { up: "↑", down: "↓", flat: "–" };

const TREND_WORDS: Record<TrendDirection, string> = {
  up: "Up",
  down: "Down",
  flat: "No change",
};

// The arrow, not the colour, is what carries the direction — colour alone would
// be invisible to anyone who cannot distinguish red from green
function TrendBadge({ direction, percent }: Trend) {
  const size = percent === null ? "" : ` ${formatPercentChange(percent)}`;

  return (
    <span className={`text-sm font-medium ${TREND_COLOURS[direction]}`}>
      <span aria-hidden="true">
        {TREND_ARROWS[direction]}
        {size}
      </span>
      <span className="sr-only">{`${TREND_WORDS[direction]}${size} from last week`}</span>
    </span>
  );
}

export function Stat({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: Trend;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {trend ? <TrendBadge {...trend} /> : null}
      </p>
    </div>
  );
}

// Rendered when a page's data fetch fails, almost always a missing database
export function ConnectionError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
      <p className="font-medium text-amber-900 dark:text-amber-200">{message}</p>
      {/* The remedy differs by environment: locally it is nearly always a
          stopped container, in production a bad URI or an Atlas IP allowlist */}
      <p className="mt-1 text-amber-800 dark:text-amber-300">
        {process.env.NODE_ENV === "production" ? (
          <>
            Check that <code className="font-mono">MONGODB_URI</code> is set and that this service
            is allowed to reach the database.
          </>
        ) : (
          <>
            Start MongoDB with <code className="font-mono">docker compose up -d</code> and make sure
            <code className="ml-1 font-mono">MONGODB_URI</code> is set in{" "}
            <code className="font-mono">.env.local</code>.
          </>
        )}
      </p>
    </div>
  );
}
