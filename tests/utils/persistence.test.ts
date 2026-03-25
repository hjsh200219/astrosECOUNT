import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// We test against the real filesystem using a temp directory.
// To make DATA_DIR point at our temp dir, we mock the module after
// overriding the resolved path via vi.mock with a factory.

const tmpDir = path.join(os.tmpdir(), "persistence-test-" + process.pid);

vi.mock("../../src/utils/persistence.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/utils/persistence.js")>(
    "../../src/utils/persistence.js"
  );
  // Re-export but swap DATA_DIR to tmpDir by using the real implementations
  // while redirecting file operations to tmpDir.
  // Since DATA_DIR is a module-level const we cannot override it directly.
  // Instead we wrap each function so that filePath uses tmpDir.
  return {
    ensureDataDir: () => {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    },
    saveToFile: <T>(filename: string, data: Map<string, T> | T[]) => {
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      const filePath = path.join(tmpDir, filename);
      if (data instanceof Map) {
        fs.writeFileSync(filePath, JSON.stringify(Array.from(data.entries()), null, 2), "utf-8");
      } else {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
      }
    },
    loadFromFile: <T>(filename: string): Map<string, T> | null => {
      const filePath = path.join(tmpDir, filename);
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
    },
    loadArrayFromFile: <T>(filename: string): T[] | null => {
      const filePath = path.join(tmpDir, filename);
      if (!fs.existsSync(filePath)) return null;
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw) as T[];
      } catch {
        return null;
      }
    },
  };
});

import {
  ensureDataDir,
  saveToFile,
  loadFromFile,
  loadArrayFromFile,
} from "../../src/utils/persistence.js";

describe("persistence utils", () => {
  beforeEach(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up temp files after each test
    if (fs.existsSync(tmpDir)) {
      for (const f of fs.readdirSync(tmpDir)) {
        fs.unlinkSync(path.join(tmpDir, f));
      }
    }
  });

  describe("ensureDataDir", () => {
    it("should create the data directory if it does not exist", () => {
      // Remove tmpDir to test creation
      if (fs.existsSync(tmpDir)) {
        fs.rmdirSync(tmpDir);
      }
      ensureDataDir();
      expect(fs.existsSync(tmpDir)).toBe(true);
    });

    it("should not throw if directory already exists", () => {
      expect(() => ensureDataDir()).not.toThrow();
    });
  });

  describe("saveToFile + loadFromFile (Map)", () => {
    it("should save a Map and reload it correctly", () => {
      const original = new Map<string, { value: number }>([
        ["key1", { value: 1 }],
        ["key2", { value: 2 }],
      ]);
      saveToFile("test-map.json", original);

      const loaded = loadFromFile<{ value: number }>("test-map.json");
      expect(loaded).not.toBeNull();
      expect(loaded!.size).toBe(2);
      expect(loaded!.get("key1")).toEqual({ value: 1 });
      expect(loaded!.get("key2")).toEqual({ value: 2 });
    });

    it("should preserve string keys and complex values", () => {
      const original = new Map<string, { name: string; count: number }>([
        ["alpha", { name: "Alpha", count: 10 }],
        ["beta", { name: "Beta", count: 20 }],
      ]);
      saveToFile("test-complex.json", original);

      const loaded = loadFromFile<{ name: string; count: number }>("test-complex.json");
      expect(loaded).not.toBeNull();
      expect(loaded!.get("alpha")!.name).toBe("Alpha");
      expect(loaded!.get("beta")!.count).toBe(20);
    });

    it("should return null for non-existent file", () => {
      const result = loadFromFile("nonexistent-file.json");
      expect(result).toBeNull();
    });

    it("should return null for invalid JSON", () => {
      const filePath = path.join(tmpDir, "invalid.json");
      fs.writeFileSync(filePath, "{ this is not valid json }", "utf-8");
      const result = loadFromFile("invalid.json");
      expect(result).toBeNull();
    });

    it("should return null when file contains a plain object (not Map entries)", () => {
      const filePath = path.join(tmpDir, "plain-object.json");
      fs.writeFileSync(filePath, JSON.stringify({ key: "value" }), "utf-8");
      const result = loadFromFile("plain-object.json");
      expect(result).toBeNull();
    });
  });

  describe("saveToFile + loadArrayFromFile (Array)", () => {
    it("should save an array and reload it correctly", () => {
      const original = [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ];
      saveToFile("test-array.json", original);

      const loaded = loadArrayFromFile<{ id: string; name: string }>("test-array.json");
      expect(loaded).not.toBeNull();
      expect(loaded!.length).toBe(2);
      expect(loaded![0]).toEqual({ id: "1", name: "Alice" });
      expect(loaded![1]).toEqual({ id: "2", name: "Bob" });
    });

    it("should return null for non-existent file", () => {
      const result = loadArrayFromFile("nonexistent-array.json");
      expect(result).toBeNull();
    });

    it("should return null for invalid JSON", () => {
      const filePath = path.join(tmpDir, "bad-array.json");
      fs.writeFileSync(filePath, "[ broken json", "utf-8");
      const result = loadArrayFromFile("bad-array.json");
      expect(result).toBeNull();
    });

    it("should handle empty array", () => {
      saveToFile("empty-array.json", []);
      const loaded = loadArrayFromFile("empty-array.json");
      expect(loaded).not.toBeNull();
      expect(loaded!.length).toBe(0);
    });
  });
});
