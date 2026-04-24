import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface EmailTemplate {
  id: string;
  name: string;
  language: "ko" | "en" | "pt";
  category: "shipping" | "contract" | "docs" | "customs" | "alert" | "delivery" | "schedule";
  to: string;
  subject: string;
  body: string;
  variables: string[];
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  // --- SHIPPING ---
  {
    id: "TPL-SHIP-01",
    name: "선적서류 전달 (삼현INT → 정운관세법인)",
    language: "ko",
    category: "shipping",
    to: "정운관세법인 담당자",
    subject: "[선적서류] {{PRODUCT_NAME}} B/L번호 {{BL_NUMBER}} 서류 전달",
    body: `안녕하세요, 삼현INT입니다.\n{{PRODUCT_NAME}} 건 선적서류(B/L: {{BL_NUMBER}}, Invoice, Packing List)를 첨부하여 전달드립니다.\n통관 진행 부탁드립니다.`,
    variables: ["PRODUCT_NAME", "BL_NUMBER"],
  },
  {
    id: "TPL-SHIP-02",
    name: "선적서류 전달 (삼현INT 내부)",
    language: "ko",
    category: "shipping",
    to: "삼현INT 내부 담당자",
    subject: "[내부공유] {{PRODUCT_NAME}} 선적서류 수신 확인 - B/L {{BL_NUMBER}}",
    body: `{{PRODUCT_NAME}} 건 선적서류가 수신되었습니다(B/L: {{BL_NUMBER}}, 선적일: {{SHIP_DATE}}).\n관련 담당자는 서류를 확인하고 후속 절차를 진행해 주시기 바랍니다.\n문의사항은 물류담당자에게 연락해 주세요.`,
    variables: ["PRODUCT_NAME", "BL_NUMBER", "SHIP_DATE"],
  },
  // --- CONTRACT ---
  {
    id: "TPL-CONTRACT-01",
    name: "계약서 직인 회신",
    language: "en",
    category: "contract",
    to: "BRF Export Manager",
    subject: "Re: Contract for {{PRODUCT_NAME}} - Signed Copy Attached",
    body: `Dear {{RECIPIENT_NAME}},\nPlease find attached the signed contract for {{PRODUCT_NAME}} (Contract No. {{CONTRACT_NO}}).\nKindly confirm receipt and return a countersigned copy at your earliest convenience.`,
    variables: ["PRODUCT_NAME", "RECIPIENT_NAME", "CONTRACT_NO"],
  },
  {
    id: "TPL-CONTRACT-02",
    name: "계약 확인",
    language: "en",
    category: "contract",
    to: "BRF Export Manager",
    subject: "Contract Confirmation - {{PRODUCT_NAME}} / {{CONTRACT_NO}}",
    body: `Dear {{RECIPIENT_NAME}},\nWe hereby confirm the contract for {{PRODUCT_NAME}} (Contract No. {{CONTRACT_NO}}, Quantity: {{QUANTITY}} MT, Price: {{PRICE}} USD/MT).\nPlease acknowledge this confirmation by return email.`,
    variables: ["PRODUCT_NAME", "RECIPIENT_NAME", "CONTRACT_NO", "QUANTITY", "PRICE"],
  },
  // --- DOCS ---
  {
    id: "TPL-DOCS-01",
    name: "원본서류 요청 (BRF)",
    language: "pt",
    category: "docs",
    to: "BRF 수출 담당자",
    subject: "Solicitação de Documentos Originais - B/L {{BL_NUMBER}}",
    body: `Prezado(a) {{RECIPIENT_NAME}},\nSolicitamos o envio dos documentos originais referentes ao embarque {{BL_NUMBER}} ({{PRODUCT_NAME}}).\nPor favor, envie os originais via courier para o endereço indicado o mais breve possível.`,
    variables: ["BL_NUMBER", "PRODUCT_NAME", "RECIPIENT_NAME"],
  },
  {
    id: "TPL-DOCS-02",
    name: "원본서류 수신 확인 (BRF)",
    language: "pt",
    category: "docs",
    to: "BRF 수출 담당자",
    subject: "Confirmação de Recebimento de Documentos - B/L {{BL_NUMBER}}",
    body: `Prezado(a) {{RECIPIENT_NAME}},\nConfirmamos o recebimento dos documentos originais do embarque {{BL_NUMBER}} em {{RECEIVED_DATE}}.\nDaremos andamento ao processo de desembaraço aduaneiro imediatamente.`,
    variables: ["BL_NUMBER", "RECIPIENT_NAME", "RECEIVED_DATE"],
  },
  {
    id: "TPL-DOCS-03",
    name: "서류 전달 안내 (삼현INT)",
    language: "ko",
    category: "docs",
    to: "삼현INT 담당자",
    subject: "[서류전달] {{PRODUCT_NAME}} 관련 서류 송부",
    body: `안녕하세요.\n{{PRODUCT_NAME}} 건 관련 서류({{DOC_LIST}})를 첨부하여 전달드립니다.\n내용 확인 후 이상 있으시면 연락 부탁드립니다.`,
    variables: ["PRODUCT_NAME", "DOC_LIST"],
  },
  {
    id: "TPL-DOCS-04",
    name: "서류 도착 확인 (관세법인)",
    language: "ko",
    category: "docs",
    to: "정운관세법인 / 원스탑관세법인 담당자",
    subject: "[수신확인] {{PRODUCT_NAME}} 서류 도착 확인 - {{BL_NUMBER}}",
    body: `안녕하세요.\n{{PRODUCT_NAME}} 건(B/L: {{BL_NUMBER}}) 서류가 {{RECEIVED_DATE}}에 도착하였음을 확인드립니다.\n통관 신청 일정을 안내해 주시면 감사하겠습니다.`,
    variables: ["PRODUCT_NAME", "BL_NUMBER", "RECEIVED_DATE"],
  },
  // --- CUSTOMS ---
  {
    id: "TPL-CUSTOMS-01",
    name: "통관 요청 (관세법인)",
    language: "ko",
    category: "customs",
    to: "정운관세법인 / 원스탑관세법인 담당자",
    subject: "[통관요청] {{PRODUCT_NAME}} B/L {{BL_NUMBER}} 수입통관 의뢰",
    body: `안녕하세요.\n{{PRODUCT_NAME}}(B/L: {{BL_NUMBER}}, 입항예정일: {{ETA}}) 수입통관을 의뢰드립니다.\n필요 서류 목록 및 예상 통관 일정을 회신해 주시기 바랍니다.`,
    variables: ["PRODUCT_NAME", "BL_NUMBER", "ETA"],
  },
  {
    id: "TPL-CUSTOMS-02",
    name: "통관 완료 통보 (판매처)",
    language: "ko",
    category: "customs",
    to: "판매처 담당자",
    subject: "[통관완료] {{PRODUCT_NAME}} 통관 완료 안내",
    body: `안녕하세요, 아스트로스입니다.\n{{PRODUCT_NAME}}(B/L: {{BL_NUMBER}}) 수입통관이 {{CUSTOMS_DATE}}에 완료되었습니다.\n출고 일정은 별도로 안내드리겠습니다.`,
    variables: ["PRODUCT_NAME", "BL_NUMBER", "CUSTOMS_DATE"],
  },
  // --- ALERT ---
  {
    id: "TPL-ALERT-01",
    name: "ETA 변경 통보",
    language: "ko",
    category: "alert",
    to: "관련 담당자 (삼현INT, 관세법인, 판매처)",
    subject: "[ETA변경] {{PRODUCT_NAME}} {{BL_NUMBER}} 입항일 변경 안내",
    body: `안녕하세요.\n{{PRODUCT_NAME}}(B/L: {{BL_NUMBER}}) 입항 예정일이 변경되었음을 안내드립니다.\n변경 전: {{OLD_ETA}} → 변경 후: {{NEW_ETA}}. 일정 재조정 부탁드립니다.`,
    variables: ["PRODUCT_NAME", "BL_NUMBER", "OLD_ETA", "NEW_ETA"],
  },
  {
    id: "TPL-ALERT-02",
    name: "입항 사전 통보",
    language: "ko",
    category: "alert",
    to: "삼현INT, 관세법인 담당자",
    subject: "[입항예정] {{PRODUCT_NAME}} {{BL_NUMBER}} 입항 사전 통보",
    body: `안녕하세요.\n{{PRODUCT_NAME}}(B/L: {{BL_NUMBER}}) 선박이 {{ETA}} 입항 예정임을 사전 안내드립니다.\n통관 및 창고 수령 준비를 부탁드립니다.`,
    variables: ["PRODUCT_NAME", "BL_NUMBER", "ETA"],
  },
  // --- DELIVERY ---
  {
    id: "TPL-DELIVERY-01",
    name: "출고 요청 (창고)",
    language: "ko",
    category: "delivery",
    to: "창고 담당자",
    subject: "[출고요청] {{PRODUCT_NAME}} {{QUANTITY}}kg 출고 요청",
    body: `안녕하세요, 아스트로스입니다.\n{{PRODUCT_NAME}} {{QUANTITY}}kg 출고를 {{DELIVERY_DATE}}에 요청드립니다.\n출고처: {{DESTINATION}}, 담당자 확인 후 출고 승인 부탁드립니다.`,
    variables: ["PRODUCT_NAME", "QUANTITY", "DELIVERY_DATE", "DESTINATION"],
  },
  {
    id: "TPL-DELIVERY-02",
    name: "출고 완료 통보 (판매처)",
    language: "ko",
    category: "delivery",
    to: "판매처 담당자",
    subject: "[출고완료] {{PRODUCT_NAME}} {{QUANTITY}}kg 출고 완료 안내",
    body: `안녕하세요, 아스트로스입니다.\n{{PRODUCT_NAME}} {{QUANTITY}}kg이 {{DELIVERY_DATE}} 출고 완료되었습니다.\n수령 확인 후 이상 있으시면 연락 부탁드립니다.`,
    variables: ["PRODUCT_NAME", "QUANTITY", "DELIVERY_DATE"],
  },
  // --- SCHEDULE ---
  {
    id: "TPL-SCHEDULE-01",
    name: "선적 스케줄 확인 (BRF)",
    language: "en",
    category: "schedule",
    to: "BRF Export Manager",
    subject: "Shipping Schedule Confirmation - {{PRODUCT_NAME}} / {{CONTRACT_NO}}",
    body: `Dear {{RECIPIENT_NAME}},\nPlease confirm the shipping schedule for {{PRODUCT_NAME}} (Contract No. {{CONTRACT_NO}}): ETD {{ETD}}, ETA {{ETA}}, Vessel {{VESSEL_NAME}}.\nKindly advise if there are any changes at your earliest convenience.`,
    variables: ["PRODUCT_NAME", "CONTRACT_NO", "RECIPIENT_NAME", "ETD", "ETA", "VESSEL_NAME"],
  },
];

export function listTemplates(category?: string): EmailTemplate[] {
  if (!category) return [...EMAIL_TEMPLATES];
  return EMAIL_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplate(id: string): EmailTemplate | null {
  return EMAIL_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function renderTemplate(
  id: string,
  data: Record<string, string>
): { subject: string; body: string } | null {
  const tpl = getTemplate(id);
  if (!tpl) return null;

  const substitute = (text: string): string =>
    text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) =>
      key in data ? data[key] : match
    );

  return {
    subject: substitute(tpl.subject),
    body: substitute(tpl.body),
  };
}

async function handleListEmailTemplates(params: Record<string, unknown>) {
  try {
    const templates = listTemplates(params.category as string | undefined);
    return formatResponse({ count: templates.length, templates });
  } catch (error) {
    return handleToolError(error);
  }
}

async function handleGetEmailTemplate(params: Record<string, unknown>) {
  try {
    const tpl = getTemplate(params.id as string);
    if (!tpl) return formatResponse({ found: false, message: `템플릿 '${params.id}'을(를) 찾을 수 없습니다.` });
    return formatResponse({ found: true, template: tpl });
  } catch (error) {
    return handleToolError(error);
  }
}

async function handleRenderEmail(params: Record<string, unknown>) {
  try {
    const result = renderTemplate(params.id as string, params.data as Record<string, string>);
    if (!result) return formatResponse({ found: false, message: `템플릿 '${params.id}'을(를) 찾을 수 없습니다.` });
    return formatResponse({ found: true, ...result });
  } catch (error) {
    return handleToolError(error);
  }
}

export function registerEmailTemplateTools(server: McpServer): void {
  server.tool(
    "ecount_email_list_email_templates",
    "이메일 템플릿 목록을 조회합니다. 카테고리(shipping/contract/docs/customs/alert/delivery/schedule)로 필터링 가능합니다.",
    { category: z.enum(["shipping", "contract", "docs", "customs", "alert", "delivery", "schedule"]).optional() },
    { readOnlyHint: true },
    handleListEmailTemplates,
  );

  server.tool(
    "ecount_email_get_email_template",
    "이메일 템플릿 ID로 템플릿 상세 정보를 조회합니다. (예: TPL-SHIP-01, TPL-CONTRACT-01)",
    { id: z.string().describe("예: TPL-SHIP-01") },
    { readOnlyHint: true },
    handleGetEmailTemplate,
  );

  server.tool(
    "ecount_email_render_email",
    "이메일 템플릿에 변수를 치환하여 완성된 제목과 본문을 반환합니다. variables 필드의 변수명을 data에 전달하세요.",
    { id: z.string().describe("예: TPL-SHIP-01"), data: z.record(z.string(), z.string()).describe("치환할 변수 값 (예: {BL_NUMBER: 'MAEU123'})") },
    { readOnlyHint: true },
    handleRenderEmail,
  );
}
