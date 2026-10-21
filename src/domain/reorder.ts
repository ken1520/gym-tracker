// Return a copy with the item at `from` moved to `to`; out-of-range indices are a no-op
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const inRange = (index: number) => Number.isInteger(index) && index >= 0 && index < items.length;
  if (!inRange(from) || !inRange(to) || from === to) return [...items];

  const without = items.filter((_, index) => index !== from);
  return [...without.slice(0, to), items[from], ...without.slice(to)];
}
