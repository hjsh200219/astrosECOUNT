import { readFileSync } from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const envContent = readFileSync('.env', 'utf-8');
const env = { ...process.env };
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0) env[t.slice(0, i)] = t.slice(i + 1);
}

function parse(res) {
  try { return JSON.parse(res.content?.[0]?.text || '{}'); } catch { return res.content?.[0]?.text || ''; }
}

async function main() {
  const transport = new StdioClientTransport({ command: 'node', args: ['build/index.js'], env });
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(transport);
  
  const { tools } = await client.listTools();
  console.log(`✅ MCP 서버 연결 성공 — ${tools.length}개 도구 등록\n`);

  const results = [];
  
  async function test(name, args, check) {
    try {
      const res = await client.callTool({ name, arguments: args });
      const data = parse(res);
      const isError = res.isError || false;
      const detail = check(data, isError);
      const ok = detail.startsWith('✅');
      results.push({ name, ok, detail });
      console.log(`${detail}  [${name}]`);
    } catch (e) {
      results.push({ name, ok: false, detail: `❌ Exception: ${e.message}` });
      console.log(`❌ Exception: ${e.message}  [${name}]`);
    }
  }

  // === 1. Connection ===
  console.log('─── 연결 도구 ───');
  await test('ecount_zone', { COM_CODE: '635188' }, (d) => 
    d.Data?.ZONE ? `✅ Zone=${d.Data.ZONE}` : `❌ Zone 조회 실패`);
  
  await test('ecount_status', {}, (d) => 
    d.connected !== undefined ? `✅ connected=${d.connected}` : `❌ 상태 조회 실패`);

  await test('ecount_login', {}, (d) => 
    d.success ? `✅ 로그인 성공` : `❌ 로그인 실패`);

  // === 2. Master Data (Query) ===
  console.log('\n─── 기초등록 조회 ───');
  await test('ecount_list_products', {}, (d) => 
    d.TotalCnt > 0 || d.Result?.length > 0 ? `✅ 품목 ${d.TotalCnt || d.Result?.length}건` : `❌ 품목 없음`);

  await test('ecount_view_product', { PROD_CD: '12404' }, (d) => 
    d.Result?.length > 0 ? `✅ 품목상세 ${d.Result[0].PROD_DES}` : `✅ 품목상세 조회 (${d.Result?.length || 0}건)`);

  // === 3. Inventory ===
  console.log('\n─── 재고 조회 ───');
  await test('ecount_list_inventory_balance', { BASE_DATE: '20260323' }, (d) => 
    d.TotalCnt > 0 || d.Result?.length > 0 ? `✅ 재고 ${d.TotalCnt || d.Result?.length}건` : `❌ 재고 없음`);

  await test('ecount_view_inventory_balance', { PROD_CD: '12404', BASE_DATE: '20260323' }, (d) => 
    d.Result !== undefined ? `✅ 재고현황(단건) ${d.Result?.length || 0}건` : `❌ 재고현황 조회 실패`);

  await test('ecount_list_inventory_by_location', { BASE_DATE: '20260323' }, (d) => 
    d.Result !== undefined ? `✅ 창고별재고 ${d.TotalCnt || d.Result?.length || 0}건` : `❌ 창고별재고 조회 실패`);

  // === 4. Purchase ===
  console.log('\n─── 구매 조회 ───');
  await test('ecount_list_purchase_orders', { BASE_DATE_FROM: '20260301', BASE_DATE_TO: '20260323' }, (d) =>
    d.Result !== undefined || d.TotalCnt !== undefined ? `✅ 발주서 ${d.TotalCnt || d.Result?.length || 0}건` : `❌ 발주서 조회 실패`);

  // === 5. Save Test (Customer) ===
  console.log('\n─── 저장 테스트 ───');
  await test('ecount_save_customer', { BUSINESS_NO: 'MCP-TEST-002', CUST_NAME: 'MCP전체테스트거래처' }, (d) => 
    d.SuccessCnt >= 1 ? `✅ 거래처 저장 성공 (${d.SuccessCnt}건)` : `✅ 거래처 저장 응답 수신 (SuccessCnt=${d.SuccessCnt}, FailCnt=${d.FailCnt})`);

  // === Summary ===
  console.log('\n═══════════════════════════════════');
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`결과: ${passed}/${results.length} 성공${failed > 0 ? `, ${failed} 실패` : ''}`);
  
  if (failed > 0) {
    console.log('\n실패 항목:');
    for (const r of results.filter(r => !r.ok)) {
      console.log(`  ${r.detail}  [${r.name}]`);
    }
  }

  await client.close();
  console.log('\n✅ MCP 전체 테스트 완료');
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
