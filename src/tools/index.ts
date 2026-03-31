import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import type { EcountConfig } from "../config.js";
import { registerConnectionTools } from "./connection.js";
import { registerMasterDataTools } from "./master-data.js";
import { registerSalesTools } from "./sales.js";
import { registerPurchaseTools } from "./purchase.js";
import { registerInventoryTools } from "./inventory.js";
import { registerProductionTools } from "./production.js";
import { registerAccountingTools } from "./accounting.js";
import { registerOtherTools } from "./other.js";
import { registerBoardTools } from "./board.js";
import { registerBLParserTool } from "./bl-parser.js";
import { registerContactTools } from "./contacts.js";
import { registerBusinessRuleTools } from "./business-rules.js";
import { registerPdfStampTool } from "./pdf-stamp.js";
import { registerEmailTemplateTools } from "./email-templates.js";
import { registerExchangeRateTools } from "./exchange-rate.js";
import { registerShipmentTrackingTools } from "./shipment-tracking.js";
import { registerLogisticsKpiTools } from "./logistics-kpi.js";
import { registerContractTools } from "./contracts.js";
import { registerInternalApiTools } from "./internal-api.js";
import { registerInventoryVerifyTools } from "./inventory-verify.js";
import { registerStaleShipmentTools } from "./stale-shipments.js";
import { registerCsvExportTools } from "./csv-export.js";
import { registerDailyReportTools } from "./daily-report.js";
import { registerHealthCheckTools } from "./health-check.js";
import { registerDataIntegrityTools } from "./data-integrity.js";
import { registerDocumentStatusTools } from "./document-status.js";
import { registerAdjustInventoryTools } from "./adjust-inventory.js";
import { registerCustomsCostTools } from "./customs-cost.js";
import { registerReceivablesTools } from "./receivables.js";
import { registerPayablesTools } from "./payables.js";
import { registerWeightSettlementTools } from "./weight-settlement.js";
import { registerInventoryLifecycleTools } from "./inventory-lifecycle.js";
import { registerFinancialStatementsTools } from "./financial-statements.js";
import { registerMarginAnalysisTools } from "./margin-analysis.js";

export function registerAllTools(server: McpServer, client: EcountClient, config: EcountConfig): void {
  registerConnectionTools(server, client, config);
  registerMasterDataTools(server, client);
  registerSalesTools(server, client);
  registerPurchaseTools(server, client);
  registerInventoryTools(server, client);
  registerProductionTools(server, client);
  registerAccountingTools(server, client);
  registerOtherTools(server, client);
  registerBoardTools(server, client);
  // Category B tools (no EcountClient dependency)
  registerBLParserTool(server);
  registerContactTools(server);
  registerBusinessRuleTools(server);
  registerPdfStampTool(server);
  registerEmailTemplateTools(server);
  registerExchangeRateTools(server);
  registerShipmentTrackingTools(server);
  registerLogisticsKpiTools(server);
  registerContractTools(server);
  // Category B+ tools (additional utilities)
  registerInventoryVerifyTools(server);
  registerStaleShipmentTools(server);
  registerCsvExportTools(server);
  registerDailyReportTools(server);
  // Category B+ tools (v3 coverage gap)
  registerHealthCheckTools(server);
  registerDataIntegrityTools(server);
  registerDocumentStatusTools(server);
  registerAdjustInventoryTools(server);
  registerCustomsCostTools(server);
  // Category B+ tools (v5 feature expansion — leaf layer)
  registerReceivablesTools(server);
  registerPayablesTools(server);
  registerWeightSettlementTools(server);
  registerInventoryLifecycleTools(server);
  // Category B+ tools (v5 feature expansion — aggregation layer)
  registerFinancialStatementsTools(server);
  registerMarginAnalysisTools(server);
  // Category B tools (EcountClient dependency - internal API)
  registerInternalApiTools(server, client);
}
