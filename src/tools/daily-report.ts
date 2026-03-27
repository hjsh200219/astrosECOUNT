import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { listShipments } from "./shipment-tracking.js";
import { listContracts } from "./contracts.js";
import { listExchangeRates } from "./exchange-rate.js";
import { listStaleShipments } from "./stale-shipments.js";

export interface ReportOptions {
  date?: string;
  includeShipments?: boolean;
  includeContracts?: boolean;
  includeRates?: boolean;
  includeDiagnostics?: boolean;
}

export interface DiagnosticItem {
  level: "L1" | "L2" | "L3";
  category: string;
  status: "pass" | "warning" | "fail";
  message: string;
}

export interface DiagnosticReport {
  date: string;
  diagnostics: DiagnosticItem[];
  passCount: number;
  warningCount: number;
  failCount: number;
  overallHealth: "healthy" | "attention" | "critical";
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

export function generateDiagnosticReport(date?: string): DiagnosticReport {
  const reportDate = date ?? today();
  const diagnostics: DiagnosticItem[] = [];

  // L1 — Infrastructure
  const rates = listExchangeRates();
  diagnostics.push({
    level: "L1",
    category: "exchange_rates",
    status: rates.length >= 1 ? "pass" : "warning",
    message: rates.length >= 1
      ? `환율 데이터 ${rates.length}개 정상 로드`
      : "환율 데이터 없음",
  });

  const shipments = listShipments();
  diagnostics.push({
    level: "L1",
    category: "shipments",
    status: shipments.length >= 1 ? "pass" : "warning",
    message: shipments.length >= 1
      ? `선적 데이터 ${shipments.length}건 존재`
      : "선적 데이터 없음",
  });

  // L2 — Data
  const stale = listStaleShipments(7);
  diagnostics.push({
    level: "L2",
    category: "stale_shipments",
    status: stale.length === 0 ? "pass" : "warning",
    message: stale.length === 0
      ? "7일 이상 미갱신 선적 없음"
      : `7일 이상 미갱신 선적 ${stale.length}건`,
  });

  const todayStr = today();
  const staleRates = rates.filter((r) => r.date !== todayStr);
  diagnostics.push({
    level: "L2",
    category: "exchange_rate_freshness",
    status: staleRates.length === 0 ? "pass" : "warning",
    message: staleRates.length === 0
      ? "모든 환율 데이터가 오늘 날짜"
      : `오래된 환율 데이터 ${staleRates.length}개`,
  });

  // L3 — Process
  const customsStuck = shipments.filter(
    (s) => s.status === "customs" && daysSince(s.updatedAt) > 7
  );
  diagnostics.push({
    level: "L3",
    category: "customs_stuck",
    status: customsStuck.length === 0 ? "pass" : "fail",
    message: customsStuck.length === 0
      ? "통관 7일 초과 선적 없음"
      : `통관 7일 초과 선적 ${customsStuck.length}건 — 즉시 확인 필요`,
  });

  const arrivedStuck = shipments.filter(
    (s) => s.status === "arrived" && daysSince(s.updatedAt) > 3
  );
  diagnostics.push({
    level: "L3",
    category: "arrived_stuck",
    status: arrivedStuck.length === 0 ? "pass" : "warning",
    message: arrivedStuck.length === 0
      ? "입항 후 3일 초과 미통관 선적 없음"
      : `입항 후 3일 초과 미통관 선적 ${arrivedStuck.length}건`,
  });

  const passCount = diagnostics.filter((d) => d.status === "pass").length;
  const warningCount = diagnostics.filter((d) => d.status === "warning").length;
  const failCount = diagnostics.filter((d) => d.status === "fail").length;

  const overallHealth: DiagnosticReport["overallHealth"] =
    failCount > 0 ? "critical" : warningCount > 0 ? "attention" : "healthy";

  return { date: reportDate, diagnostics, passCount, warningCount, failCount, overallHealth };
}

export function generateDailyReport(options?: ReportOptions): string {
  const date = options?.date ?? today();
  const includeShipments = options?.includeShipments ?? true;
  const includeContracts = options?.includeContracts ?? true;
  const includeRates = options?.includeRates ?? true;
  const includeDiagnostics = options?.includeDiagnostics ?? true;

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

  if (includeDiagnostics) {
    const diagReport = generateDiagnosticReport(date);
    lines.push("");
    lines.push(`▶ 자가진단 결과 (${diagReport.overallHealth})`);
    for (const item of diagReport.diagnostics) {
      const icon = item.status === "pass" ? "✅" : item.status === "warning" ? "⚠️" : "❌";
      lines.push(`  [${item.level}] ${icon} ${item.message}`);
    }
    lines.push(`  총 ${diagReport.passCount}pass / ${diagReport.warningCount}warning / ${diagReport.failCount}fail`);
  }

  lines.push("");
  lines.push(divider);

  return lines.join("\n");
}

export function registerDailyReportTools(server: McpServer): void {
  server.tool(
    "ecount_diagnostic_report",
    "L1~L3 자가진단 리포트를 생성합니다. 인프라/데이터/프로세스 상태를 점검합니다.",
    {
      date: z.string().optional().describe("진단 날짜 (기본: 오늘, YYYY-MM-DD)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const report = generateDiagnosticReport(params.date as string | undefined);
        return formatResponse(report);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

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
