/**
 * UNI-PASS API common client
 * XML parsing, auth key injection, URL builder, common fetch wrapper
 */

import { XMLParser } from "fast-xml-parser";
import type { UnipassResponse, UnipassResponseHeader } from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UNIPASS_BASE_URL = "https://unipass.customs.go.kr:38010/ext/rest";
const DEFAULT_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// XML Parser (singleton)
// ---------------------------------------------------------------------------

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: true,
  trimValues: true,
});

// ---------------------------------------------------------------------------
// Auth key helper
// ---------------------------------------------------------------------------

/**
 * Retrieve UNI-PASS API key from environment variables.
 *
 * Expected variable name pattern: `UNIPASS_KEY_API{apiId}`
 * e.g. UNIPASS_KEY_API1, UNIPASS_KEY_API2
 */
export function getUnipassApiKey(apiId: string): string {
  const envName = `UNIPASS_KEY_API${apiId}`;
  const key = process.env[envName];
  if (!key) {
    throw new Error(`${envName} 환경변수가 설정되지 않았습니다.`);
  }
  return key;
}

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

/**
 * Build a UNI-PASS API URL.
 *
 * @param path   - API path (e.g. `/BrkDty/retrieveBrkDtyList`)
 * @param apiKey - crkyCn value (from getUnipassApiKey)
 * @param params - Additional query parameters as key-value pairs
 * @returns      - Full URL string
 *
 * @example
 * ```ts
 * buildUnipassUrl("/BrkDty/retrieveBrkDtyList", "mykey123", { hsSgn: "0101" })
 * // => "https://unipass.customs.go.kr:38010/ext/rest/BrkDty/retrieveBrkDtyList?crkyCn=mykey123&hsSgn=0101"
 * ```
 */
export function buildUnipassUrl(
  path: string,
  apiKey: string,
  params?: Record<string, string>,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${UNIPASS_BASE_URL}${normalizedPath}`);
  url.searchParams.set("crkyCn", apiKey);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

// ---------------------------------------------------------------------------
// Normalize items helper
// ---------------------------------------------------------------------------

/**
 * UNI-PASS XML responses may return a single object or an array
 * depending on result count. This normalizes to always return an array.
 */
export function normalizeItems<T>(items: T | T[] | undefined | null): T[] {
  if (items == null) return [];
  return Array.isArray(items) ? items : [items];
}

// ---------------------------------------------------------------------------
// XML parser
// ---------------------------------------------------------------------------

/**
 * Parse a UNI-PASS XML response string into a JavaScript object.
 */
export function parseUnipassXml(xml: string): Record<string, unknown> {
  return xmlParser.parse(xml) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Fetch wrapper
// ---------------------------------------------------------------------------

export class UnipassApiError extends Error {
  constructor(
    public readonly resultCode: string,
    message: string,
  ) {
    super(message);
    this.name = "UnipassApiError";
  }
}

export interface FetchUnipassOptions {
  /** API path (e.g. `/BrkDty/retrieveBrkDtyList`) */
  path: string;
  /** API identifier for key lookup (e.g. "1", "2") */
  apiId: string;
  /** Additional query parameters */
  params?: Record<string, string>;
  /** Timeout in ms (default: 15000) */
  timeoutMs?: number;
  /** Root element name containing the response list (e.g. "tCnt", "brkDtyList") */
  rootElement?: string;
  /** Element name for items within the response */
  itemElement?: string;
}

/**
 * Common fetch wrapper for UNI-PASS API calls.
 *
 * - Injects API key from environment
 * - 15s timeout via AbortController
 * - Parses XML response
 * - Checks resultCode ("0" = success)
 * - Normalizes items array
 */
export async function fetchUnipassApi<T>(
  options: FetchUnipassOptions,
): Promise<UnipassResponse<T>> {
  const {
    path,
    apiId,
    params,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    rootElement,
    itemElement,
  } = options;

  const apiKey = getUnipassApiKey(apiId);
  const url = buildUnipassUrl(path, apiKey, params);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/xml" },
    });

    if (!response.ok) {
      throw new UnipassApiError(
        String(response.status),
        `UNI-PASS HTTP ${response.status}: ${response.statusText}`,
      );
    }

    const xml = await response.text();
    const parsed = parseUnipassXml(xml);

    // Extract the root wrapper (first key is typically the response wrapper)
    const rootKey = rootElement ?? Object.keys(parsed)[0];
    const root = (rootKey ? parsed[rootKey] : parsed) as Record<string, unknown>;

    // Extract header
    const header: UnipassResponseHeader = {
      resultCode: String(root?.resultCode ?? root?.rtnCd ?? ""),
      resultMessage: String(root?.resultMessage ?? root?.rtnMsg ?? ""),
    };

    // Check for error
    if (header.resultCode !== "" && header.resultCode !== "0") {
      throw new UnipassApiError(header.resultCode, header.resultMessage);
    }

    // Extract total count
    const totalCount = Number(root?.tCnt ?? root?.totalCount ?? 0);

    // Extract items
    const rawItems = itemElement ? root?.[itemElement] : undefined;
    const items = normalizeItems<T>(rawItems as T | T[] | undefined);

    return { header, totalCount, items };
  } catch (error) {
    if (error instanceof UnipassApiError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new UnipassApiError("TIMEOUT", `UNI-PASS API 시간 초과 (${timeoutMs}ms)`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
