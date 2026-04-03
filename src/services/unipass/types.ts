/**
 * UNI-PASS API type definitions
 *
 * Covers all major UNI-PASS Open API endpoints:
 * HS code, tariff, cargo tracking, import declarations, customs codes, etc.
 */

// ---------------------------------------------------------------------------
// Common response envelope
// ---------------------------------------------------------------------------

export interface UnipassResponseHeader {
  /** Result code: "0" = success, non-zero = error */
  resultCode: string;
  /** Human-readable result message (Korean) */
  resultMessage: string;
}

export interface UnipassResponse<T> {
  header: UnipassResponseHeader;
  /** Total result count (tCnt) */
  totalCount: number;
  /** Result items -- may be a single object or array depending on count */
  items: T[];
}

// ---------------------------------------------------------------------------
// HS Code Search (품목분류 조회)
// ---------------------------------------------------------------------------

export interface HsCodeSearchItem {
  /** HS code (10-digit) */
  hsSgn: string;
  /** HS code description (Korean) */
  hsSgnNm: string;
  /** Unit (수량단위) */
  qtyUtCd: string;
  /** Unit description */
  qtyUtNm: string;
  /** Tariff rate (%) */
  bscTrfRt: string;
  /** Effective start date */
  enfcDt: string;
}

// ---------------------------------------------------------------------------
// Tariff Rate (세율 조회)
// ---------------------------------------------------------------------------

export interface TariffRateItem {
  /** HS code */
  hsSgn: string;
  /** Tariff type code */
  trfTpCd: string;
  /** Tariff type description */
  trfTpNm: string;
  /** Tariff rate (%) */
  trfRt: string;
  /** Currency code */
  crryCd: string;
  /** Effective start date */
  enfcStrtDt: string;
  /** Effective end date */
  enfcEndDt: string;
}

// ---------------------------------------------------------------------------
// Cargo Tracking (화물 진행정보 조회)
// ---------------------------------------------------------------------------

export interface CargoTrackingItem {
  /** Processing stage code */
  prcsSttsCd: string;
  /** Processing stage description */
  prcsSttsNm: string;
  /** Processing date-time (YYYYMMDDHHMMSS) */
  prcsDttm: string;
  /** B/L number */
  blNo: string;
  /** Master B/L number */
  mblNo: string;
  /** House B/L number */
  hblNo: string;
  /** Customs office code */
  csclOfcCd: string;
  /** Customs office name */
  csclOfcNm: string;
}

// ---------------------------------------------------------------------------
// Arrival Report (입항적하목록 조회)
// ---------------------------------------------------------------------------

export interface ArrivalReportItem {
  /** B/L number */
  blNo: string;
  /** Master B/L number */
  mblNo: string;
  /** House B/L number */
  hblNo: string;
  /** Vessel/aircraft name */
  vzclNm: string;
  /** Voyage number */
  vydfNo: string;
  /** Loading port code */
  ldprCd: string;
  /** Loading port name */
  ldprNm: string;
  /** Discharge port code */
  dsprCd: string;
  /** Discharge port name */
  dsprNm: string;
  /** Total package count */
  ttwg: string;
  /** Weight unit */
  wghtUtCd: string;
  /** Arrival date */
  etprDt: string;
}

// ---------------------------------------------------------------------------
// Container (컨테이너 조회)
// ---------------------------------------------------------------------------

export interface ContainerItem {
  /** Container number */
  cntrNo: string;
  /** Container seal number */
  cntrSlNo: string;
  /** Container type code */
  cntrTpCd: string;
  /** Container size */
  cntrSz: string;
  /** Container weight */
  cntrWght: string;
  /** Processing status code */
  prcsSttsCd: string;
  /** Processing status description */
  prcsSttsNm: string;
  /** Processing date-time */
  prcsDttm: string;
}

// ---------------------------------------------------------------------------
// Import Declaration (수입신고 조회)
// ---------------------------------------------------------------------------

export interface ImportDeclarationItem {
  /** Declaration number */
  dclrNo: string;
  /** Declaration date */
  dclrDt: string;
  /** Declaration status code */
  dclrSttsCd: string;
  /** Declaration status description */
  dclrSttsNm: string;
  /** HS code */
  hsSgn: string;
  /** Product name */
  prnm: string;
  /** Quantity */
  qty: string;
  /** Unit price */
  untpc: string;
  /** Total declared price */
  dclrPr: string;
  /** Currency code */
  crryCd: string;
  /** Weight (kg) */
  wght: string;
  /** Customs office code */
  csclOfcCd: string;
  /** Import/export type (I: import, E: export) */
  iePrtTpCd: string;
  /** Declarant customs broker code */
  dclrntCstmBrkrCd: string;
}

// ---------------------------------------------------------------------------
// Inspection (검사/검역 조회)
// ---------------------------------------------------------------------------

export interface InspectionItem {
  /** Declaration number */
  dclrNo: string;
  /** Inspection type code */
  xmnTpCd: string;
  /** Inspection type description */
  xmnTpNm: string;
  /** Inspection result code */
  xmnRsltCd: string;
  /** Inspection result description */
  xmnRsltNm: string;
  /** Inspection date */
  xmnDt: string;
  /** Inspector organization */
  xmnOrgnNm: string;
}

// ---------------------------------------------------------------------------
// Customs Code (세관부호 조회)
// ---------------------------------------------------------------------------

export interface CustomsCodeItem {
  /** Customs office code */
  csclOfcCd: string;
  /** Customs office name */
  csclOfcNm: string;
  /** Address */
  addr: string;
  /** Phone number */
  telNo: string;
  /** Region code */
  rgnCd: string;
}

// ---------------------------------------------------------------------------
// Customs Broker (관세사 조회)
// ---------------------------------------------------------------------------

export interface CustomsBrokerItem {
  /** Customs broker code */
  cstmBrkrCd: string;
  /** Customs broker name */
  cstmBrkrNm: string;
  /** Company name */
  cmpnNm: string;
  /** Address */
  addr: string;
  /** Phone number */
  telNo: string;
  /** Registration number */
  rgstNo: string;
}

// ---------------------------------------------------------------------------
// Animal/Plant Quarantine Company (동식물검역 업체 조회)
// ---------------------------------------------------------------------------

export interface AnimalPlantCompanyItem {
  /** Company code */
  cmpnCd: string;
  /** Company name */
  cmpnNm: string;
  /** Business registration number */
  bzrgNo: string;
  /** Representative name */
  rprsTvNm: string;
  /** Address */
  addr: string;
  /** Phone number */
  telNo: string;
  /** Certification type */
  certTpNm: string;
  /** Certification valid date */
  certVldDt: string;
}

// ---------------------------------------------------------------------------
// Bonded Area Period (보세구역 장치기간 조회)
// ---------------------------------------------------------------------------

export interface BondedAreaPeriodItem {
  /** Bonded area code */
  bndAreaCd: string;
  /** Bonded area name */
  bndAreaNm: string;
  /** Storage start date */
  strgStrtDt: string;
  /** Storage end date */
  strgEndDt: string;
  /** Extended storage end date */
  extnStrgEndDt: string;
  /** B/L number */
  blNo: string;
  /** Container number */
  cntrNo: string;
  /** Cargo weight */
  crgoWght: string;
}

// ---------------------------------------------------------------------------
// Tax Payment (세금납부 조회)
// ---------------------------------------------------------------------------

export interface TaxPaymentItem {
  /** Declaration number */
  dclrNo: string;
  /** Tax type code */
  txTpCd: string;
  /** Tax type description */
  txTpNm: string;
  /** Tax amount */
  txAmt: string;
  /** Payment date */
  pymntDt: string;
  /** Payment status code */
  pymntSttsCd: string;
  /** Payment status description */
  pymntSttsNm: string;
  /** Due date */
  dueDt: string;
}

// ---------------------------------------------------------------------------
// Customs Exchange Rate (관세환율 조회)
// ---------------------------------------------------------------------------

export interface CustomsExchangeRateItem {
  /** Currency code */
  crryCd: string;
  /** Currency name */
  crryNm: string;
  /** Exchange rate (KRW) */
  xchr: string;
  /** Application start date */
  aplcBgnDt: string;
  /** Application end date */
  aplcEndDt: string;
  /** Rate type code */
  rtTpCd: string;
}
