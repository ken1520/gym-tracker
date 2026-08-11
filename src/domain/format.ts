// Display helpers shared by server and client components
// Kilograms are the only display unit; a fixed locale keeps server and client output identical
const LOCALE = "en-GB";

export function formatWeight(kg: number): string {
  return `${kg.toLocaleString(LOCALE, { maximumFractionDigits: 1 })} kg`;
}

export function formatVolume(kg: number): string {
  return `${Math.round(kg).toLocaleString(LOCALE)} kg`;
}

// A single set as lifted, e.g. "100 kg × 5"
export function formatSet(weightKg: number, reps: number): string {
  return `${formatWeight(weightKg)} × ${reps}`;
}

// Rendered in UTC to match how workouts are stored and how the calendar groups
// them; local rendering would show a day either side of the cell it sits in
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
