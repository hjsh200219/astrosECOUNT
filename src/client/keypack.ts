/**
 * KeyPack Encoder/Decoder for ECOUNT Internal API
 *
 * ECOUNT's internal Web API serializes request parameters using a proprietary
 * format called "__$KeyPack". This module encodes/decodes that format.
 *
 * Format: Base64( URL-encoded key=value pairs joined by & )
 * All values are stringified before encoding.
 */

/**
 * Encodes a parameter object into ECOUNT's __$KeyPack format.
 *
 * The format is: Base64(key1=urlEncode(val1)&key2=urlEncode(val2)&...)
 * Keys are sorted alphabetically for deterministic output.
 */
export class KeyPackEncoder {
  encode(params: Record<string, unknown>): string {
    // Sort keys for deterministic output
    const sortedKeys = Object.keys(params).sort();

    const pairs = sortedKeys.map((key) => {
      const value = String(params[key] ?? "");
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    });

    const joined = pairs.join("&");
    return Buffer.from(joined, "utf-8").toString("base64");
  }
}

/**
 * Decodes a __$KeyPack string back into a parameter object.
 */
export class KeyPackDecoder {
  decode(encoded: string): Record<string, string> {
    if (!encoded || encoded.trim().length === 0) {
      throw new Error("KeyPack 데이터가 비어있습니다");
    }

    let decoded: string;
    try {
      decoded = Buffer.from(encoded, "base64").toString("utf-8");
    } catch {
      throw new Error("KeyPack Base64 디코딩 실패: 올바르지 않은 형식");
    }

    if (!decoded || !decoded.includes("=")) {
      throw new Error("KeyPack 데이터가 올바르지 않은 형식입니다");
    }

    const result: Record<string, string> = {};
    const pairs = decoded.split("&");

    for (const pair of pairs) {
      const eqIndex = pair.indexOf("=");
      if (eqIndex === -1) continue;

      const key = decodeURIComponent(pair.substring(0, eqIndex));
      const value = decodeURIComponent(pair.substring(eqIndex + 1));
      result[key] = value;
    }

    return result;
  }
}
