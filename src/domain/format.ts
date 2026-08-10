// Display helpers shared by server and client components
// Kilograms are the only display unit; a fixed locale keeps server and client output identical
const LOCALE = "en-GB";

export function formatWeight(kg: number): string {
  return `${kg.toLocaleString(LOCALE, { maximumFractionDigits: 1 })} kg`;
}

export function formatVolume(kg: number): string {
  return `${Math.round(kg).toLocaleString(LOCALE)} kg`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
