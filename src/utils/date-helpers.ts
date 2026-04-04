export const MS_PER_DAY = 86_400_000;

export function nowIso(): string {
  return new Date().toISOString();
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysSince(isoDate: string): number {
  return Math.floor(
    (Date.now() - new Date(isoDate).getTime()) / MS_PER_DAY,
  );
}

export function daysBetweenDates(from: string | Date, to: string | Date): number {
  const fromMs = typeof from === "string" ? new Date(from).getTime() : from.getTime();
  const toMs = typeof to === "string" ? new Date(to).getTime() : to.getTime();
  return Math.floor((toMs - fromMs) / MS_PER_DAY);
}
