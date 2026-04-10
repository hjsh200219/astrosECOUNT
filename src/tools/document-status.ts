import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { MS_PER_DAY } from "../utils/date-helpers.js";

export interface ShipmentDoc {
  shipmentId: string;
  blNumber: string;
  documents: string[];
  status: string;
  arrivedAt?: string;
}

export interface SaleRecord {
  id: string;
  product: string;
  customer: string;
  saleDate: string;
  delivered: boolean;
  deliveryDate?: string;
}

export interface DocumentCheckResult {
  shipmentId: string;
  blNumber: string;
  missingDocuments: string[];
  completionRate: number;
}

export interface OverdueItem {
  id: string;
  type: "delivery" | "customs";
  daysPending: number;
  detail: string;
}

export interface ProcessReport {
  documentChecks: DocumentCheckResult[];
  overdueDeliveries: OverdueItem[];
  overdueCustoms: OverdueItem[];
  totalIssues: number;
  checkedAt: string;
}

const DEFAULT_REQUIRED_DOCS = [
  "B/L",
  "Invoice",
  "Packing List",
  "Certificate of Origin",
  "Health Certificate",
];

export function checkDocuments(
  shipments: ShipmentDoc[],
  requiredDocs: string[] = DEFAULT_REQUIRED_DOCS
): DocumentCheckResult[] {
  return shipments.map((s) => {
    const missingDocuments = requiredDocs.filter((doc) => !s.documents.includes(doc));
    const completionRate = requiredDocs.length === 0 ? 1 : (requiredDocs.length - missingDocuments.length) / requiredDocs.length;
    return {
      shipmentId: s.shipmentId,
      blNumber: s.blNumber,
      missingDocuments,
      completionRate,
    };
  });
}

export function findOverdueDeliveries(
  sales: SaleRecord[],
  maxDays: number = 3
): OverdueItem[] {
  const now = Date.now();
  const results: OverdueItem[] = [];

  for (const sale of sales) {
    if (sale.delivered) continue;
    const saleMs = new Date(sale.saleDate).getTime();
    const daysPending = Math.floor((now - saleMs) / MS_PER_DAY);
    if (daysPending > maxDays) {
      results.push({
        id: sale.id,
        type: "delivery",
        daysPending,
        detail: `${sale.product} / ${sale.customer} — 판매일: ${sale.saleDate}`,
      });
    }
  }

  return results;
}

export function findOverdueCustomsClearance(
  shipments: ShipmentDoc[],
  maxDays: number = 7
): OverdueItem[] {
  const now = Date.now();
  const results: OverdueItem[] = [];

  for (const s of shipments) {
    if (s.status !== "arrived") continue;
    if (!s.arrivedAt) continue;
    const arrivedMs = new Date(s.arrivedAt).getTime();
    const daysPending = Math.floor((now - arrivedMs) / MS_PER_DAY);
    if (daysPending > maxDays) {
      results.push({
        id: s.shipmentId,
        type: "customs",
        daysPending,
        detail: `BL: ${s.blNumber} — 입항일: ${s.arrivedAt}`,
      });
    }
  }

  return results;
}

export function generateProcessReport(
  shipments: ShipmentDoc[],
  sales: SaleRecord[],
  requiredDocs: string[] = DEFAULT_REQUIRED_DOCS
): ProcessReport {
  const documentChecks = checkDocuments(shipments, requiredDocs);
  const overdueDeliveries = findOverdueDeliveries(sales);
  const overdueCustoms = findOverdueCustomsClearance(shipments);

  const shipmentsWithMissingDocs = documentChecks.filter((d) => d.missingDocuments.length > 0).length;
  const totalIssues = shipmentsWithMissingDocs + overdueDeliveries.length + overdueCustoms.length;

  return {
    documentChecks,
    overdueDeliveries,
    overdueCustoms,
    totalIssues,
    checkedAt: new Date().toISOString(),
  };
}

async function handleCheckDocumentStatus(params: Record<string, unknown>) {
  try {
    const shipments = (params.shipments as ShipmentDoc[]) ?? [];
    const sales = (params.sales as SaleRecord[]) ?? [];
    const requiredDocs = (params.required_docs as string[] | undefined) ?? DEFAULT_REQUIRED_DOCS;

    const documentChecks = checkDocuments(shipments, requiredDocs);
    const overdueDeliveries = findOverdueDeliveries(sales, (params.max_delivery_days as number) ?? 3);
    const overdueCustoms = findOverdueCustomsClearance(shipments, (params.max_customs_days as number) ?? 7);

    const shipmentsWithMissingDocs = documentChecks.filter((d) => d.missingDocuments.length > 0).length;
    const totalIssues = shipmentsWithMissingDocs + overdueDeliveries.length + overdueCustoms.length;

    return formatResponse({
      documentChecks, overdueDeliveries, overdueCustoms, totalIssues, checkedAt: new Date().toISOString(),
    } satisfies ProcessReport);
  } catch (error) {
    return handleToolError(error);
  }
}

export function registerDocumentStatusTools(server: McpServer): void {
  server.tool(
    "ecount_check_document_status",
    "L3 프로세스 모니터링 — 선적 서류 체크리스트 완료 여부 및 지연 배송/통관 감지",
    {
      shipments: z.array(z.object({
        shipmentId: z.string(), blNumber: z.string(), documents: z.array(z.string()),
        status: z.string(), arrivedAt: z.string().optional(),
      })).describe("선적 목록"),
      sales: z.array(z.object({
        id: z.string(), product: z.string(), customer: z.string(),
        saleDate: z.string(), delivered: z.boolean(), deliveryDate: z.string().optional(),
      })).optional().describe("판매 목록 (배송 지연 감지용)"),
      required_docs: z.array(z.string()).optional().describe("필수 서류 목록"),
      max_delivery_days: z.number().default(3).describe("배송 지연 기준 일수 (기본 3일)"),
      max_customs_days: z.number().default(7).describe("통관 지연 기준 일수 (기본 7일)"),
    },
    { readOnlyHint: true },
    handleCheckDocumentStatus,
  );
}
