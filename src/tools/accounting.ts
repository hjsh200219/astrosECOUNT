import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { registerTools, type ToolDefinition } from "./tool-factory.js";

const accountingTools: ToolDefinition[] = [
  {
    name: "ecount_save_account_slip",
    description: "ECOUNT ERP 회계전표를 저장합니다. 회계 거래를 등록하거나 수정할 때 사용합니다.",
    endpoint: "AccountSlip/SaveAccountSlip",
    inputSchema: {
      AC_DATE: z.string().describe("전표일자 (YYYYMMDD)"),
      AC_CD: z.string().describe("계정과목 코드"),
      DR_AMT: z.number().optional().describe("차변 금액"),
      CR_AMT: z.number().optional().describe("대변 금액"),
      CUST_CD: z.string().optional().describe("거래처 코드"),
      REM: z.string().optional().describe("적요"),
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "ecount_list_account_slips",
    description: "ECOUNT ERP 회계전표 목록을 조회합니다. 특정 기간의 회계 거래 내역을 확인할 때 사용합니다.",
    endpoint: "AccountSlip/ListAccountSlip",
    inputSchema: {
      BASE_DATE_FROM: z.string().describe("조회 시작일 (YYYYMMDD)"),
      BASE_DATE_TO: z.string().describe("조회 종료일 (YYYYMMDD)"),
      AC_CD: z.string().optional().describe("계정과목 코드"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_view_account_slip",
    description: "ECOUNT ERP 회계전표 상세를 조회합니다. 특정 전표번호로 회계전표의 전체 정보를 확인할 때 사용합니다.",
    endpoint: "AccountSlip/ViewAccountSlip",
    inputSchema: {
      AC_NO: z.string().describe("회계전표 번호"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_list_general_ledger",
    description: "ECOUNT ERP 총계정원장을 조회합니다. 특정 기간의 계정별 거래 내역을 확인할 때 사용합니다.",
    endpoint: "AccountLedger/ListGeneralLedger",
    inputSchema: {
      BASE_DATE_FROM: z.string().describe("조회 시작일 (YYYYMMDD)"),
      BASE_DATE_TO: z.string().describe("조회 종료일 (YYYYMMDD)"),
      AC_CD: z.string().optional().describe("계정과목 코드"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_list_cash_journal",
    description: "ECOUNT ERP 현금출납장을 조회합니다. 특정 기간의 현금 입출금 내역을 확인할 때 사용합니다.",
    endpoint: "AccountLedger/ListCashJournal",
    inputSchema: {
      BASE_DATE_FROM: z.string().describe("조회 시작일 (YYYYMMDD)"),
      BASE_DATE_TO: z.string().describe("조회 종료일 (YYYYMMDD)"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_list_receivable",
    description: "ECOUNT ERP 매출채권을 조회합니다. 거래처별 미수금 현황을 확인할 때 사용합니다.",
    endpoint: "Receivable/ListReceivable",
    inputSchema: {
      BASE_DATE: z.string().describe("기준일자 (YYYYMMDD)"),
      CUST_CD: z.string().optional().describe("거래처 코드"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_list_receivable_by_slip",
    description: "ECOUNT ERP 전표별 매출채권을 조회합니다. 개별 전표 단위의 채권 상태를 확인할 때 사용합니다.",
    endpoint: "Receivable/ListReceivableBySlip",
    inputSchema: {
      BASE_DATE_FROM: z.string().describe("조회 시작일 (YYYYMMDD)"),
      BASE_DATE_TO: z.string().describe("조회 종료일 (YYYYMMDD)"),
      CUST_CD: z.string().optional().describe("거래처 코드"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_list_payable",
    description: "ECOUNT ERP 매입채무를 조회합니다. 거래처별 미지급금 현황을 확인할 때 사용합니다.",
    endpoint: "Payable/ListPayable",
    inputSchema: {
      BASE_DATE: z.string().describe("기준일자 (YYYYMMDD)"),
      CUST_CD: z.string().optional().describe("거래처 코드"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_list_payable_by_slip",
    description: "ECOUNT ERP 전표별 매입채무를 조회합니다. 개별 전표 단위의 채무 상태를 확인할 때 사용합니다.",
    endpoint: "Payable/ListPayableBySlip",
    inputSchema: {
      BASE_DATE_FROM: z.string().describe("조회 시작일 (YYYYMMDD)"),
      BASE_DATE_TO: z.string().describe("조회 종료일 (YYYYMMDD)"),
      CUST_CD: z.string().optional().describe("거래처 코드"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_list_bank_accounts",
    description: "ECOUNT ERP 은행계좌 목록을 조회합니다. 등록된 은행계좌 목록과 잔액을 확인할 때 사용합니다.",
    endpoint: "BankAccount/ListBankAccount",
    inputSchema: {
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
];

export function registerAccountingTools(server: McpServer, client: EcountClient): void {
  registerTools(server, client, accountingTools);
}
