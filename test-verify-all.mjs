#!/usr/bin/env node
/**
 * ECOUNT API 전체 검증 스크립트
 * - 샌드박스(sboapi)에서 테스트 인증키로 모든 API 호출
 * - ECOUNT 자동검증 시스템에서 "검증" 상태로 전환하기 위함
 *
 * 사용법: node test-verify-all.mjs
 */

import { readFileSync } from 'fs';

// Parse .env manually
const envFile = readFileSync(new URL('.env', import.meta.url), 'utf-8');
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.substring(0, idx).trim();
  const val = trimmed.substring(idx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

// CLI: node test-verify-all.mjs [prod|test]
const MODE = process.argv[2] || 'prod';
const isProd = MODE === 'prod';

const COM_CODE = process.env.ECOUNT_COM_CODE;
const USER_ID = isProd ? process.env.ECOUNT_USER_ID_PROD : process.env.ECOUNT_USER_ID_TEST;
const API_CERT_KEY = isProd ? process.env.ECOUNT_API_CERT_KEY_PROD : process.env.ECOUNT_API_CERT_KEY_TEST;
const ZONE = process.env.ECOUNT_ZONE || 'AA';
const LAN_TYPE = process.env.ECOUNT_LAN_TYPE || 'ko-KR';

const HOST_PREFIX = isProd ? 'oapi' : 'sboapi';
const BASE = `https://${HOST_PREFIX}${ZONE}.ecount.com`;
const V2 = `${BASE}/OAPI/V2`;

let SESSION_ID = null;
const results = [];
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

// ── Helpers ──
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

function record(name, endpoint, result) {
  const ok = result.status === 200 &&
    (result.data?.Status === '200' || result.data?.Status === 200 ||
     result.data?.Data?.SuccessCnt !== undefined ||
     result.data?.Data?.Result !== undefined ||
     result.data?.Data?.TotalCnt !== undefined);
  results.push({ name, endpoint, httpStatus: result.status, apiStatus: result.data?.Status, ok });
  const icon = ok ? '✅' : '❌';
  const errMsg = !ok && result.data?.Error ? ` [${result.data.Error.Code}: ${result.data.Error.Message}]` : '';
  const errMsg2 = !ok && result.data?.Errors?.[0] ? ` [${result.data.Errors[0].Code}: ${result.data.Errors[0].Message}]` : '';
  console.log(`  ${icon} ${name} (HTTP ${result.status}, Status ${result.data?.Status || 'N/A'})${errMsg}${errMsg2}`);
  return ok;
}

// ── 1. Zone ──
async function testZone() {
  console.log('\n═══ 1. Zone API ═══');
  const r = await post(`${BASE}/OAPI/V2/Zone`, { COM_CODE });
  record('Zone 조회', 'Zone', r);
}

// ── 2. Login ──
async function testLogin() {
  console.log('\n═══ 2. Login API ═══');
  const r = await post(`${V2}/OAPILogin`, {
    COM_CODE, USER_ID, API_CERT_KEY, LAN_TYPE, ZONE,
  });
  if (r.data?.Data?.Datas?.SESSION_ID) {
    SESSION_ID = r.data.Data.Datas.SESSION_ID;
    console.log(`  ✅ 로그인 성공 (Session: ${SESSION_ID.substring(0, 8)}...)`);
    results.push({ name: '로그인', endpoint: 'OAPILogin/Login', httpStatus: 200, apiStatus: '200', ok: true });
  } else {
    console.log(`  ❌ 로그인 실패:`, JSON.stringify(r.data, null, 2));
    results.push({ name: '로그인', endpoint: 'OAPILogin/Login', httpStatus: r.status, apiStatus: r.data?.Status, ok: false });
    throw new Error('로그인 실패 - 검증 중단');
  }
}

function url(endpoint) { return `${V2}/${endpoint}?SESSION_ID=${encodeURIComponent(SESSION_ID)}`; }
function urlV3(path) { return `${BASE}${path}?session_Id=${encodeURIComponent(SESSION_ID)}`; }

// ── 3. 기초정보 (거래처/품목) ──
async function testMasterData() {
  console.log('\n═══ 3. 기초정보 API ═══');

  // 3-1. 거래처 등록 (Save)
  const custSave = await post(url('AccountBasic/SaveBasicCust'), {
    CustList: [{
      BulkDatas: {
        BUSINESS_NO: '99999',
        CUST_NAME: 'API검증테스트거래처',
        BOSS_NAME: '테스트',
        UPTAE: '',
        JONGMOK: '',
        TEL: '',
        EMAIL: '',
        GUBUN: '',
        REMARKS: 'API 자동검증',
      }
    }]
  });
  record('거래처 등록 (SaveBasicCust)', 'AccountBasic/SaveBasicCust', custSave);
  await sleep(11000); // 저장 API: 1회/10초

  // 3-2. 거래처 조회 (View)
  const custView = await post(url('AccountBasic/ViewBasicCust'), {
    CUST_CD: '99999',
  });
  record('거래처 조회 (ViewBasicCust)', 'AccountBasic/ViewBasicCust', custView);
  await sleep(1500);

  // 3-3. 거래처 목록 (List)
  const custList = await post(url('AccountBasic/GetBasicCustList'), {
    CUST_CD: '',
  });
  record('거래처 목록 (GetBasicCustList)', 'AccountBasic/GetBasicCustList', custList);
  await sleep(1500);

  // 3-4. 품목 등록 (Save)
  const prodSave = await post(url('InventoryBasic/SaveBasicProduct'), {
    ProductList: [{
      BulkDatas: {
        PROD_CD: '99999',
        PROD_DES: 'API검증테스트품목',
        SIZE_FLAG: '',
        SIZE_DES: '',
        UNIT: 'EA',
        PROD_TYPE: '0',
        SET_FLAG: '',
        BAL_FLAG: '',
        WH_CD: '',
        IN_PRICE: '',
        OUT_PRICE: '',
        REMARKS: 'API 자동검증',
        TAX: '',
        CS_FLAG: '',
      }
    }]
  });
  record('품목 등록 (SaveBasicProduct)', 'InventoryBasic/SaveBasicProduct', prodSave);
  await sleep(11000);

  // 3-5. 품목 조회 (View)
  const prodView = await post(url('InventoryBasic/ViewBasicProduct'), {
    PROD_CD: '99999',
    PROD_TYPE: '0',
  });
  record('품목 조회 (ViewBasicProduct)', 'InventoryBasic/ViewBasicProduct', prodView);
  await sleep(1500);

  // 3-6. 품목 목록 (List)
  const prodList = await post(url('InventoryBasic/GetBasicProductsList'), {
    PROD_CD: '',
    PROD_TYPE: '0',
  });
  record('품목 목록 (GetBasicProductsList)', 'InventoryBasic/GetBasicProductsList', prodList);
  await sleep(1500);
}

// ── 4. 견적 ──
async function testQuotation() {
  console.log('\n═══ 4. 견적 API ═══');

  // 4-1. 견적 저장
  const save = await post(url('Quotation/SaveQuotation'), {
    QuotationList: [{
      BulkDatas: {
        IO_DATE: today,
        UPLOAD_SER_NO: '1',
        CUST: '',
        CUST_DES: '',
        EMP_CD: '',
        WH_CD: '',
        PROD_CD: '99999',
        PROD_DES: 'API검증테스트품목',
        QTY: '1',
        PRICE: '10000',
        REMARKS: 'API검증',
      }
    }]
  });
  record('견적 저장 (SaveQuotation)', 'Quotation/SaveQuotation', save);
  await sleep(11000);

  // 4-2. 견적 조회
  const list = await post(url('Quotation/GetQuotationList'), {
    PROD_CD: '',
    CUST_CD: '',
    ListParam: { PAGE_CURRENT: 1, PAGE_SIZE: 10, BASE_DATE_FROM: today, BASE_DATE_TO: today }
  });
  record('견적 목록 (GetQuotationList)', 'Quotation/GetQuotationList', list);
  await sleep(1500);
}

// ── 5. 수주(주문) ──
async function testSaleOrder() {
  console.log('\n═══ 5. 수주 API ═══');

  // 5-1. 수주 저장
  const save = await post(url('SaleOrder/SaveSaleOrder'), {
    SaleOrderList: [{
      BulkDatas: {
        IO_DATE: today,
        UPLOAD_SER_NO: '1',
        CUST: '',
        CUST_DES: '',
        EMP_CD: '',
        WH_CD: '',
        PROD_CD: '99999',
        PROD_DES: 'API검증테스트품목',
        QTY: '1',
        PRICE: '10000',
        REMARKS: 'API검증',
      }
    }]
  });
  record('수주 저장 (SaveSaleOrder)', 'SaleOrder/SaveSaleOrder', save);
  await sleep(11000);

  // 5-2. 수주 목록
  const list = await post(url('SaleOrder/GetSaleOrderList'), {
    PROD_CD: '',
    CUST_CD: '',
    ListParam: { PAGE_CURRENT: 1, PAGE_SIZE: 10, BASE_DATE_FROM: today, BASE_DATE_TO: today }
  });
  record('수주 목록 (GetSaleOrderList)', 'SaleOrder/GetSaleOrderList', list);
  await sleep(1500);
}

// ── 6. 판매 ──
async function testSale() {
  console.log('\n═══ 6. 판매 API ═══');

  // 6-1. 판매 저장
  const save = await post(url('Sale/SaveSale'), {
    SaleList: [{
      BulkDatas: {
        IO_DATE: today,
        UPLOAD_SER_NO: '1',
        CUST: '',
        CUST_DES: '',
        EMP_CD: '',
        WH_CD: '',
        PROD_CD: '99999',
        PROD_DES: 'API검증테스트품목',
        QTY: '1',
        PRICE: '10000',
        REMARKS: 'API검증',
      }
    }]
  });
  record('판매 저장 (SaveSale)', 'Sale/SaveSale', save);
  await sleep(11000);

  // 6-2. 판매 목록
  const list = await post(url('Sale/GetSaleList'), {
    PROD_CD: '',
    CUST_CD: '',
    ListParam: { PAGE_CURRENT: 1, PAGE_SIZE: 10, BASE_DATE_FROM: today, BASE_DATE_TO: today }
  });
  record('판매 목록 (GetSaleList)', 'Sale/GetSaleList', list);
  await sleep(1500);
}

// ── 7. 매입 ──
async function testPurchases() {
  console.log('\n═══ 7. 매입 API ═══');

  // 7-1. 발주 목록
  const orderList = await post(url('Purchases/GetPurchasesOrderList'), {
    PROD_CD: '',
    CUST_CD: '',
    ListParam: { PAGE_CURRENT: 1, PAGE_SIZE: 10, BASE_DATE_FROM: today, BASE_DATE_TO: today }
  });
  record('발주 목록 (GetPurchasesOrderList)', 'Purchases/GetPurchasesOrderList', orderList);
  await sleep(1500);

  // 7-2. 매입 저장
  const save = await post(url('Purchases/SavePurchases'), {
    PurchasesList: [{
      BulkDatas: {
        IO_DATE: today,
        UPLOAD_SER_NO: '1',
        CUST: '',
        CUST_DES: '',
        EMP_CD: '',
        WH_CD: '',
        PROD_CD: '99999',
        PROD_DES: 'API검증테스트품목',
        QTY: '1',
        PRICE: '10000',
        REMARKS: 'API검증',
      }
    }]
  });
  record('매입 저장 (SavePurchases)', 'Purchases/SavePurchases', save);
  await sleep(11000);

  // 7-3. 매입 목록
  const list = await post(url('Purchases/GetPurchasesList'), {
    PROD_CD: '',
    CUST_CD: '',
    ListParam: { PAGE_CURRENT: 1, PAGE_SIZE: 10, BASE_DATE_FROM: today, BASE_DATE_TO: today }
  });
  record('매입 목록 (GetPurchasesList)', 'Purchases/GetPurchasesList', list);
  await sleep(1500);
}

// ── 8. 재고 ──
async function testInventory() {
  console.log('\n═══ 8. 재고 API ═══');

  // 8-1. 재고현황 (단건)
  const view = await post(url('InventoryBalance/ViewInventoryBalanceStatus'), {
    PROD_CD: '99999',
    WH_CD: '',
    BASE_DATE: today,
  });
  record('재고현황 단건 (ViewInventoryBalanceStatus)', 'InventoryBalance/ViewInventoryBalanceStatus', view);
  await sleep(1500);

  // 8-2. 재고현황 (목록)
  const list = await post(url('InventoryBalance/GetListInventoryBalanceStatus'), {
    PROD_CD: '',
    WH_CD: '',
    BASE_DATE: today,
  });
  record('재고현황 목록 (GetListInventoryBalanceStatus)', 'InventoryBalance/GetListInventoryBalanceStatus', list);
  await sleep(1500);

  // 8-3. 재고현황 위치별 (단건)
  const locView = await post(url('InventoryBalance/ViewInventoryBalanceStatusByLocation'), {
    PROD_CD: '99999',
    WH_CD: '',
    BASE_DATE: today,
  });
  record('재고현황 위치별 단건 (ViewInventoryBalanceStatusByLocation)', 'InventoryBalance/ViewInventoryBalanceStatusByLocation', locView);
  await sleep(1500);

  // 8-4. 재고현황 위치별 (목록)
  const locList = await post(url('InventoryBalance/GetListInventoryBalanceStatusByLocation'), {
    PROD_CD: '',
    WH_CD: '',
    BASE_DATE: today,
  });
  record('재고현황 위치별 목록 (GetListInventoryBalanceStatusByLocation)', 'InventoryBalance/GetListInventoryBalanceStatusByLocation', locList);
  await sleep(1500);
}

// ── 9. 생산 ──
async function testProduction() {
  console.log('\n═══ 9. 생산 API ═══');

  // 9-1. 작업지시서 저장
  const jobSave = await post(url('JobOrder/SaveJobOrder'), {
    JobOrderList: [{
      BulkDatas: {
        IO_DATE: today,
        UPLOAD_SER_NO: '1',
        CUST: '',
        CUST_DES: '',
        PJT_CD: '',
        EMP_CD: '',
        PROD_CD: '99999',
        PROD_DES: 'API검증테스트품목',
        QTY: '1',
        WH_CD: '',
        REMARKS: 'API검증',
      }
    }]
  });
  record('작업지시서 저장 (SaveJobOrder)', 'JobOrder/SaveJobOrder', jobSave);
  await sleep(11000);

  // 9-2. 생산불출 저장
  const issuedSave = await post(url('GoodsIssued/SaveGoodsIssued'), {
    GoodsIssuedList: [{
      BulkDatas: {
        IO_DATE: today,
        UPLOAD_SER_NO: '1',
        EMP_CD: '',
        WH_CD_F: '',
        WH_CD_T: '',
        PJT_CD: '',
        PROD_CD: '99999',
        PROD_DES: 'API검증테스트품목',
        QTY: '1',
        REMARKS: 'API검증',
      }
    }]
  });
  record('생산불출 저장 (SaveGoodsIssued)', 'GoodsIssued/SaveGoodsIssued', issuedSave);
  await sleep(11000);

  // 9-3. 생산실적 저장
  const receiptSave = await post(url('GoodsReceipt/SaveGoodsReceipt'), {
    GoodsReceiptList: [{
      BulkDatas: {
        IO_DATE: today,
        UPLOAD_SER_NO: '1',
        EMP_CD: '',
        WH_CD_F: '',
        WH_CD_T: '',
        PJT_CD: '',
        PROD_CD: '99999',
        PROD_DES: 'API검증테스트품목',
        QTY: '1',
        REMARKS: 'API검증',
      }
    }]
  });
  record('생산실적 저장 (SaveGoodsReceipt)', 'GoodsReceipt/SaveGoodsReceipt', receiptSave);
  await sleep(11000);
}

// ── 10. 회계 ──
async function testAccounting() {
  console.log('\n═══ 10. 회계 API ═══');

  // 10-1. 매출전표 저장
  const save = await post(url('InvoiceAuto/SaveInvoiceAuto'), {
    InvoiceAutoList: [{
      BulkDatas: {
        TRX_DATE: today,
        ACCT_DOC_NO: '',
        TAX_GUBUN: '11',
        S_NO: '',
        CUST: '',
        CUST_DES: '',
        SUPPLY_AMT: '10000',
        VAT_AMT: '1000',
        ACCT_NO: '',
        CR_CODE: '',
        DR_CODE: '',
        REMARKS: 'API검증',
      }
    }]
  });
  record('회계전표 저장 (SaveInvoiceAuto)', 'InvoiceAuto/SaveInvoiceAuto', save);
  await sleep(11000);
}

// ── 11. 쇼핑몰 ──
async function testOpenMarket() {
  console.log('\n═══ 11. 쇼핑몰 API ═══');

  const save = await post(url('OpenMarket/SaveOpenMarketOrderNew'), {
    OPENMARKET_CD: '00001',
    ORDERS: [{
      GROUP_NO: `VER${Date.now()}`,
      ORDER_NO: `VER${Date.now()}01`,
      ORDER_DATE: new Date().toISOString().replace('T', ' ').substring(0, 23) + '.000',
      PAY_DATE: new Date().toISOString().replace('T', ' ').substring(0, 23) + '.000',
      PROD_CD: '99999',
      PROD_NM: 'API검증테스트품목',
      PROD_OPT: '',
      ORDER_QTY: 1,
      ORDER_AMT: 10000,
      ORDERER: '테스트',
      ORDERER_TEL: '010-0000-0000',
      RECEIVER: '테스트',
      RECEIVER_TEL: '010-0000-0000',
      RECEIVER_TEL2: '',
      ZIP_CODE: '',
      ADDR: '서울시 테스트',
      DELIVERY_REQUEST: '',
      SHIPPING_CHARGE_TYPE: 'P',
      SHIPPING_CHARGE: '0',
      MEMO: 'API검증',
      SHOP_NM: '검증테스트몰',
    }]
  });
  record('쇼핑몰 주문 (SaveOpenMarketOrderNew)', 'OpenMarket/SaveOpenMarketOrderNew', save);
  await sleep(11000);
}

// ── 12. 근태 ──
async function testTimeMgmt() {
  console.log('\n═══ 12. 근태 API ═══');

  const save = await post(url('TimeMgmt/SaveClockInOut'), {
    ClockInOutList: [{
      BulkDatas: {
        ATTDC_DTM_I: `${today.substring(0,4)}-${today.substring(4,6)}-${today.substring(6,8)} 09:00:00`,
        ATTDC_DTM_O: `${today.substring(0,4)}-${today.substring(4,6)}-${today.substring(6,8)} 18:00:00`,
        ATTDC_PLACE_I: '',
        ATTDC_PLACE_O: '',
        ATTDC_RSN_I: '',
        ATTDC_RSN_O: '',
        EMP_CD: '00001',
        HDOFF_TYPE_CD_I: 'N',
        HDOFF_TYPE_CD_O: 'N',
        OUT_WORK_TF: 'N',
      }
    }]
  });
  record('근태 저장 (SaveClockInOut)', 'TimeMgmt/SaveClockInOut', save);
  await sleep(11000);
}

// ── 13. 게시판 (V3 API) ──
async function testBoard() {
  console.log('\n═══ 13. 게시판 API (V3) ═══');

  const save = await post(urlV3('/ec5/api/app.oapi.v3/action/CreateOApiBoardAction'), {
    data: [{
      master: {
        bizz_sid: 'B_000000E072000',
        title: 'API 검증 테스트',
        body_ctt: 'API 자동검증 게시물입니다.',
        progress_status: '1',
      }
    }]
  });
  // V3 API has different response format
  const v3ok = save.status === 200 && (save.data?.Status === 200 || save.data?.Status === '200');
  results.push({ name: '게시판 등록 (CreateOApiBoardAction)', endpoint: 'V3/CreateOApiBoardAction', httpStatus: save.status, apiStatus: save.data?.Status, ok: v3ok });
  const icon = v3ok ? '✅' : '❌';
  const errMsg = !v3ok && save.data?.Error ? ` [${save.data.Error.Code}: ${save.data.Error.Message}]` : '';
  console.log(`  ${icon} 게시판 등록 (HTTP ${save.status}, Status ${save.data?.Status || 'N/A'})${errMsg}`);
  if (!v3ok) console.log(`     상세:`, JSON.stringify(save.data, null, 2).substring(0, 500));
}

// ── Main ──
async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  ECOUNT API 전체 검증 (Sandbox)             ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  COM_CODE: ${COM_CODE}`);
  console.log(`║  USER_ID:  ${USER_ID}`);
  console.log(`║  ZONE:     ${ZONE}`);
  console.log(`║  HOST:     ${BASE}`);
  console.log(`║  DATE:     ${today}`);
  console.log('╚══════════════════════════════════════════════╝');

  if (!COM_CODE || !USER_ID || !API_CERT_KEY) {
    console.error('❌ .env에 ECOUNT_COM_CODE, ECOUNT_USER_ID_TEST, ECOUNT_API_CERT_KEY_TEST 설정 필요');
    process.exit(1);
  }

  try {
    await testZone();
    await sleep(1500);

    await testLogin();
    await sleep(1500);

    await testMasterData();   // 거래처, 품목
    await testQuotation();    // 견적
    await testSaleOrder();    // 수주
    await testSale();         // 판매
    await testPurchases();    // 발주/매입
    await testInventory();    // 재고
    await testProduction();   // 생산 (작업지시서, 불출, 실적)
    await testAccounting();   // 회계
    await testOpenMarket();   // 쇼핑몰
    await testTimeMgmt();     // 근태
    await testBoard();        // 게시판

  } catch (e) {
    console.error(`\n🚨 검증 중단: ${e.message}`);
  }

  // ── Summary ──
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  검증 결과 요약                                         ║');
  console.log('╠══════════════════════════════════════════════════════════╣');

  const passed = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);

  console.log(`║  총 ${results.length}건: ✅ 성공 ${passed.length}건, ❌ 실패 ${failed.length}건`);
  console.log('╠══════════════════════════════════════════════════════════╣');

  if (failed.length > 0) {
    console.log('║  실패 API:');
    for (const f of failed) {
      console.log(`║    ❌ ${f.name} (HTTP ${f.httpStatus}, Status ${f.apiStatus})`);
    }
  }

  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  성공 API:');
  for (const p of passed) {
    console.log(`║    ✅ ${p.name}`);
  }
  console.log('╚══════════════════════════════════════════════════════════╝');

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n⏱️  소요 시간: ${Math.floor(elapsed/60)}분 ${elapsed%60}초`);
}

const startTime = Date.now();
main().catch(console.error);
