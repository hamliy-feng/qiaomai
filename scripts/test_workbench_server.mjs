import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { createWorkbenchServer } from '../server/workbench/server.mjs';
import { createProvider } from '../server/workbench/provider.mjs';

async function service(t, options = {}) {
  const server = createWorkbenchServer({ provider: { recognize: async () => ({ text: '测试原文', rawText: '测试原文', notes: [] }), translate: async ({ text }) => ({ text: '测试转译：' + text }) }, allowedOrigins: ['https://xn--8sqt71j.wiki'], ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const request = (path, options = {}) => fetch(base + path, options);
  const session = async () => (await (await request('/sessions', { method: 'POST' })).json()).sessionToken;
  const translation = (token, text = '校订原文') => request('/translation-jobs', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ text, target: 'modern-zh' }) });
  return { request, session, translation };
}
test('a service without a provider reports unavailable rather than a sample result', async t => {
  const { request } = await service(t, { provider: null });
  assert.equal((await request('/sessions', { method: 'POST' })).status, 503);
  assert.equal((await (await request('/health')).json()).configured, false);
});
test('translation is scoped to a temporary session and uses the supplied text', async t => {
  const { request, session, translation } = await service(t);
  const token = await session(), other = await session();
  const created = await translation(token); assert.equal(created.status, 202);
  const { jobId } = await created.json();
  const result = await (await request('/translation-jobs/' + jobId, { headers: { Authorization: 'Bearer ' + token } })).json();
  assert.equal(result.status, 'completed'); assert.equal(result.result.text, '测试转译：校订原文');
  assert.equal((await request('/translation-jobs/' + jobId, { headers: { Authorization: 'Bearer ' + other } })).status, 404);
  assert.equal((await request('/jobs/' + jobId + '/cancel', { method: 'POST', headers: { Authorization: 'Bearer ' + other } })).status, 404);
  assert.equal((await request('/translation-jobs/' + jobId)).status, 401);
});
test('upload validates the file signature and forwards the original bytes and direction', async t => {
  let received;
  const { request, session } = await service(t, { provider: { recognize: async payload => { received = payload; return { text: '测试识别' }; } } });
  const token = await session(), png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDLsAAAAASUVORK5CYII=', 'base64');
  const form = new FormData(); form.append('file', new File([png], 'letter.png', { type: 'image/png' })); form.append('rotation', '90');
  assert.equal((await request('/recognition-jobs', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form })).status, 202);
  assert.ok(received.bytes.equals(png)); assert.equal(received.rotation, 90);
  const bad = new FormData(); bad.append('file', new File(['not-an-image'], 'fake.png', { type: 'image/png' }));
  assert.equal((await request('/recognition-jobs', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: bad })).status, 415);
});
test('cancelled work stays cancelled even if a provider returns late', async t => {
  let finish;
  const { request, session, translation } = await service(t, { provider: { translate: () => new Promise(resolve => { finish = resolve; }) } });
  const token = await session(), headers = { Authorization: 'Bearer ' + token };
  const { jobId } = await (await translation(token)).json();
  assert.equal((await request('/jobs/' + jobId + '/cancel', { method: 'POST', headers })).status, 200);
  finish({ text: '旧任务晚返回' });
  const result = await (await request('/translation-jobs/' + jobId, { headers })).json();
  assert.equal(result.status, 'cancelled'); assert.equal(result.result, undefined);
});
test('unknown origins and requests beyond the daily cap are rejected', async t => {
  const { request, session, translation } = await service(t, { dailyLimit: 1 });
  assert.equal((await request('/sessions', { method: 'POST', headers: { Origin: 'https://other.example.test' } })).status, 403);
  const token = await session(); assert.equal((await translation(token)).status, 202); assert.equal((await translation(token)).status, 429);
});
test('provider credentials stay in the server request and truncated output is rejected', async () => {
  let captured;
  const provider = createProvider({ baseURL: 'https://api.example.test/v1', apiKey: 'server-only-test-secret', recognitionModel: 'vision', translationModel: 'text' }, async (url, options) => { captured = { url, options }; return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '释读正文' } }] }) }; });
  const output = await provider.translate({ text: '批文' }, new AbortController().signal);
  assert.equal(captured.options.headers.Authorization, 'Bearer server-only-test-secret'); assert.deepEqual(output, { text: '释读正文' });
  assert.ok(!JSON.stringify(output).includes('secret'));
  const truncated = createProvider({ baseURL: 'https://api.example.test/v1', apiKey: 'server-only-test-secret', recognitionModel: 'vision', translationModel: 'text' }, async () => ({ ok: true, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: '不完整' } }] }) }));
  await assert.rejects(truncated.translate({ text: '批文' }, new AbortController().signal), /截断/);
});
