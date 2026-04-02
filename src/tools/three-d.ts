import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { buildHtmlDocument } from "../utils/html-builder.js";
import {
  buildWarehouseScene,
  buildLogisticsNetworkScene,
} from "../utils/three-d-renderer.js";
import type {
  WarehouseZone,
  NetworkNode,
  NetworkEdge,
} from "../utils/three-d-renderer.js";

const SCENE_TYPES = ["warehouse", "logistics_network", "custom"] as const;

function buildSceneBody(
  sceneType: string,
  data: Record<string, unknown>,
): string {
  switch (sceneType) {
    case "warehouse":
      return buildWarehouseScene(
        (data.zones ?? []) as WarehouseZone[],
      );
    case "logistics_network":
      return buildLogisticsNetworkScene(
        (data.nodes ?? []) as NetworkNode[],
        (data.edges ?? []) as NetworkEdge[],
      );
    default:
      return '<div class="section"><p>custom sceneType: data를 직접 전달하세요</p></div>';
  }
}

export function generate3dHtml(
  sceneType: string,
  data: Record<string, unknown>,
  title?: string,
  language: "ko" | "en" = "ko",
): string {
  const body = buildSceneBody(sceneType, data);
  return buildHtmlDocument({
    title: title ?? (language === "ko" ? "3D 시각화" : "3D Visualization"),
    language,
    body,
  });
}

export function register3dTools(server: McpServer): void {
  server.tool(
    "ecount_render_3d",
    "Three.js 기반 3D 시각화를 생성합니다. 창고 적재 현황, 물류 네트워크를 3D로 표현합니다.",
    {
      sceneType: z.enum(SCENE_TYPES).describe("3D 장면 유형"),
      data: z
        .record(z.string(), z.unknown())
        .describe("장면 데이터 (유형별 구조 상이)"),
      title: z.string().optional().describe("시각화 제목"),
      language: z
        .enum(["ko", "en"])
        .optional()
        .default("ko")
        .describe("언어 설정"),
    },
    { readOnlyHint: true },
    async (args) => {
      try {
        const html = generate3dHtml(
          args.sceneType,
          args.data,
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
