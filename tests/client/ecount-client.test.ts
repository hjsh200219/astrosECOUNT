import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EcountClient } from "../../src/client/ecount-client.js";
import type { EcountConfig } from "../../src/config.js";

const mockConfig: EcountConfig = {
  ECOUNT_COM_CODE: "TEST",
  ECOUNT_USER_ID: "user",
  ECOUNT_API_CERT_KEY: "key123",
  ECOUNT_ZONE: "AU1",
  ECOUNT_LAN_TYPE: "ko-KR",
};

describe("EcountClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should call endpoint with SESSION_ID", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("GetAccessToken")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              Status: "200",
              Error: null,
              Data: { SESSION_ID: "test-sid" },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: "200",
            Error: null,
            Data: { Result: [{ id: 1 }] },
          }),
      });
    }) as unknown as typeof fetch;

    const client = new EcountClient(mockConfig);
    const result = await client.post("Product/ListProduct", { PAGE_NO: 1 });

    expect(result).toEqual({ Result: [{ id: 1 }] });
  });

  it("should include SESSION_ID in request body", async () => {
    const mockFn = vi.fn().mockImplementation((url: string) => {
      if (url.includes("GetAccessToken")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              Status: "200",
              Error: null,
              Data: { SESSION_ID: "my-session-id" },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: "200",
            Error: null,
            Data: { ok: true },
          }),
      });
    });
    globalThis.fetch = mockFn as unknown as typeof fetch;

    const client = new EcountClient(mockConfig);
    await client.post("Product/ListProduct", { PAGE_NO: 1 });

    // Find the non-login call
    const apiCall = mockFn.mock.calls.find(([url]: [string]) =>
      url.includes("Product/ListProduct")
    );
    expect(apiCall).toBeDefined();
    const body = JSON.parse(apiCall![1].body);
    expect(body.SESSION_ID).toBe("my-session-id");
    expect(body.PAGE_NO).toBe(1);
  });

  it("should retry on session expired", async () => {
    let apiCallCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("GetAccessToken")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              Status: "200",
              Error: null,
              Data: { SESSION_ID: `sid-${apiCallCount}` },
            }),
        });
      }
      apiCallCount++;
      if (apiCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              Status: "500",
              Error: { ErrorCode: "SESSION_EXPIRED", Message: "expired" },
              Data: null,
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: "200",
            Error: null,
            Data: { success: true },
          }),
      });
    }) as unknown as typeof fetch;

    const client = new EcountClient(mockConfig);
    const result = await client.post("SaleSlip/SaveSale", { amount: 100 });

    expect(result).toEqual({ success: true });
  });

  it("should throw EcountApiError on API error", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("GetAccessToken")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              Status: "200",
              Error: null,
              Data: { SESSION_ID: "sid" },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: "500",
            Error: { ErrorCode: "INVALID_PARAM", Message: "잘못된 파라미터" },
            Data: null,
          }),
      });
    }) as unknown as typeof fetch;

    const client = new EcountClient(mockConfig);
    await expect(client.post("Product/SaveProduct", {})).rejects.toThrow("잘못된 파라미터");
  });

  it("should throw NetworkError on fetch failure", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("GetAccessToken")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              Status: "200",
              Error: null,
              Data: { SESSION_ID: "sid" },
            }),
        });
      }
      return Promise.reject(new Error("ECONNREFUSED"));
    }) as unknown as typeof fetch;

    const client = new EcountClient(mockConfig);
    await expect(client.post("Product/ListProduct")).rejects.toThrow("ECOUNT API 연결 실패");
  });

  it("should throw EcountApiError after retry also fails with API error", async () => {
    let apiCallCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("GetAccessToken")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              Status: "200",
              Error: null,
              Data: { SESSION_ID: `sid-${apiCallCount}` },
            }),
        });
      }
      apiCallCount++;
      if (apiCallCount === 1) {
        // First call: session expired
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              Status: "500",
              Error: { ErrorCode: "SESSION_EXPIRED", Message: "expired" },
              Data: null,
            }),
        });
      }
      // Retry: also fails with a real error
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: "500",
            Error: { ErrorCode: "SERVER_ERROR", Message: "서버 오류" },
            Data: null,
          }),
      });
    }) as unknown as typeof fetch;

    const client = new EcountClient(mockConfig);
    await expect(client.post("SaleSlip/SaveSale", {})).rejects.toThrow("서버 오류");
  });
});
