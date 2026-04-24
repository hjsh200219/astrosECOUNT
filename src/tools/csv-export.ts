import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface CsvOptions {
  delimiter?: string;
  includeHeader?: boolean;
  columns?: string[];
}

function escapeValue(value: unknown, delimiter: string): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  // Wrap in double quotes if value contains delimiter, double-quote, or newline
  if (str.includes(delimiter) || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function toCsv(data: Record<string, unknown>[], options?: CsvOptions): string {
  const delimiter = options?.delimiter ?? ",";
  const includeHeader = options?.includeHeader ?? true;

  // Determine columns
  let columns: string[];
  if (options?.columns && options.columns.length > 0) {
    columns = options.columns;
  } else if (data.length > 0) {
    columns = Object.keys(data[0]);
  } else {
    // No data, no explicit columns
    return includeHeader ? "" : "";
  }

  const lines: string[] = [];

  if (includeHeader) {
    lines.push(columns.join(delimiter));
  }

  for (const row of data) {
    const values = columns.map((col) => escapeValue(row[col], delimiter));
    lines.push(values.join(delimiter));
  }

  return lines.join("\n");
}

export function registerCsvExportTools(server: McpServer): void {
  server.tool(
    "ecount_csv_export_csv",
    "조회 결과를 CSV 형식 텍스트로 변환합니다. 재고, 선적, 계약 등 데이터를 엑셀에서 활용할 수 있는 CSV로 출력합니다.",
    {
      data: z.array(z.record(z.string(), z.unknown())),
      delimiter: z.string().default(",").describe("기본: 쉼표"),
      columns: z.array(z.string()).optional().describe("미지정 시 전체"),
      include_header: z.boolean().default(true),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const data = params.data as Record<string, unknown>[];
        const csvString = toCsv(data, {
          delimiter: params.delimiter as string,
          includeHeader: params.include_header as boolean,
          columns: params.columns as string[] | undefined,
        });
        return formatResponse({ csv: csvString, rowCount: data.length });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
