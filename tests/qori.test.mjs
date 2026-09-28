import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
// These standalone modules do not require the Next.js runtime.
const load = async path => import(`data:text/javascript;base64,${Buffer.from(await readFile(new URL(path, import.meta.url))).toString('base64')}`);
const { createQoriReader } = await load('../src/components/qori/qoriReadClient.js');
const memory = await load('../src/components/qori/qoriMemory.js');
const address = '0x' + 'a'.repeat(40);
const other = '0x' + 'b'.repeat(40);
const wallet = { request: async () => [address] };
function setup() {
  const config = { fail: false, balance: 1n, wrongFirst: false, failFirst: false, burnFail: false };
  const seen = [];
  const fail = () => { if (config.fail) throw new Error('offline'); };
  const reader = createQoriReader({
    rpcUrls: ['first', 'second'], chainId: 14,
    createBaseCtx: () => ({ cubeBalance: '-', energonHeight: 'UNKNOWN', burnState: 'UNKNOWN' }),
    createProvider: url => ({
      send: async method => { seen.push([url, method]); fail(); if (config.failFirst && url === 'first') throw new Error('offline'); return config.wrongFirst && url === 'first' ? '0x1' : '0xe'; },
      getBlock: async () => ({ number: 123, timestamp: 1000 }), destroy() {},
    }),
    createCube: () => ({ controller: async () => 'controller', balanceOf: async () => { fail(); return config.balance; } }),
    createController: () => ({ energonHeight: async () => 5n, secondsUntilNextEnergonBlock: async () => 0n,
      burnPoolRemaining: async () => { if (config.burnFail) throw new Error('burn unavailable'); return 25n; },
      lastHalvingTime: async () => 500n, halvingInterval: async () => 1000n }),
    formatBurn: v => `${v} EON`, formatCountdown: v => `${v}s`, formatDate: v => `${v}`,
  });
  return { reader, config, seen };
}
test('landing mode never touches a wallet or RPC', async () => {
  const { reader, seen } = setup();
  const state = await reader({ landingMode: true, wallet: { request() { throw new Error('wallet must not be accessed'); } } });
  assert.equal(state.guardianState, 'VISITOR'); assert.equal(seen.length, 0);
});
test('fails over on an unavailable or wrong-chain RPC', async () => {
  for (const key of ['wrongFirst', 'failFirst']) {
    const { reader, config, seen } = setup(); config[key] = true;
    const state = await reader({ wallet });
    assert.equal(state.guardianState, 'COHERENT'); assert.equal(state.readStatus, 'FRESH');
    assert.equal(state.blockNumber, 123); assert.equal(seen.length, 2);
  }
});
test('outage preserves known readings but never reports verified zero cubes', async () => {
  const { reader, config } = setup();
  const initial = await reader({ wallet }); config.fail = true;
  const stale = await reader({ wallet });
  assert.equal(stale.guardianState, 'UNKNOWN'); assert.equal(stale.cubeBalance, '1');
  assert.equal(stale.energonHeight, initial.energonHeight); assert.equal(stale.readStatus, 'STALE');
  assert.equal(stale.observedAt, initial.observedAt);
});
test('verified balances produce the locked Guardian states', async () => {
  for (const [balance, state] of [[0n, 'NO KEY'], [1n, 'COHERENT'], [2n, 'FRACTURED']]) {
    const { reader, config } = setup(); config.balance = balance;
    assert.equal((await reader({ wallet })).guardianState, state);
  }
});
test('partial reads retain prior values with explicit partial status', async () => {
  const { reader, config } = setup(); await reader({ wallet }); config.burnFail = true;
  const state = await reader({ wallet });
  assert.equal(state.readStatus, 'PARTIAL'); assert.equal(state.burnState, '25 EON');
});
test('account switch cannot reuse a previous wallet balance', async () => {
  const { reader, config } = setup(); await reader({ wallet }); config.fail = true;
  const state = await reader({ wallet: { request: async () => [other] } });
  assert.equal(state.cubeBalance, '-'); assert.equal(state.guardianState, 'UNKNOWN');
});
test('wallet access failure is unverified rather than NO KEY', async () => {
  const { reader } = setup();
  const state = await reader({ wallet: { request: async () => { throw new Error('locked'); } } });
  assert.equal(state.guardianState, 'UNKNOWN'); assert.equal(state.readStatus, 'PARTIAL');
});
test('Guardian memory is account-scoped and does not import unscoped legacy data', () => {
  const entries = new Map([['energon_qori_guardian_memory_v1', '{"firstCoherent":1}']]);
  globalThis.window = { localStorage: { getItem: k => entries.get(k), setItem: (k,v) => entries.set(k,v) } };
  assert.deepEqual(memory.readGuardianMemory(address), {});
  memory.writeGuardianMemory(address, { firstCoherent: 123 });
  assert.deepEqual(memory.readGuardianMemory(address.toUpperCase().replace('0X','0x')), { firstCoherent: 123 });
  assert.deepEqual(memory.readGuardianMemory(other), {});
  assert.deepEqual(memory.readGuardianMemory(''), {});
  delete globalThis.window;
});
