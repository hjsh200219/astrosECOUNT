import { z } from "zod";

const envSchema = z.object({
  ECOUNT_COM_CODE: z.string().min(1, "ECOUNT_COM_CODE is required"),
  ECOUNT_USER_ID: z.string().min(1, "ECOUNT_USER_ID is required"),
  ECOUNT_API_CERT_KEY: z.string().min(1, "ECOUNT_API_CERT_KEY is required"),
  ECOUNT_ZONE: z.string().min(1, "ECOUNT_ZONE is required").default("AU1"),
  ECOUNT_LAN_TYPE: z.string().default("ko-KR"),
  ECOUNT_API_MODE: z.enum(["production", "sandbox"]).default("production"),
});

export type EcountConfig = z.infer<typeof envSchema>;

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

/** MAFRA (농림축산식품부) Open API config (optional — requires MAFRA_API_KEY) */
export interface MafraConfig {
  MAFRA_API_KEY: string;
}

/**
 * Load MAFRA config from environment.
 * Returns null if MAFRA_API_KEY is not set.
 */
export function loadMafraConfig(): MafraConfig | null {
  const apiKey = process.env.MAFRA_API_KEY?.trim();
  if (!apiKey) return null;
  return { MAFRA_API_KEY: apiKey };
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
