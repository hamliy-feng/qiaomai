import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { File } from 'node:buffer';

const source = fs.readFileSync(new URL('../frontend/assets/js/workbench-api.js', import.meta.url), 'utf8');
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
function adapter(fetcher, config = {}) {
  const window = { QM_REPO: {}, QM_WORKBENCH_CONFIG: { apiBase: 'https://api.example.test', pollInterval: 500, ...config } };
  vm.runInNewContext(source, { window, location: { href: 'https://xn--8sqt71j.wiki/research.html' }, fetch: fetcher, URL, FormData, File, DOMException, AbortController, setTimeout, clearTimeout });
  return window.QM_REPO.workbench;
}

test('missing or insecure service configuration never returns sample OCR', async () => {
  let called = false;
  for (const apiBase of ['', 'http://public.example.test']) {
    const api = adapter(async () => { called = true; }, { apiBase });
    await assert.rejects(api.translate('原文', new AbortController().signal), /暂不可用|HTTPS/);
  }
  assert.equal(called, false);
});

test('recognition sends the actual file and rotation and reads the completed job', async () => {
  const calls = [];
  const api = adapter(async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/sessions')) return response({ sessionToken: 'temporary-test-session' });
    if (options.method === 'POST') return response({ jobId: 'job/test' });
    return response({ status: 'completed', result: { text: '原文甲', rawText: '原文甲', notes: ['缺字用□'] } });
  });
  const file = new File(['actual-image-content'], '家书.png', { type: 'image/png' });
  const result = await api.recognize(file, 90, new AbortController().signal);
  assert.equal(result.text, '原文甲');
  assert.equal(calls[1].options.body.get('rotation'), '90');
  assert.equal(await calls[1].options.body.get('file').text(), 'actual-image-content');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer temporary-test-session');
  assert.ok(calls[2].url.endsWith('/recognition-jobs/job%2Ftest'));
  assert.ok(calls.every(x => x.options.credentials === 'omit'));
});

test('translation uses corrected text and reuses the temporary session', async () => {
  let sessions = 0, sent;
  const api = adapter(async (url, options) => {
    if (url.endsWith('/sessions')) { sessions++; return response({ sessionToken: 'temporary-test-session' }); }
    if (options.method === 'POST') { sent = JSON.parse(options.body); return response({ jobId: 'translate-1' }); }
    return response({ status: 'completed', result: { text: '现代释读' } });
  });
  for (const text of ['校订原文一', '校订原文二']) assert.equal((await api.translate(text, new AbortController().signal)).text, '现代释读');
  assert.equal(sessions, 1);
  assert.deepEqual(sent, { text: '校订原文二', target: 'modern-zh' });
});

test('cancellation stops polling and requests cancellation for that job', async () => {
  let cancelled = false, polls = 0;
  const controller = new AbortController();
  const api = adapter(async (url, options) => {
    if (url.endsWith('/sessions')) return response({ sessionToken: 'test-session' });
    if (url.endsWith('/cancel')) { cancelled = true; return response({ status: 'cancelled' }); }
    if (options.method === 'POST') return response({ jobId: 'to-cancel' });
    polls++; return response({ status: 'running' });
  });
  await assert.rejects(api.translate('原文', controller.signal, () => controller.abort()), { name: 'AbortError' });
  assert.equal(cancelled, true); assert.equal(polls, 1);
});

test('a failed, malformed or unknown job never becomes a successful result', async () => {
  for (const payload of [{ status: 'failed', error: { message: '服务额度不足' } }, { status: 'completed', result: {} }, { status: 'invented' }]) {
    const api = adapter(async (url, options) => url.endsWith('/sessions') ? response({ sessionToken: 'test-session' }) : options.method === 'POST' ? response({ jobId: 'bad' }) : response(payload));
    await assert.rejects(api.translate('原文', new AbortController().signal));
  }
});

test('aborting a first request during session setup does not poison the next one', async () => {
  let releaseSession, posted = 0;
  const api = adapter(async (url, options) => {
    if (url.endsWith('/sessions')) return new Promise(resolve => { releaseSession = () => resolve(response({ sessionToken: 'test-session' })); });
    if (options.method === 'POST') { posted++; return response({ jobId: 'next-job' }); }
    return response({ status: 'completed', result: { text: '本次结果' } });
  });
  const old = new AbortController(), current = new AbortController();
  const first = api.translate('旧任务', old.signal); old.abort();
  const next = api.translate('新任务', current.signal); releaseSession();
  await assert.rejects(first, { name: 'AbortError' });
  assert.equal((await next).text, '本次结果'); assert.equal(posted, 1);
});
