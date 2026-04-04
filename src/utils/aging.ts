import { MS_PER_DAY } from "./date-helpers.js";

export interface AgingEntry {
  dueDate: string;
  outstanding: number;
}

export interface AgingBuckets<T extends AgingEntry> {
  current: T[];
  "1-30": T[];
  "31-60": T[];
  "61-90": T[];
  "90+": T[];
}

export function classifyIntoBuckets<T extends AgingEntry>(
  entries: T[],
  asOf: Date,
): AgingBuckets<T> {
  const buckets: AgingBuckets<T> = {
    current: [],
    "1-30": [],
    "31-60": [],
    "61-90": [],
    "90+": [],
  };

  for (const entry of entries) {
    const daysOverdue = Math.floor(
      (asOf.getTime() - new Date(entry.dueDate).getTime()) / MS_PER_DAY,
    );

    if (daysOverdue <= 0) {
      buckets.current.push(entry);
    } else if (daysOverdue <= 30) {
      buckets["1-30"].push(entry);
    } else if (daysOverdue <= 60) {
      buckets["31-60"].push(entry);
    } else if (daysOverdue <= 90) {
      buckets["61-90"].push(entry);
    } else {
      buckets["90+"].push(entry);
    }
  }

  return buckets;
}
