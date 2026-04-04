/**
 * Harness Documentation Verification Script
 *
 * Compares machine-verifiable facts in documentation against actual code.
 * Designed to run as a prelint hook so drift is caught before it accumulates.
 *
 * Exit code 0 = all checks pass, 1 = at least one mismatch detected.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

interface CheckResult {
  name: string;
  expected: string;
  actual: string;
  pass: boolean;
}

const results: CheckResult[] = [];

function check(name: string, expected: string, actual: string): void {
  results.push({ name, expected, actual, pass: expected === actual });
}

function readFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf-8");
}

function countFiles(dir: string, ext: string): number {
  const full = join(ROOT, dir);
  if (!existsSync(full)) return 0;
  return readdirSync(full).filter((f) => f.endsWith(ext)).length;
}

// ── 1. Tool module count (by register calls in index.ts) ──
const toolIndexContent = readFile("src/tools/index.ts");
const registerCalls = toolIndexContent.match(/^\s+register\w+Tools?\(/gm) ?? [];
const indexToolCount = registerCalls.length;

const agentsContent = readFile("AGENTS.md");
const toolCountMatch = agentsContent.match(
  /(\d+)\s+MCP tool modules?/
);
if (toolCountMatch) {
  check(
    "AGENTS.md tool_count",
    String(indexToolCount),
    toolCountMatch[1]
  );
}

const claudeContent = readFile("CLAUDE.md");
const claudeToolMatch = claudeContent.match(
  /(\d+)\s+MCP tool modules?/
);
if (claudeToolMatch) {
  check(
    "CLAUDE.md tool_count",
    String(indexToolCount),
    claudeToolMatch[1]
  );
}

// ── 2. Dependency versions (major only) ──
const pkg = JSON.parse(readFile("package.json"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

function majorVersion(semver: string): string {
  const clean = semver.replace(/^[\^~>=<]*/, "");
  const major = clean.split(".")[0];
  return `v${major}`;
}

const versionHeader = agentsContent.split("\n").slice(0, 5).join(" ");

const SDK_KEY = "@modelcontextprotocol/sdk";
if (deps[SDK_KEY]) {
  const actual = majorVersion(deps[SDK_KEY]);
  const sdkMatch = versionHeader.match(/MCP SDK (v\d+)/);
  if (sdkMatch) {
    check("MCP SDK major version", actual, sdkMatch[1]);
  }
}

if (deps["zod"]) {
  const actual = majorVersion(deps["zod"]);
  const zodMatch = versionHeader.match(/Zod (v\d+)/);
  if (zodMatch) {
    check("Zod major version", actual, zodMatch[1]);
  }
}

if (deps["vitest"]) {
  const actual = majorVersion(deps["vitest"]);
  const vitestMatch = versionHeader.match(/Vitest (v\d+)/);
  if (vitestMatch) {
    check("Vitest major version", actual, vitestMatch[1]);
  }
}

// ── 3. Directory existence ──
const declaredDirs = [
  "src/client",
  "src/tools",
  "src/utils",
  "src/types",
  "tests",
  "docs",
];

for (const dir of declaredDirs) {
  const exists = existsSync(join(ROOT, dir));
  check(`Directory exists: ${dir}`, "true", String(exists));
}

const shouldNotExist = ["src/services"];
for (const dir of shouldNotExist) {
  const exists = existsSync(join(ROOT, dir));
  check(`Deleted dir absent: ${dir}`, "false", String(exists));
}

// ── 3b. File count checks (prevent recurring drift) ──
const archContent = existsSync(join(ROOT, "ARCHITECTURE.md"))
  ? readFile("ARCHITECTURE.md")
  : "";

const utilsFileCount = countFiles("src/utils", ".ts");
const utilsCountMatch = archContent.match(/\|\s*\*\*Utils\*\*\s*\|[^|]*\((\d+) files?\)/);
if (utilsCountMatch) {
  check("ARCHITECTURE.md utils_file_count", String(utilsFileCount), utilsCountMatch[1]);
}

function countTestFilesRecursive(dir: string): number {
  const full = join(ROOT, dir);
  if (!existsSync(full)) return 0;
  let count = 0;
  const entries = readdirSync(full, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += countTestFilesRecursive(join(dir, entry.name));
    } else if (entry.name.endsWith(".test.ts")) {
      count++;
    }
  }
  return count;
}

const testFileCount = countTestFilesRecursive("tests");
const testCountMatch = archContent.match(/\|\s*\*\*Tests\*\*\s*\|[^|]*\((\d+) files?\)/);
if (testCountMatch) {
  check("ARCHITECTURE.md test_file_count", String(testFileCount), testCountMatch[1]);
}

// ── 3c. No stale module references ──
const staleTerms = ["persistence"];
for (const term of staleTerms) {
  const agentsHasTerm = agentsContent.includes(term);
  check(`AGENTS.md no stale ref: "${term}"`, "false", String(agentsHasTerm));
  const archHasTerm = archContent.includes(term);
  check(`ARCHITECTURE.md no stale ref: "${term}"`, "false", String(archHasTerm));
}

// ── 4. FACT markers in docs (if present) ──
const factMarkerRegex = /<!--\s*FACT:(\w+)=(.+?)\s*-->/g;
const docsToScan = ["AGENTS.md", "CLAUDE.md", "ARCHITECTURE.md"];

for (const docFile of docsToScan) {
  const filePath = join(ROOT, docFile);
  if (!existsSync(filePath)) continue;

  const content = readFileSync(filePath, "utf-8");
  let match;
  while ((match = factMarkerRegex.exec(content)) !== null) {
    const [, key, docValue] = match;
    let codeValue: string | undefined;

    if (key === "tool_count") {
      codeValue = String(indexToolCount);
    } else if (key === "mcp_sdk_version") {
      codeValue = deps[SDK_KEY]?.replace(/^[\^~>=<]*/, "");
    } else if (key === "zod_version") {
      codeValue = deps["zod"]?.replace(/^[\^~>=<]*/, "");
    }

    if (codeValue !== undefined) {
      check(`FACT marker ${key} in ${docFile}`, codeValue, docValue);
    }
  }
}

// ── Report ──
const failures = results.filter((r) => !r.pass);

console.log(`\n🛡️  Documentation Verification (${results.length} checks)\n`);

for (const r of results) {
  const icon = r.pass ? "✅" : "❌";
  const detail = r.pass ? "" : ` (expected: ${r.expected}, got: ${r.actual})`;
  console.log(`  ${icon} ${r.name}${detail}`);
}

if (failures.length > 0) {
  console.log(
    `\n❌ ${failures.length}/${results.length} checks failed. Update docs or code to resolve.\n`
  );
  process.exit(1);
} else {
  console.log(`\n✅ All ${results.length} checks passed.\n`);
}
