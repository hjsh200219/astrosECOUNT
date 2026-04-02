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

/**
 * Decodes ECOUNT's KeyPack V2 format used in internal API responses.
 *
 * V2 format: ["__$KeyPack", {keymap}, {record1}, {record2}, ...]
 * keymap: {"00": "field_name", "01": "field_name2", ...} — hex-indexed keys
 * records: {"00": value, "01": value2, ...} — hex-indexed values
 */
export class KeyPackV2Decoder {
  private maxDepth = 5;

  isKeyPackV2(data: unknown): boolean {
    return (
      Array.isArray(data) &&
      data.length >= 2 &&
      data[0] === "__$KeyPack"
    );
  }

  decode(data: unknown[], depth = 0): Record<string, unknown>[] {
    if (typeof data[1] !== "object" || data[1] === null || Array.isArray(data[1])) {
      return [];
    }
    const keymap = data[1] as Record<string, string>;
    const records = data.slice(2);

    return records.map((record) => {
      const raw = record as Record<string, unknown>;
      const decoded: Record<string, unknown> = {};

      for (const hexKey of Object.keys(keymap)) {
        const fieldName = keymap[hexKey];
        const value = raw[hexKey];

        if (this.isKeyPackV2(value) && depth < this.maxDepth) {
          decoded[fieldName] = this.decode(value as unknown[], depth + 1);
        } else {
          decoded[fieldName] = value;
        }
      }

      return decoded;
    });
  }
}
