const counters = new Map<string, number>();

export function generateId(prefix: string): string {
  const current = counters.get(prefix) ?? 0;
  const next = current + 1;
  counters.set(prefix, next);
  return `${prefix}-${Date.now()}-${next}`;
}
