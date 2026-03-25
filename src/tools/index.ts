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
  // Category B tools (EcountClient dependency - internal API)
  registerInternalApiTools(server, client);
}
