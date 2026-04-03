import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { getCargoTracking, getContainerInfo, getArrivalReport } from "../services/unipass/cargo-tracking.js";
import { searchHsCode } from "../services/unipass/hs-code.js";
import { getTariffRate } from "../services/unipass/tariff.js";
import { verifyImportDeclaration } from "../services/unipass/declaration.js";
import { getInspectionResults } from "../services/unipass/inspection.js";
import { getTaxPaymentStatus } from "../services/unipass/tax-payment.js";
import { searchCompany, searchBroker } from "../services/unipass/directory.js";
import { getBondedAreaPeriod } from "../services/unipass/bonded-area.js";
import { getAnimalPlantCompany } from "../services/unipass/animal-plant.js";
import { fetchCustomsExchangeRates } from "../services/unipass/customs-rate.js";

export function registerUnipassTools(server: McpServer): void {
  // 1. Cargo Tracking (API001)
  server.tool(
    "unipass_cargo_tracking",
    "UNI-PASS 화물 통관 진행정보를 B/L 번호로 조회합니다.",
    {
      blNumber: z.string().describe("마스터 B/L 번호"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const items = await getCargoTracking(params.blNumber as string);
        if (items.length === 0) {
          return formatResponse({ found: false, message: `B/L '${params.blNumber}'에 대한 통관 진행정보가 없습니다.` });
        }
        return formatResponse({ found: true, count: items.length, items });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // 2. Container Info (API020)
  server.tool(
    "unipass_container_info",
    "UNI-PASS 컨테이너 정보를 B/L 번호로 조회합니다.",
    {
      blNumber: z.string().describe("마스터 B/L 번호"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const items = await getContainerInfo(params.blNumber as string);
        if (items.length === 0) {
          return formatResponse({ found: false, message: `B/L '${params.blNumber}'에 대한 컨테이너 정보가 없습니다.` });
        }
        return formatResponse({ found: true, count: items.length, items });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // 3. Arrival Report (API021)
  server.tool(
    "unipass_arrival_report",
    "UNI-PASS 입항적하목록 정보를 B/L 번호로 조회합니다.",
    {
      blNumber: z.string().describe("마스터 B/L 번호"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const items = await getArrivalReport(params.blNumber as string);
        if (items.length === 0) {
          return formatResponse({ found: false, message: `B/L '${params.blNumber}'에 대한 입항적하목록 정보가 없습니다.` });
        }
        return formatResponse({ found: true, count: items.length, items });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // 4. Search HS Code (API018)
  server.tool(
    "unipass_search_hs_code",
    "UNI-PASS HS 코드(품목분류)를 조회합니다.",
    {
      hsCode: z.string().describe("HS 코드 (예: 0101, 010121)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const items = await searchHsCode(params.hsCode as string);
        if (items.length === 0) {
          return formatResponse({ found: false, message: `HS 코드 '${params.hsCode}'에 대한 결과가 없습니다.` });
        }
        return formatResponse({ found: true, count: items.length, items });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // 5. Get Tariff Rate (API030)
  server.tool(
    "unipass_get_tariff_rate",
    "UNI-PASS HS 코드별 세율 정보를 조회합니다.",
    {
      hsCode: z.string().describe("HS 코드 (예: 0101210000)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const item = await getTariffRate(params.hsCode as string);
        if (!item) {
          return formatResponse({ found: false, message: `HS 코드 '${params.hsCode}'에 대한 세율 정보가 없습니다.` });
        }
        return formatResponse({ found: true, tariffRate: item });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // 6. Verify Import Declaration (API022)
  server.tool(
    "unipass_verify_declaration",
    "UNI-PASS 수입신고 건을 신고번호로 검증합니다.",
    {
      declarationNo: z.string().describe("수입신고번호"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const item = await verifyImportDeclaration(params.declarationNo as string);
        if (!item) {
          return formatResponse({ found: false, message: `신고번호 '${params.declarationNo}'에 대한 수입신고 정보가 없습니다.` });
        }
        return formatResponse({ found: true, declaration: item });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // 7. Inspection Results (API004)
  server.tool(
    "unipass_inspection_results",
    "UNI-PASS 검사/검역 결과를 B/L 번호로 조회합니다.",
    {
      blNumber: z.string().describe("마스터 B/L 번호"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const items = await getInspectionResults(params.blNumber as string);
        if (items.length === 0) {
          return formatResponse({ found: false, message: `B/L '${params.blNumber}'에 대한 검사/검역 결과가 없습니다.` });
        }
        return formatResponse({ found: true, count: items.length, items });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // 8. Tax Payment Status (API049)
  server.tool(
    "unipass_tax_payment_status",
    "UNI-PASS 세금납부 현황을 신고번호로 조회합니다.",
    {
      declarationNo: z.string().describe("수입신고번호"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const items = await getTaxPaymentStatus(params.declarationNo as string);
        if (items.length === 0) {
          return formatResponse({ found: false, message: `신고번호 '${params.declarationNo}'에 대한 세금납부 정보가 없습니다.` });
        }
        return formatResponse({ found: true, count: items.length, items });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // 9. Search Company (API010)
  server.tool(
    "unipass_search_company",
    "UNI-PASS 업체(무역상호) 정보를 검색합니다.",
    {
      query: z.string().describe("업체명/무역상호 검색어"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const items = await searchCompany(params.query as string);
        if (items.length === 0) {
          return formatResponse({ found: false, message: `'${params.query}'에 대한 업체 정보가 없습니다.` });
        }
        return formatResponse({ found: true, count: items.length, items });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // 10. Search Broker (API013)
  server.tool(
    "unipass_search_broker",
    "UNI-PASS 관세사 정보를 검색합니다.",
    {
      query: z.string().describe("관세사명 검색어"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const items = await searchBroker(params.query as string);
        if (items.length === 0) {
          return formatResponse({ found: false, message: `'${params.query}'에 대한 관세사 정보가 없습니다.` });
        }
        return formatResponse({ found: true, count: items.length, items });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // 11. Bonded Area Period (API047)
  server.tool(
    "unipass_bonded_area_period",
    "UNI-PASS 보세구역 장치기간을 화물관리번호로 조회합니다.",
    {
      cargoManagementNo: z.string().describe("화물관리번호"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const items = await getBondedAreaPeriod(params.cargoManagementNo as string);
        if (items.length === 0) {
          return formatResponse({ found: false, message: `화물관리번호 '${params.cargoManagementNo}'에 대한 보세구역 장치기간 정보가 없습니다.` });
        }
        return formatResponse({ found: true, count: items.length, items });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // 12. Animal/Plant Quarantine Company (API033)
  server.tool(
    "unipass_animal_plant_company",
    "UNI-PASS 동식물검역 업체 정보를 조회합니다.",
    {
      companyName: z.string().describe("업체명"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const items = await getAnimalPlantCompany(params.companyName as string);
        if (items.length === 0) {
          return formatResponse({ found: false, message: `'${params.companyName}'에 대한 동식물검역 업체 정보가 없습니다.` });
        }
        return formatResponse({ found: true, count: items.length, items });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // 13. Customs Exchange Rates (API012)
  server.tool(
    "unipass_customs_exchange_rates",
    "UNI-PASS 관세환율을 조회합니다. 통화 코드를 지정하지 않으면 USD, EUR, JPY를 반환합니다.",
    {
      currencies: z.array(z.string()).optional().describe("조회할 통화 코드 배열 (예: [\"USD\", \"EUR\"])"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const currencies = params.currencies as string[] | undefined;
        const items = await fetchCustomsExchangeRates(currencies);
        if (items.length === 0) {
          return formatResponse({ found: false, message: "관세환율 정보를 가져올 수 없습니다." });
        }
        return formatResponse({ found: true, count: items.length, items });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
