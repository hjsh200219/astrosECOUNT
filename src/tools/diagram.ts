import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { buildHtmlDocument } from "../utils/html-builder.js";
import {
  buildWorkflowDiagram,
  buildStateDiagram,
  buildSequenceDiagram,
  buildErDiagram,
  buildGanttDiagram,
  wrapMermaidHtml,
} from "../utils/mermaid-renderer.js";
import type {
  WorkflowStage,
  StateTransition,
  SequenceMessage,
  GanttTask,
  ErEntity,
  ErRelation,
} from "../utils/mermaid-renderer.js";

const DIAGRAM_TYPES = [
  "workflow",
  "state_diagram",
  "sequence",
  "er_diagram",
  "gantt",
  "custom",
] as const;

function buildDiagramDefinition(
  diagramType: string,
  data: Record<string, unknown>,
): string {
  switch (diagramType) {
    case "workflow":
      return buildWorkflowDiagram(
        (data.stages ?? []) as WorkflowStage[],
      );
    case "state_diagram":
      return buildStateDiagram(
        (data.states ?? []) as string[],
        (data.transitions ?? []) as StateTransition[],
      );
    case "sequence":
      return buildSequenceDiagram(
        (data.participants ?? []) as string[],
        (data.messages ?? []) as SequenceMessage[],
      );
    case "er_diagram":
      return buildErDiagram(
        (data.entities ?? []) as ErEntity[],
        (data.relations ?? []) as ErRelation[],
      );
    case "gantt":
      return buildGanttDiagram((data.tasks ?? []) as GanttTask[]);
    case "custom":
      return String(data.definition ?? "");
    default:
      return "";
  }
}

export function generateDiagramHtml(
  diagramType: string,
  data: Record<string, unknown>,
  title?: string,
  language: "ko" | "en" = "ko",
): string {
  const definition = buildDiagramDefinition(diagramType, data);
  const body = wrapMermaidHtml(definition);
  const mermaidInit =
    '<script>mermaid.initialize({startOnLoad:true,theme:"neutral"});</script>';

  return buildHtmlDocument({
    title: title ?? (language === "ko" ? "다이어그램" : "Diagram"),
    language,
    body,
    cdnLibs: ["mermaid"],
    extraScripts: mermaidInit,
  });
}

export function registerDiagramTools(server: McpServer): void {
  server.tool(
    "ecount_diagram_render_diagram",
    "Mermaid 기반 다이어그램을 생성합니다. 업무 흐름도, 상태 전환도, 시퀀스 다이어그램, ER 다이어그램, 간트 차트를 지원합니다.",
    {
      diagramType: z
        .enum(DIAGRAM_TYPES),
      data: z
        .record(z.string(), z.unknown())
        .describe("다이어그램 데이터 (유형별 구조 상이)"),
      title: z.string().optional(),
      language: z
        .enum(["ko", "en"])
        .optional()
        .default("ko"),
    },
    { readOnlyHint: true },
    async (args) => {
      try {
        const html = generateDiagramHtml(
          args.diagramType,
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
