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
}
