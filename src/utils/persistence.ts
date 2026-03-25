import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "data");

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function saveToFile<T>(filename: string, data: Map<string, T> | T[]): void {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  if (data instanceof Map) {
    fs.writeFileSync(filePath, JSON.stringify(Array.from(data.entries()), null, 2), "utf-8");
  } else {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }
}

export function loadFromFile<T>(filename: string): Map<string, T> | null {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
      return new Map<string, T>(parsed as [string, T][]);
    }
    return null;
  } catch {
    return null;
  }
}

export function loadArrayFromFile<T>(filename: string): T[] | null {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T[];
  } catch {
    return null;
  }
}
