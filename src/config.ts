import { z } from "zod";

/** HTTP request timeout shared across all API clients (ms) */
export const HTTP_TIMEOUT_MS = 30_000;

/** Circuit breaker reset timeout (ms) */
export const CIRCUIT_BREAKER_RESET_MS = 30_000;

const envSchema = z.object({
  ECOUNT_COM_CODE: z.string().min(1, "ECOUNT_COM_CODE is required"),
  ECOUNT_USER_ID: z.string().min(1, "ECOUNT_USER_ID is required"),
  ECOUNT_API_CERT_KEY: z.string().min(1, "ECOUNT_API_CERT_KEY is required"),
  ECOUNT_ZONE: z.string().min(1, "ECOUNT_ZONE is required").default("AU1"),
  ECOUNT_LAN_TYPE: z.string().default("ko-KR"),
  ECOUNT_API_MODE: z.enum(["production", "sandbox"]).default("production"),
  /** Comma-separated extra tool groups to enable, or "all". Default: disabled.
   *  Valid keys: map, presentation, three-d, diagram, pdf-stamp
   *  Example: ECOUNT_ENABLE_EXTRAS=map,diagram  or  ECOUNT_ENABLE_EXTRAS=all
   */
  ECOUNT_ENABLE_EXTRAS: z.string().default(""),
});

export type EcountConfig = z.infer<typeof envSchema>;

/**
 * Returns true if the given extra tool group key is enabled via ECOUNT_ENABLE_EXTRAS.
 * Valid keys: map, presentation, three-d, diagram, pdf-stamp
 */
export function isExtraEnabled(config: EcountConfig, key: string): boolean {
  const raw = (config.ECOUNT_ENABLE_EXTRAS ?? "").trim();
  if (!raw) return false;
  if (raw === "all") return true;
  return raw.split(",").map((s) => s.trim()).includes(key);
}

/** Returns the API host prefix: "oapi" for production, "sboapi" for sandbox */
export function apiHostPrefix(config: EcountConfig): string {
  return config.ECOUNT_API_MODE === "sandbox" ? "sboapi" : "oapi";
}

export function loadConfig(): EcountConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`ECOUNT 환경 변수 설정 오류:\n${errors}\n\n.env.example을 참고하세요.`);
  }
  return result.data;
}

/** Internal Web API authentication config (optional — requires WEB_ID + WEB_PW) */
export interface InternalApiConfig {
  ECOUNT_ZONE: string;
  ECOUNT_COM_CODE: string;
  ECOUNT_WEB_ID: string;
  ECOUNT_WEB_PW: string;
}

/**
 * Load internal API config from environment.
 * Returns null if ECOUNT_WEB_ID or ECOUNT_WEB_PW are not set.
 * Both must be present for internal API to be enabled.
 */
/** Popbill Fax API config (optional — requires POPBILL_LINK_ID + POPBILL_SECRET_KEY) */
export interface PopbillConfig {
  POPBILL_LINK_ID: string;
  POPBILL_SECRET_KEY: string;
  POPBILL_IS_TEST: boolean;
  POPBILL_CORP_NUM: string;
}

/**
 * Load Popbill config from environment.
 * Returns null if POPBILL_LINK_ID or POPBILL_SECRET_KEY are not set.
 * POPBILL_CORP_NUM is derived from ECOUNT_COM_CODE.
 * POPBILL_IS_TEST defaults to true for safety.
 */
export function loadPopbillConfig(): PopbillConfig | null {
  const linkId = process.env.POPBILL_LINK_ID;
  const secretKey = process.env.POPBILL_SECRET_KEY;

  if (!linkId || !secretKey) return null;

  const corpNum = process.env.ECOUNT_COM_CODE;
  if (!corpNum) return null;

  return {
    POPBILL_LINK_ID: linkId,
    POPBILL_SECRET_KEY: secretKey,
    POPBILL_IS_TEST: process.env.POPBILL_IS_TEST !== "false",
    POPBILL_CORP_NUM: corpNum,
  };
}

export function loadInternalApiConfig(): InternalApiConfig | null {
  const webId = process.env.ECOUNT_WEB_ID;
  const webPw = process.env.ECOUNT_WEB_PW;

  if (!webId || !webPw) return null;

  // Inherit ZONE and COM_CODE from base config env vars
  const zone = process.env.ECOUNT_ZONE || "AU1";
  const comCode = process.env.ECOUNT_COM_CODE;

  if (!comCode) return null;

  return {
    ECOUNT_ZONE: zone,
    ECOUNT_COM_CODE: comCode,
    ECOUNT_WEB_ID: webId,
    ECOUNT_WEB_PW: webPw,
  };
}
