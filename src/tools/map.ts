import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { buildHtmlDocument } from "../utils/html-builder.js";
import { buildMapScript } from "../utils/map-renderer.js";
import type { MapMarker, MapRoute } from "../utils/map-renderer.js";

const MAP_TYPES = [
  "shipment_route",
  "customer_distribution",
  "logistics_hub",
  "custom",
] as const;

export function generateMapHtml(
  markers: MapMarker[],
  routes: MapRoute[],
  center?: { lat: number; lng: number },
  zoom?: number,
  title?: string,
  language: "ko" | "en" = "ko",
): string {
  const body = buildMapScript({ center, zoom, markers, routes });
  return buildHtmlDocument({
    title: title ?? (language === "ko" ? "지도" : "Map"),
    language,
    body,
    cdnLibs: ["leaflet"],
    extraStyles: "#map { min-height: 400px; }",
  });
}

const markerSchema = z.object({
  lat: z.number().describe("위도"),
  lng: z.number().describe("경도"),
  label: z.string(),
  popup: z.string().optional(),
  size: z.number().optional().describe("기본 6"),
});

const routeSchema = z.object({
  points: z
    .array(z.object({ lat: z.number(), lng: z.number() }))
    .describe("경로 좌표 배열"),
  color: z.string().optional(),
  label: z.string().optional(),
});

export function registerMapTools(server: McpServer): void {
  server.tool(
    "ecount_map_render_map",
    "Leaflet 기반 인터랙티브 지도를 생성합니다. 선적 경로, 거래처 분포, 물류 허브를 시각화합니다.",
    {
      mapType: z.enum(MAP_TYPES),
      markers: z.array(markerSchema).optional().default([]),
      routes: z.array(routeSchema).optional().default([]),
      center: z
        .object({ lat: z.number(), lng: z.number() })
        .optional(),
      zoom: z.number().optional().describe("기본 5"),
      title: z.string().optional(),
      language: z.enum(["ko", "en"]).optional().default("ko"),
    },
    { readOnlyHint: true },
    async (args) => {
      try {
        const html = generateMapHtml(
          args.markers as MapMarker[],
          args.routes as MapRoute[],
          args.center as { lat: number; lng: number } | undefined,
          args.zoom,
          args.title,
          args.language as "ko" | "en",
        );
        return formatResponse({ html });
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
