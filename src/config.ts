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
