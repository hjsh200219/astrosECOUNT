import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { listShipments } from "./shipment-tracking.js";
import { listContracts } from "./contracts.js";
import { listExchangeRates } from "./exchange-rate.js";

export interface ReportOptions {
  date?: string;
  includeShipments?: boolean;
  includeContracts?: boolean;
  includeRates?: boolean;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function generateDailyReport(options?: ReportOptions): string {
  const date = options?.date ?? today();
  const includeShipments = options?.includeShipments ?? true;
  const includeContracts = options?.includeContracts ?? true;
  const includeRates = options?.includeRates ?? true;

  const divider = "═══════════════════════════════════════";
  const lines: string[] = [];

  lines.push(divider);
  lines.push(`📋 일일 업무 리포트 — ${date}`);
  lines.push(divider);

  if (includeShipments) {
    const shipments = listShipments();
    const total = shipments.length;
    const inTransit = shipments.filter(
      (s) => s.status === "booked" || s.status === "departed" || s.status === "in_transit" || s.status === "arrived"
    ).length;
    const customs = shipments.filter(
      (s) => s.status === "customs" || s.status === "cleared"
    ).length;
    const delivered = shipments.filter((s) => s.status === "delivered").length;

    lines.push("");
    lines.push(`▶ 선적 현황 (${total}건)`);
    lines.push(`  - 운송 중: ${inTransit}건`);
    lines.push(`  - 통관 중: ${customs}건`);
    lines.push(`  - 배달 완료: ${delivered}건`);
  }

  if (includeContracts) {
    const contracts = listContracts();
    const total = contracts.length;
    const active = contracts.filter(
      (c) => c.status === "draft" || c.status === "signed" || c.status === "active"
    ).length;
    const completed = contracts.filter((c) => c.status === "completed").length;

    lines.push("");
    lines.push(`▶ 계약 현황 (${total}건)`);
    lines.push(`  - 진행 중: ${active}건`);
    lines.push(`  - 완료: ${completed}건`);
  }

  if (includeRates) {
    const rates = listExchangeRates();
    lines.push("");
    lines.push("▶ 환율 정보");
    for (const r of rates) {
      lines.push(`  - ${r.currency}: ${r.rate}원 (${r.date})`);
    }
  }

  lines.push("");
  lines.push(divider);

  return lines.join("\n");
}

export function registerDailyReportTools(server: McpServer): void {
  server.tool(
    "ecount_daily_report",
    "현재 선적/계약/환율 데이터를 종합한 일일 업무 리포트를 텍스트로 생성합니다.",
    {
      date: z.string().optional().describe("리포트 날짜 (기본: 오늘, YYYY-MM-DD)"),
      include_shipments: z.boolean().default(true),
      include_contracts: z.boolean().default(true),
      include_rates: z.boolean().default(true),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const report = generateDailyReport({
          date: params.date as string | undefined,
          includeShipments: params.include_shipments as boolean,
          includeContracts: params.include_contracts as boolean,
          includeRates: params.include_rates as boolean,
        });
        return formatResponse({ report });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
