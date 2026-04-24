import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface Contact {
  name: string;
  company: string;
  role: string;
  email?: string;
  phone?: string;
  department?: string;
  notes?: string;
}

// v3.0 구성안 기준 13명 담당자 매핑
const CONTACTS: Contact[] = [
  // 아스트로스 (5명)
  { name: "이호진", company: "아스트로스", role: "대표", department: "경영", email: "hojin.lee@astros.co.kr", phone: "02-3456-7890", notes: "총괄" },
  { name: "김영미", company: "아스트로스", role: "경리", department: "회계", email: "youngmi.kim@astros.co.kr", phone: "02-3456-7891", notes: "매입/매출 관리" },
  { name: "박준혁", company: "아스트로스", role: "물류담당", department: "물류", email: "junhyuk.park@astros.co.kr", phone: "02-3456-7892", notes: "선적/통관 관리" },
  { name: "최서연", company: "아스트로스", role: "영업", department: "영업", email: "seoyeon.choi@astros.co.kr", phone: "02-3456-7893", notes: "판매처 관리" },
  { name: "정민우", company: "아스트로스", role: "구매", department: "구매", email: "minwoo.jung@astros.co.kr", phone: "02-3456-7894", notes: "발주/수입 관리" },
  // 삼현INT (2명)
  { name: "김민수", company: "삼현INT", role: "과장", department: "수입대행", email: "minsu.kim@samhyun-int.co.kr", phone: "02-5678-1001", notes: "수입대행 메인 담당" },
  { name: "이지은", company: "삼현INT", role: "대리", department: "수입대행", email: "jieun.lee@samhyun-int.co.kr", phone: "02-5678-1002", notes: "서류 처리" },
  // 정운관세법인 (3명)
  { name: "박태호", company: "정운관세법인", role: "관세사", department: "통관", email: "taeho.park@jungwoon.co.kr", phone: "02-7890-2001", notes: "통관 총괄" },
  { name: "한수진", company: "정운관세법인", role: "관세사", department: "통관", email: "sujin.han@jungwoon.co.kr", phone: "02-7890-2002", notes: "일반 통관" },
  { name: "오재현", company: "정운관세법인", role: "팀장", department: "통관", email: "jaehyun.oh@jungwoon.co.kr", phone: "02-7890-2003", notes: "서류 검토" },
  // 원스탑관세법인 (1명)
  { name: "강동훈", company: "원스탑관세법인", role: "관세사", department: "통관", email: "donghun.kang@onestop-customs.co.kr", phone: "02-4321-3001", notes: "전지벌크 전담" },
  // 디케이통상 (1명)
  { name: "송재호", company: "디케이통상", role: "부장", department: "영업", email: "jaeho.song@dktrade.co.kr", phone: "02-9876-4001", notes: "브라질 공급사 연락 창구" },
  // 기타
  { name: "Maria Silva", company: "BRF S.A.", role: "Export Manager", department: "Export", email: "maria.silva@bfrsa.com", phone: "+55-11-9876-5432", notes: "브라질 수출 담당 (포르투갈어)" },
];

export function lookupContact(name: string): Contact | null {
  const found = CONTACTS.find(
    (c) => c.name === name || c.name.toLowerCase() === name.toLowerCase()
  );
  return found ?? null;
}

export function listContacts(filter: {
  company?: string;
  role?: string;
}): Contact[] {
  let results = [...CONTACTS];

  if (filter.company) {
    results = results.filter((c) => c.company === filter.company);
  }

  if (filter.role) {
    results = results.filter((c) => c.role === filter.role);
  }

  return results;
}

export function registerContactTools(server: McpServer): void {
  server.tool(
    "ecount_contact_lookup_contact",
    "담당자 이름으로 연락처/역할/소속 정보를 조회합니다. 아스트로스, 삼현INT, 정운관세법인, 원스탑, 디케이통상, BRF 등 13명의 담당자를 지원합니다.",
    {
      name: z.string().describe("담당자 이름 (예: 김민수, Maria Silva)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = lookupContact(params.name as string);
        if (!result) {
          return formatResponse({ found: false, message: `담당자 '${params.name}'을(를) 찾을 수 없습니다.` });
        }
        return formatResponse({ found: true, contact: result });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_contact_list_contacts",
    "담당자 목록을 조회합니다. 회사명 또는 역할로 필터링할 수 있습니다.",
    {
      company: z.string().optional().describe("회사명 필터 (예: 삼현INT, 정운관세법인)"),
      role: z.string().optional().describe("역할 필터 (예: 관세사, 과장)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const results = listContacts({
          company: params.company as string | undefined,
          role: params.role as string | undefined,
        });
        return formatResponse({ count: results.length, contacts: results });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
